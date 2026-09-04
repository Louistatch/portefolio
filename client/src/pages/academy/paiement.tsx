import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { Loader2, ArrowRight, ArrowLeft, Check, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";
import { isStudentLoggedIn, studentFetch } from "@/lib/student";
import { programOf, type Program } from "@shared/programs";

/**
 * Règlement de l'attestation, avant et après.
 *
 * ── Pourquoi cette page existe ──
 *
 * Le règlement se demandait dans un `window.confirm`. Une boîte de dialogue du navigateur,
 * précédée de « www.louisfarm.com indique », pour réclamer dix mille francs au terme de
 * treize semaines de travail. C'est le contenant le plus faible qui soit au moment le plus
 * important du parcours : on ne peut ni y montrer ce qu'on achète, ni y inspirer confiance,
 * et sa laideur même suggère l'arnaque.
 *
 * ── Et surtout, il n'y avait rien APRÈS ──
 *
 * L'opérateur renvoyait l'étudiant sur le tableau de bord, qui ignorait le paramètre. On
 * revenait d'un paiement abouti sur un écran ordinaire, sans un mot de confirmation.
 *
 * Plus grave : le webhook encaisse mais NE DÉLIVRE PAS. Il marque la ligne « payé », et
 * c'est tout — l'attestation ne s'établit qu'en rappelant POST /api/academy/attestation.
 * Sans écran de retour pour le faire, l'argent arrivait et le document n'existait jamais.
 * Cette page ferme ce trou : au retour, elle attend la confirmation puis redemande
 * l'attestation elle-même.
 *
 * ── Le délai de confirmation, dit plutôt que caché ──
 *
 * Entre le paiement et le webhook il s'écoule quelques secondes, parfois davantage. Une
 * page qui afficherait « échec » pendant ce délai ferait payer deux fois. On interroge
 * donc l'état à intervalle régulier, on annonce l'attente pour ce qu'elle est, et l'on ne
 * conclut jamais à l'échec sur un silence.
 */

type Paiement = {
  reference: string; program_id: string; montant: number;
  devise: string; statut: string; paye_at: string | null;
};

/** Filet accentué et label, comme sur l'épreuve d'admission — même parcours, même registre. */
function Cadre({ accent, label, children }: {
  accent: string; label: string; children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8 py-10 sm:py-16">
      <div className="border-t-2 pt-6 max-w-2xl" style={{ borderColor: accent }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

const ACCENT_PAR_DEFAUT = "#1e3a8a";

/**
 * Charge checkout.js de l'opérateur, une seule fois.
 *
 * Chargé À LA DEMANDE, sur cette page seulement : un script tiers dans le paquet principal
 * serait téléchargé par tous les visiteurs, y compris les 37 étudiants qui ne paient rien.
 * La version est épinglée — un script tiers non versionné peut changer sous nos pieds entre
 * deux visites, et c'est le formulaire de paiement.
 */
const SCRIPT_OPERATEUR = "https://cdn.fedapay.com/checkout.js?v=1.1.2";

function chargerCheckout(): Promise<any> {
  const w = window as any;
  if (w.FedaPay) return Promise.resolve(w.FedaPay);
  return new Promise((resolve, reject) => {
    const existant = document.querySelector(`script[src="${SCRIPT_OPERATEUR}"]`);
    const el = (existant as HTMLScriptElement) ?? document.createElement("script");
    const fini = () => (w.FedaPay ? resolve(w.FedaPay) : reject(new Error("checkout.js chargé sans FedaPay")));
    el.addEventListener("load", fini);
    el.addEventListener("error", () => reject(new Error("checkout.js injoignable")));
    if (!existant) { el.src = SCRIPT_OPERATEUR; el.async = true; document.body.appendChild(el); }
  });
}

export default function PaiementAttestation() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/academy/paiement/:courseId");
  const courseId = params?.courseId && /^\d+$/.test(params.courseId) ? Number(params.courseId) : null;
  const retour = new URLSearchParams(window.location.search).get("retour");

  const [chargement, setChargement] = useState(true);
  const [cours, setCours] = useState<any>(null);
  const [parcours, setParcours] = useState<Program | null>(null);
  const [prix, setPrix] = useState(0);
  const [paiement, setPaiement] = useState<Paiement | null>(null);
  const [attestation, setAttestation] = useState<any>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tentatives, setTentatives] = useState(0);
  // Transaction ouverte : le formulaire de l'opérateur s'affiche alors DANS la page.
  const [transaction, setTransaction] = useState<any>(null);
  const [replie, setReplie] = useState(false);
  const cadreRef = useRef<HTMLDivElement>(null);

  const lire = useCallback(async () => {
    if (!courseId) return;
    const [c, pay] = await Promise.all([
      fetch(`/api/academy/courses/${courseId}`).then(r => r.json()).catch(() => null),
      studentFetch("/api/academy/paiements").then(r => r.json()).catch(() => null),
    ]);
    if (c?.id) {
      setCours(c);
      const p = programOf(c.code);
      setParcours(p);
      const tarif = (pay?.tarifs || []).find((t: any) => t.programId === p?.id);
      setPrix(Number(tarif?.prix ?? p?.prixAttestation ?? 0));
    }
    if (retour && pay?.paiements) {
      setPaiement((pay.paiements as Paiement[]).find(x => x.reference === retour) ?? null);
    }
  }, [courseId, retour]);

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    lire().finally(() => setChargement(false));
  }, [lire]);

  // ── L'attente de la confirmation ──
  //
  // Le webhook arrive après le retour du navigateur, pas avant. On réinterroge toutes les
  // quatre secondes, quinze fois au plus — une minute, ce qui couvre très largement le
  // délai observé. Au-delà on cesse d'interroger et l'on explique, sans jamais annoncer un
  // échec : l'argent est peut-être bien arrivé, et pousser à repayer serait la faute.
  useEffect(() => {
    if (!retour || !paiement || paiement.statut !== "en_attente" || tentatives >= 15) return;
    const t = setTimeout(() => { setTentatives(n => n + 1); lire(); }, 4000);
    return () => clearTimeout(t);
  }, [retour, paiement, tentatives, lire]);

  // ── Le paiement confirmé délivre le document ──
  //
  // C'est ici, et nulle part ailleurs, que l'attestation s'établit après un règlement :
  // le webhook ne fait qu'encaisser.
  useEffect(() => {
    if (paiement?.statut !== "paye" || attestation || !courseId) return;
    (async () => {
      const r = await studentFetch("/api/academy/attestation", {
        method: "POST", body: JSON.stringify({ course_id: courseId }),
      });
      const d = await r.json();
      if (r.ok) setAttestation(d);
      else setErreur(d?.message || "Paiement enregistré, mais l'attestation n'a pas pu être établie.");
    })();
  }, [paiement, attestation, courseId]);

  // ── Monter le formulaire de l'opérateur dans notre cadre ──
  //
  // Deux signatures existent, et c'était le défaut : le composant officiel appelle
  // `FedaPay.init(element, options)` pour un BOUTON, mais `options.container = element`
  // puis `FedaPay.init(options)` — un seul argument — pour un CADRE INTÉGRÉ. Appeler la
  // première forme en croyant faire la seconde ne lève aucune erreur : le cadre reste
  // simplement vide, et rien dans la console ne dit pourquoi.
  //
  // Le montage se fait ici plutôt que dans un setTimeout après le clic : le cadre n'existe
  // qu'une fois que React l'a rendu, et attendre soixante millisecondes en espérant que ce
  // soit fait est un pari, pas une garantie. Cet effet ne s'exécute qu'avec la référence en
  // main.
  useEffect(() => {
    if (!transaction || !replie || !cadreRef.current) return;
    const d = transaction;
    try {
      const FedaPay = (window as any).FedaPay;
      FedaPay.init({
        public_key: d.clePublique,
        environment: d.environnement === "live" ? "live" : "sandbox",
        locale: "fr",
        container: cadreRef.current,
        // L'identifiant suffit : la transaction existe déjà, avec son montant.
        transaction: { id: Number(d.transactionId), amount: d.montant, description: "Attestation" },
        currency: { iso: d.devise || "XOF" },
        onComplete: (resp: any) => {
          // Fermeture volontaire : on ne conclut pas à l'échec, la transaction reste
          // ouverte et l'étudiant peut reprendre.
          if (resp?.reason === (window as any).FedaPay?.DIALOG_DISMISSED) { setReplie(false); return; }
          navigate(`/academy/paiement/${courseId}?retour=${encodeURIComponent(d.reference)}`);
        },
      });
    } catch {
      // Porte de secours : plutôt sortir du site que laisser un cadre vide.
      window.location.href = d.url;
    }
  }, [transaction, replie, courseId]);

  const accent = parcours?.accent ?? ACCENT_PAR_DEFAUT;

  if (chargement) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-8 py-24">
        <div className="h-0.5 w-24 bg-muted overflow-hidden" role="status" aria-label="Chargement">
          <div className="h-full w-1/3 animate-pulse" style={{ background: accent }} />
        </div>
      </div>
    );
  }

  if (!cours || !parcours || prix <= 0) {
    return (
      <Cadre accent="#7f1d1d" label="Règlement indisponible">
        <p className="mt-4 leading-7 text-muted-foreground">
          Cette attestation n'est pas payante, ou le cours est introuvable.
        </p>
        <Button variant="outline" className="mt-6 gap-2 min-h-11 rounded-none"
          onClick={() => navigate("/academy/dashboard")}>
          <ArrowLeft className="w-4 h-4" /> Retour à mon espace
        </Button>
      </Cadre>
    );
  }

  const montant = prix.toLocaleString("fr-FR");

  // ══════════════ Au retour de l'opérateur ══════════════
  if (retour) {
    const statut = paiement?.statut;

    if (statut === "paye") {
      return (
        <Cadre accent={accent} label="Paiement confirmé">
          <SEO title="Paiement confirmé" description="Votre attestation est établie." />
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            Votre attestation est établie
          </h1>
          {attestation ? (
            <>
              <dl className="mt-6 border-t border-border pt-4 text-sm">
                <div className="flex justify-between gap-4 py-1.5 border-b border-border/50">
                  <dt className="text-muted-foreground">Numéro</dt>
                  <dd className="font-mono tabular-nums font-medium">{attestation.certificate_no}</dd>
                </div>
                {attestation.final_score != null && (
                  <div className="flex justify-between gap-4 py-1.5 border-b border-border/50">
                    <dt className="text-muted-foreground">Score final</dt>
                    <dd className="font-mono tabular-nums">{attestation.final_score} %</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 py-1.5">
                  <dt className="text-muted-foreground">Réglé</dt>
                  <dd className="font-mono tabular-nums">{montant} {paiement?.devise}</dd>
                </div>
              </dl>
              <p className="mt-5 leading-7 text-muted-foreground">
                Conservez ce numéro : il permet de vérifier l'attestation en ligne, sans vous
                contacter et sans passer par nous.
              </p>
            </>
          ) : erreur ? (
            <p className="mt-4 leading-7 text-destructive">{erreur}</p>
          ) : (
            <p className="mt-4 leading-7 text-muted-foreground">Établissement du document…</p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            {/* Les attestations se lisent sur le tableau de bord — il n'existe pas d'écran
                dédié, et en inventer un lien mènerait à une page absente. */}
            <Button className="gap-2 min-h-11 rounded-none border-0 text-white" style={{ background: accent }}
              onClick={() => navigate("/academy/dashboard")}>
              Voir mon attestation <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Cadre>
      );
    }

    if (statut === "echoue" || statut === "annule" || statut === "rembourse") {
      return (
        <Cadre accent="#7f1d1d" label={statut === "annule" ? "Paiement annulé" : "Paiement non abouti"}>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            {statut === "annule" ? "Vous avez interrompu le paiement" : "Le paiement n'a pas abouti"}
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Rien n'a été débité, et votre travail est intact. Votre attestation reste
            disponible : vous pouvez reprendre le règlement quand vous voulez.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button className="gap-2 min-h-11 rounded-none border-0 text-white" style={{ background: accent }}
              onClick={() => navigate(`/academy/paiement/${courseId}`)}>
              Reprendre le règlement <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="min-h-11 rounded-none"
              onClick={() => navigate("/academy/dashboard")}>
              Plus tard
            </Button>
          </div>
        </Cadre>
      );
    }

    // En attente — ou introuvable, ce qui revient au même du point de vue de l'étudiant.
    const abandonne = tentatives >= 15;
    return (
      <Cadre accent={accent} label="Confirmation en cours">
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
          Nous attendons la confirmation de l'opérateur
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          {abandonne
            ? "La confirmation tarde. Si le montant a été débité, votre attestation sera établie dès que l'opérateur nous préviendra — rien n'est perdu. Ne payez pas une seconde fois : revenez sur cette page dans quelques minutes."
            : "Cela prend en général quelques secondes. Cette page se met à jour toute seule, ne la fermez pas."}
        </p>
        <dl className="mt-6 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-4 py-1.5">
            <dt className="text-muted-foreground">Référence</dt>
            <dd className="font-mono text-xs break-all">{retour}</dd>
          </div>
        </dl>
        {!abandonne && (
          <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Vérification… ({tentatives + 1}/15)
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="outline" className="min-h-11 rounded-none"
            onClick={() => { setTentatives(0); lire(); }}>
            Vérifier maintenant
          </Button>
          <Button variant="outline" className="min-h-11 rounded-none"
            onClick={() => navigate("/academy/dashboard")}>
            Mon espace
          </Button>
        </div>
      </Cadre>
    );
  }

  // ══════════════ Avant le paiement : ce que l'on achète ══════════════
  //
  // ── Le paiement se fait ICI, sans quitter le site ──
  //
  // La transaction est créée par NOTRE serveur : c'est lui qui fixe le montant, et le
  // navigateur ne reçoit que son identifiant. Il ne crée rien, il désigne. Le formulaire
  // de l'opérateur s'ouvre ensuite dans un cadre de cette page.
  //
  // Ce n'est pas un confort. Renvoyer quelqu'un sur process.fedapay.com au moment de
  // payer, c'est le sortir du site qui vient de lui promettre un document : l'adresse
  // change, la marque disparaît, et une partie des gens s'arrête là. C'est l'étape la plus
  // fragile de tout le tunnel.
  //
  // La redirection reste comme PORTE DE SECOURS. Si le script de l'opérateur ne se charge
  // pas — réseau coupé, blocage, coupure d'antenne — on renvoie vers sa page plutôt que de
  // laisser l'étudiant devant un cadre vide. Mieux vaut sortir du site que ne pas payer.
  async function payer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await studentFetch("/api/academy/paiement/attestation", {
        method: "POST", body: JSON.stringify({ course_id: courseId }),
      });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d?.message || "Le paiement n'a pas pu être ouvert.");

      if (!d.clePublique || !d.transactionId) { window.location.href = d.url; return; }

      let FedaPay: any;
      try { FedaPay = await chargerCheckout(); }
      catch { window.location.href = d.url; return; }

      // Le montage se fait dans l'effet ci-dessous, quand React a posé le cadre.
      setTransaction(d);
      setReplie(true);
    } catch (e: any) {
      setErreur(String(e?.message || e));
      setEnvoi(false);
    }
  }

  // ── Le formulaire de l'opérateur, une fois la transaction ouverte ──
  //
  // ── Ce que nous ne pouvons PAS habiller ──
  //
  // Le contenu de ce cadre est une iframe servie par l'opérateur : le choix de Moov ou de
  // Togocel, la saisie du numéro, les boutons, tout y appartient à son domaine. Aucune
  // feuille de style de ce site ne l'atteint, et c'est voulu — c'est ce qui garantit que
  // nous ne pouvons pas lire ce qui s'y saisit.
  //
  // ── Ce que nous pouvons faire, et qui compte ──
  //
  // Ne pas l'étrangler. La version précédente lui imposait une hauteur figée de 520 px,
  // une bordure, et les marges de 16 px du gabarit : sur un téléphone de 390 px, leur
  // formulaire disposait de 358 px et se retrouvait tronqué ou à faire défiler de côté.
  //
  // Il prend donc toute la largeur sur mobile — marges négatives pour sortir du gabarit —
  // et sa hauteur suit son contenu au lieu de la contraindre. Le cadre ne se dessine plus
  // qu'à partir de la tablette, là où la place ne manque pas.
  if (transaction && replie) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-8 py-8 sm:py-16">
        <div className="border-t-2 pt-6 max-w-2xl" style={{ borderColor: accent }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
            Paiement — {montant} F CFA
          </p>
          <h1 className="mt-3 text-xl font-semibold leading-tight">
            {parcours.credential || "Attestation de fin de parcours"}
          </h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Formulaire sécurisé de notre opérateur. Vos identifiants de paiement ne
            transitent jamais par nous.
          </p>

          <div className="relative mt-5 -mx-4 sm:mx-0 sm:border sm:border-border">
            {/* Un cadre vide inquiète. Cette attente reste DERRIÈRE l'iframe : quand
                l'opérateur peint son formulaire par-dessus, elle disparaît d'elle-même,
                sans qu'on ait à deviner le moment où il a fini. */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center py-16">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Ouverture du paiement sécurisé…
              </p>
            </div>
            <div ref={cadreRef} className="min-h-[460px]" />
          </div>

          <Button variant="outline" className="mt-5 min-h-11 rounded-none"
            onClick={() => { setReplie(false); setTransaction(null); setEnvoi(false); }}>
            <ArrowLeft className="w-4 h-4" /> Revenir au récapitulatif
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8 py-10 sm:py-16">
      <SEO title="Règlement de l'attestation" description={parcours.credential ?? undefined} />
      <div className="border-t-2 pt-6" style={{ borderColor: accent }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
          Règlement de l'attestation
        </p>

        <div className="mt-8 grid gap-10 md:grid-cols-[1fr_320px] md:gap-16">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold leading-snug tracking-tight">
              {parcours.credential || "Attestation de fin de parcours"}
            </h1>
            <p className="mt-4 leading-7 text-muted-foreground">
              Vous avez terminé « {cours.title} ». Le document ci-dessous est prêt à être
              établi à votre nom.
            </p>

            <ul className="mt-6 space-y-2.5 text-sm leading-6">
              {[
                "Établie à votre nom, signée, datée",
                "Numéro unique et code QR de vérification",
                "Vérifiable en ligne par un employeur, sans passer par vous",
                "Téléchargeable autant de fois que nécessaire",
              ].map(t => (
                <li key={t} className="flex items-start gap-3">
                  <Check className="w-4 h-4 shrink-0 mt-1" style={{ color: accent }} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
              <strong className="text-foreground">La formation reste gratuite.</strong> Vous ne
              réglez que le document, une seule fois, et il couvre l'ensemble du parcours.
            </p>
          </div>

          {/* Le montant, isolé et sans emphase commerciale : c'est un fait, pas une offre. */}
          <aside className="border-t border-border pt-6 md:border-t-0 md:pt-0">
            <dl>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Montant
              </dt>
              <dd className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">
                {montant}
                <span className="text-xl text-muted-foreground"> F CFA</span>
              </dd>
            </dl>

            {/* Les frais de l'opérateur s'ajoutent au montant — environ 256 F pour 10 000
                relevés en Mobile Money. Les taire ferait découvrir un écart au dernier
                écran, c'est-à-dire à l'instant précis où l'on décide de renoncer. */}
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Les frais de l'opérateur s'ajoutent à ce montant et vous seront indiqués avant
              validation.
            </p>
            <p className="mt-5 flex items-start gap-2.5 text-xs leading-5 text-muted-foreground">
              <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
              Mobile Money ou carte bancaire, sans quitter le site.
            </p>
            <p className="mt-2.5 flex items-start gap-2.5 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              Nous ne voyons jamais vos identifiants de paiement.
            </p>

            {erreur && <p className="mt-5 text-sm text-destructive leading-6">{erreur}</p>}

            <Button className="mt-6 w-full gap-2 min-h-12 rounded-none border-0 text-white"
              style={{ background: accent }} disabled={envoi} onClick={payer}>
              {envoi ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Payer {montant} F CFA
            </Button>
            <Button variant="outline" className="mt-2.5 w-full min-h-11 rounded-none"
              onClick={() => navigate(`/academy/classroom/${courseId}`)}>
              Plus tard
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
}
