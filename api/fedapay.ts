/**
 * Client FedaPay — création de transaction et vérification des webhooks.
 *
 * ── Pourquoi pas le paquet officiel ──
 *
 * Le SDK `fedapay` a été téléchargé et LU avant d'écrire ce fichier : la vérification de
 * signature ci-dessous en reprend l'algorithme exact, pas une reconstitution de mémoire
 * (voir `WebhookSignature.verifyHeader`, fedapay@1.2.5). Ce qui est repris n'est pas
 * repris « à peu près » — un schéma de signature approximatif ne se voit pas, il s'ouvre.
 *
 * Ce qui ne l'est pas : la mécanique HTTP. Le SDK apporte axios et une configuration
 * globale mutable (`FedaPay.setApiKey`) pour trois appels REST, dans une fonction
 * serverless où chaque mégaoctet est payé à chaque démarrage à froid. Trois `fetch`
 * suffisent, et n'ont pas d'état partagé entre deux requêtes concurrentes.
 *
 * ── Ce que ce fichier ne fait jamais ──
 *
 * Il ne décide pas si un étudiant a payé. Il constate ce que l'opérateur affirme, et la
 * décision est prise ailleurs, après vérification du montant et de la devise. La
 * distinction compte : un webhook est une affirmation d'un tiers, pas une autorisation.
 */
import crypto from "crypto";

/** Environnement de l'opérateur. `sandbox` tant que rien n'est en production. */
export type EnvironnementFedapay = "sandbox" | "live";

export function environnementFedapay(): EnvironnementFedapay {
  return process.env.FEDAPAY_ENV === "live" ? "live" : "sandbox";
}

/**
 * Base de l'API selon l'environnement.
 *
 * Les deux URL viennent du SDK officiel (Requestor : `SANDBOX_BASE`, `PRODUCTION_BASE`),
 * de même que la version d'API `v1`.
 */
function baseApi(): string {
  return environnementFedapay() === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";
}

/**
 * Ce que valent les statuts de transaction de l'opérateur.
 *
 * Le SDK expose une liste `PAID_STATUS` de cinq valeurs :
 *
 *   approved · transferred · refunded · approved_partially_refunded · transferred_partially_refunded
 *
 * Elle répond à la question « de l'argent est-il arrivé un jour ? ». Ce n'est PAS la
 * question posée ici, qui est « cette personne a-t-elle droit à son attestation
 * maintenant ? ». Reprendre la liste telle quelle délivrerait une attestation à quelqu'un
 * intégralement remboursé. Le droit à l'attestation se limite donc à deux statuts.
 *
 * Les trois autres ne sont pas pour autant des échecs, et les confondre abîmerait le
 * tableau de bord : un remboursement est une décision commerciale, un échec est un
 * incident. `categorieStatut` les sépare pour que la ligne porte le bon mot.
 */
const STATUTS_PAYES = new Set(["approved", "transferred"]);
const STATUTS_REMBOURSES = new Set([
  "refunded", "approved_partially_refunded", "transferred_partially_refunded",
]);

export function transactionEstPayee(statut: unknown): boolean {
  return typeof statut === "string" && STATUTS_PAYES.has(statut);
}

/**
 * Statuts qui signifient vraiment que la transaction a échoué.
 *
 * La liste est FERMÉE, et c'est tout l'enjeu. La version précédente concluait à l'échec
 * par défaut — « tout ce qui n'est pas payé est raté » — et s'est trompée dès le premier
 * essai réel : l'opérateur émet un événement `transaction.created` portant le statut
 * `pending` À LA CRÉATION, c'est-à-dire avant même que l'étudiant ait saisi son numéro. Les
 * deux paiements de test se sont donc retrouvés marqués « échoué » alors que rien n'avait
 * échoué, et la page de retour aurait annoncé « le paiement n'a pas abouti » à quelqu'un
 * dont le paiement n'avait pas commencé. Qui lit cela paie une seconde fois.
 *
 * D'où la règle, la même que côté écran : on ne conclut JAMAIS à l'échec sur un statut
 * qu'on ne connaît pas. L'inconnu et l'attente se ressemblent trop pour qu'on les sépare
 * au jugé, et se tromper dans ce sens-là coûte de l'argent à l'étudiant.
 */
const STATUTS_ECHOUES = new Set(["declined", "failed", "expired"]);

/** Le mot à inscrire sur la ligne de paiement, d'après ce que l'opérateur affirme. */
export function categorieStatut(statut: unknown): "paye" | "rembourse" | "annule" | "echoue" | "en_attente" {
  if (transactionEstPayee(statut)) return "paye";
  if (typeof statut !== "string") return "en_attente";
  if (STATUTS_REMBOURSES.has(statut)) return "rembourse";
  if (statut === "canceled") return "annule";
  if (STATUTS_ECHOUES.has(statut)) return "echoue";
  // pending, created, et tout ce que l'opérateur ajoutera un jour : on attend.
  return "en_attente";
}

// ══════════════ Vérification de signature ══════════════

/**
 * Tolérance sur l'âge de l'horodatage, en secondes.
 *
 * Cinq minutes, comme le SDK (`Webhook.DEFAULT_TOLERANCE = 300`). C'est ce qui empêche
 * de rejouer indéfiniment une livraison interceptée : la signature reste valable, mais
 * l'horodatage qu'elle couvre a vieilli.
 */
const TOLERANCE_SECONDES = 300;

/** Nom du schéma dans l'en-tête. `s`, comme `WebhookSignature.EXPECTED_SCHEME`. */
const SCHEMA = "s";

type EnteteSignature = { horodatage: number; signatures: string[] };

/** `t=1699999999,s=ab12…` → horodatage et signatures. */
function lireEntete(entete: string): EnteteSignature {
  return entete.split(",").reduce<EnteteSignature>((acc, morceau) => {
    const [cle, valeur] = morceau.split("=");
    if (cle === "t") acc.horodatage = parseInt(valeur, 10);
    if (cle === SCHEMA && valeur) acc.signatures.push(valeur);
    return acc;
  }, { horodatage: -1, signatures: [] });
}

function calculerSignature(charge: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(charge, "utf8").digest("hex");
}

/** Comparaison à temps constant. Un `===` sur des chaînes fuit la position du premier écart. */
function memeSignature(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8"), bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export type VerdictSignature = { valide: true } | { valide: false; raison: string };

/**
 * Vérifie l'en-tête `X-FEDAPAY-SIGNATURE`.
 *
 * `corpsBrut` doit être le corps EXACT reçu, octet pour octet. Une charge re-sérialisée
 * depuis l'objet analysé ne redonne pas la même chaîne — ordre des clés, espaces,
 * échappement Unicode — et la signature ne correspondra jamais. C'est l'erreur classique
 * sur ce type d'intégration, et elle se manifeste par un « ça marche en test, ça échoue
 * en production » incompréhensible.
 */
export function verifierSignature(
  corpsBrut: string, entete: string | undefined, secret: string | undefined,
  maintenantSecondes = Math.floor(Date.now() / 1000),
): VerdictSignature {
  if (!secret) return { valide: false, raison: "FEDAPAY_WEBHOOK_SECRET absent du serveur" };
  if (!entete) return { valide: false, raison: "en-tête de signature absent" };

  const details = lireEntete(entete);
  if (details.horodatage === -1 || Number.isNaN(details.horodatage)) {
    return { valide: false, raison: "horodatage illisible dans l'en-tête" };
  }
  if (!details.signatures.length) {
    return { valide: false, raison: "aucune signature au schéma attendu" };
  }

  const attendue = calculerSignature(`${details.horodatage}.${corpsBrut}`, secret);
  if (!details.signatures.some(s => memeSignature(s, attendue))) {
    return { valide: false, raison: "signature non concordante" };
  }

  const age = maintenantSecondes - details.horodatage;
  if (age > TOLERANCE_SECONDES) {
    return { valide: false, raison: `horodatage trop ancien (${age} s)` };
  }
  // Un horodatage dans le futur au-delà de la tolérance signale une horloge déréglée d'un
  // côté ou de l'autre. On refuse plutôt que de deviner lequel.
  if (age < -TOLERANCE_SECONDES) {
    return { valide: false, raison: `horodatage dans le futur (${-age} s)` };
  }
  return { valide: true };
}

/**
 * Fabrique un en-tête de signature, pour les tests.
 *
 * Reprend `Webhook.generateTestHeaderString` du SDK. Sa raison d'être : prouver que notre
 * vérification accepte ce que le SDK officiel produit, et refuse tout le reste.
 */
export function entetePourTest(corps: string, secret: string, horodatage?: number): string {
  const t = horodatage ?? Math.floor(Date.now() / 1000);
  return `t=${t},${SCHEMA}=${calculerSignature(`${t}.${corps}`, secret)}`;
}

// ══════════════ Appels à l'API ══════════════

async function appel(chemin: string, corps: unknown): Promise<any> {
  const cle = process.env.FEDAPAY_SECRET_KEY;
  if (!cle) throw new Error("FEDAPAY_SECRET_KEY absente du serveur");
  const r = await fetch(`${baseApi()}${chemin}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cle}` },
    body: JSON.stringify(corps),
  });
  const texte = await r.text();
  if (!r.ok) {
    // Le corps d'erreur de l'opérateur est le seul renseignement utile ; l'avaler
    // laisserait « paiement impossible » sans cause. Il est tronqué : il peut contenir
    // l'écho de ce qu'on a envoyé.
    throw new Error(`FedaPay ${r.status} sur ${chemin} — ${texte.slice(0, 400)}`);
  }
  return texte ? JSON.parse(texte) : {};
}

export type Payeur = { nom: string; prenom?: string; email: string };

/**
 * Crée une transaction et renvoie l'adresse de la page de paiement.
 *
 * Le montant est fixé ICI, côté serveur, et jamais reçu du navigateur. C'est la seule
 * façon d'empêcher qu'une attestation à dix mille francs soit payée cent — et le webhook
 * revérifiera quand même le montant à l'arrivée, parce qu'une seule barrière n'en est
 * pas une.
 */
export async function creerTransaction(opts: {
  montant: number; description: string; reference: string;
  payeur: Payeur; retourUrl: string; metadonnees?: Record<string, string>;
}): Promise<{ transactionId: string; url: string }> {
  const cree = await appel("/transactions", {
    description: opts.description,
    amount: opts.montant,
    currency: { iso: "XOF" },
    callback_url: opts.retourUrl,
    // ⚠ `merchant_reference` DOIT être unique à chaque transaction : l'opérateur refuse
    // la création si la référence a déjà servi. Ce n'est pas une préférence de style,
    // c'est une contrainte de leur API, et elle ne se voit qu'au deuxième essai — celui
    // d'un étudiant qui a abandonné un paiement puis y revient. La référence porte donc
    // six octets aléatoires (voir son point de fabrication) ; la « simplifier » en
    // ATT-<étudiant>-<parcours> casserait toutes les reprises, en silence.
    merchant_reference: opts.reference,
    // Données de rapprochement, visibles dans le tableau de bord de l'opérateur.
    // Uniquement des identifiants internes : leur documentation demande expressément de
    // n'y mettre aucune donnée personnelle, et l'email a déjà sa place dans `customer`.
    ...(opts.metadonnees ? { custom_metadata: opts.metadonnees } : {}),
    customer: {
      firstname: opts.payeur.prenom || opts.payeur.nom,
      lastname: opts.payeur.nom,
      email: opts.payeur.email,
    },
  });

  const id = cree?.["v1/transaction"]?.id ?? cree?.transaction?.id ?? cree?.id;
  if (!id) throw new Error(`Transaction créée sans identifiant : ${JSON.stringify(cree).slice(0, 300)}`);

  const jeton = await appel(`/transactions/${id}/token`, {});
  const url = jeton?.url ?? jeton?.["v1/token"]?.url;
  if (!url) throw new Error(`Jeton sans adresse de paiement : ${JSON.stringify(jeton).slice(0, 300)}`);

  return { transactionId: String(id), url: String(url) };
}
