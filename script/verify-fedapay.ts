/**
 * Contrôle de la vérification de signature des webhooks FedaPay.
 *
 *   npx tsx script/verify-fedapay.ts
 *
 * Ce que ce script prouve : notre implémentation ACCEPTE exactement ce que produit le SDK
 * officiel, et REFUSE tout le reste. C'est le seul contrôle du dépôt dont l'échec
 * signifierait qu'un tiers peut déclarer un paiement à notre place.
 *
 * L'en-tête de référence est fabriqué par la même formule que
 * `Webhook.generateTestHeaderString` du paquet `fedapay` — `t=<horodatage>,s=<hmac>` sur
 * la chaîne `horodatage.corps`, HMAC-SHA256 en hexadécimal.
 */
import crypto from "crypto";
import { verifierSignature, entetePourTest, transactionEstPayee } from "../api/fedapay.js";

const SECRET = "wh_secret_de_test";
const CORPS = JSON.stringify({
  name: "transaction.approved",
  entity: { id: 42, status: "approved", amount: 10000, merchant_reference: "COOP-7-ABC" },
});
const T = 1_800_000_000;

let ko = 0;
const v = (nom: string, ok: boolean, detail = "") => {
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${nom}${ok ? "" : "  " + detail}`);
};

// ── L'en-tête produit comme le fait le SDK officiel ──
const entete = entetePourTest(CORPS, SECRET, T);
const attenduSdk = `t=${T},s=${crypto.createHmac("sha256", SECRET).update(`${T}.${CORPS}`, "utf8").digest("hex")}`;
v("l'en-tête produit est celui du SDK officiel", entete === attenduSdk, `${entete} ≠ ${attenduSdk}`);

const verdict = (e: string | undefined, secret: string | undefined = SECRET, corps = CORPS, maintenant = T + 10) =>
  verifierSignature(corps, e, secret, maintenant);

v("une signature valide est acceptée", verdict(entete).valide === true);

// ── Tout ce qui doit être refusé ──
const refus = (nom: string, r: ReturnType<typeof verifierSignature>) =>
  v(nom, r.valide === false, "accepté à tort");

refus("un corps modifié d'un seul caractère",
  verdict(entete, SECRET, CORPS.replace('"amount":10000', '"amount":10001')));
refus("un montant gonflé dans le corps",
  verdict(entete, SECRET, CORPS.replace("10000", "1")));
refus("une signature d'un octet différent",
  verdict(entete.slice(0, -1) + (entete.endsWith("a") ? "b" : "a")));
refus("un autre secret", verdict(entetePourTest(CORPS, "wh_autre_secret", T)));
refus("un en-tête absent", verdict(undefined));
refus("un en-tête vide", verdict(""));
refus("un en-tête sans horodatage", verdict(`s=${"0".repeat(64)}`));
refus("un en-tête sans signature", verdict(`t=${T}`));
refus("un schéma inconnu", verdict(`t=${T},v1=${"0".repeat(64)}`));
refus("un horodatage non numérique", verdict(`t=hier,s=${"0".repeat(64)}`));
// Appel direct : passer `undefined` à `verdict` retomberait sur sa valeur par défaut —
// en JavaScript, un paramètre par défaut s'applique à `undefined`, pas seulement à
// l'absence d'argument. Le premier jet de ce test l'a appris à ses dépens.
refus("un secret absent côté serveur", verifierSignature(CORPS, entete, undefined, T + 10));
refus("un secret vide côté serveur", verifierSignature(CORPS, entete, "", T + 10));

// ── La fenêtre de tolérance ──
v("acceptée à l'intérieur de la fenêtre (299 s)", verdict(entete, SECRET, CORPS, T + 299).valide === true);
refus("rejouée au-delà de la fenêtre (301 s)", verdict(entete, SECRET, CORPS, T + 301));
refus("horodatée dans un futur lointain (601 s)", verdict(entete, SECRET, CORPS, T - 601));

// ── Une signature valide mais pour un AUTRE horodatage ──
// Le cas subtil : l'attaquant rejoue un couple (horodatage, signature) cohérent mais
// périmé. C'est la tolérance qui l'arrête, pas la signature — elle, reste valable.
const vieux = entetePourTest(CORPS, SECRET, T - 3600);
refus("un couple horodatage/signature cohérent mais vieux d'une heure", verdict(vieux));

// ── Les statuts qui valent paiement ──
v("« approved » vaut paiement", transactionEstPayee("approved"));
v("« transferred » vaut paiement", transactionEstPayee("transferred"));
v("« pending » ne vaut pas paiement", !transactionEstPayee("pending"));
v("« declined » ne vaut pas paiement", !transactionEstPayee("declined"));
v("« canceled » ne vaut pas paiement", !transactionEstPayee("canceled"));
v("un statut absent ne vaut pas paiement", !transactionEstPayee(undefined));

console.log(ko === 0 ? "\nTOUT PASSE" : `\n${ko} ÉCHEC(S)`);
process.exit(ko ? 1 : 0);
