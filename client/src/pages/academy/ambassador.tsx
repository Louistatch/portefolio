import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, Megaphone, Copy, Check, Users, Wallet, Award,
  Download, Lock, Share2, MessageCircle, Infinity as InfiniteIcon,
  ArrowRight, Clock, BadgeCheck, Link2,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn, downloadStudentFile, getStudent } from "@/lib/student";
import { AnimatedNumber, MountItem, MountStagger, Reveal } from "@/components/motion";
import { VERT_CLAIR, VERT_FONCE, VERT_FONCE_2 } from "@/components/academy/landing-parts";
import {
  Atout, CarteAmbassadeur, Indicateur, Jauge, Mecanisme, SurTitre, TitreSection,
} from "@/components/academy/ambassador-parts";
import { PROGRAMS } from "@shared/programs";

type Commission = {
  id: number; referred_student_id: number; filleul: string;
  amount: number; devise: string; status: string; created_at: string;
};

type Etat = {
  isAmbassador: boolean;
  eligible: boolean;
  joursDepuisAdmission: number | null;
  leconsTerminees: number;
  seuil: { jours: number; lecons: number };
  /** Taux de commission en pourcentage. Vient du serveur (AMBASSADOR_TAUX_COMMISSION) dans les
   *  deux cas de figure : une copie ici divergerait le jour où le taux change. */
  taux: number;
  code?: string;
  since?: string;
  lien?: string;
  totalGagne?: number;
  totalPaye?: number;
  enAttente?: number;
  filleuls?: { id: number; full_name: string; created_at: string }[];
  commissions?: Commission[];
};

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} F`;

/**
 * Programme ambassadeur — une page, deux visages.
 *
 * Avant l'adhésion elle se lit comme une offre : ce que le rôle rapporte, comment une
 * commission se déclenche, et où l'on en est par rapport au seuil. Après, elle devient le
 * poste de pilotage du parrainage. Une seule page plutôt que deux : le passage de l'une à
 * l'autre EST la progression que le programme raconte, et la carte d'ambassadeur — verrouillée
 * puis délivrée — est l'objet qui rend ce passage visible.
 *
 * ── Ce que la page n'affiche pas ──
 *
 * Ni badge, ni niveau, ni palier : le programme n'en a pas en base. Les seules progressions
 * montrées sont réelles — les deux conditions d'accès (jours écoulés, leçons validées) et le
 * compte de filleuls, de conversions et de gains renvoyé par l'API.
 */
export default function AcademyAmbassador() {
  const [, navigate] = useLocation();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejoindre, setRejoindre] = useState(false);
  const [erreur, setErreur] = useState("");
  const [copie, setCopie] = useState<"lien" | "texte" | null>(null);
  const [telechargement, setTelechargement] = useState(false);
  const [nbEtudiants, setNbEtudiants] = useState<number | null>(null);

  async function charger() {
    const r = await studentFetch("/api/academy/ambassador/me").then(r => r.json());
    setEtat(r);
  }

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    charger().finally(() => setLoading(false));
  }, []);

  /**
   * Le seul chiffre de la page qui ne parle pas de l'étudiant lui-même : l'effectif réel de
   * l'école, compté en base par /api/academy/landing (la même source que la page publique —
   * pas une seconde vérité qui divergerait). Il donne à l'ambassadeur quelque chose de vrai
   * à citer quand il recommande.
   *
   * Chargé à part, et son échec est silencieux : c'est un appoint de crédibilité, pas une
   * donnée dont la page dépend. `fetch` nu plutôt que `studentFetch` — la route est publique,
   * et un 401 ne doit surtout pas déconnecter l'étudiant à cause d'un chiffre décoratif.
   */
  useEffect(() => {
    let vivant = true;
    fetch("/api/academy/landing")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (vivant && typeof d?.chiffres?.etudiants === "number") setNbEtudiants(d.chiffres.etudiants); })
      .catch(() => {});
    return () => { vivant = false; };
  }, []);

  async function rejoindreLeProgramme() {
    setRejoindre(true); setErreur("");
    try {
      const res = await studentFetch("/api/academy/ambassador/join", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setErreur(data.message || "Inscription impossible pour le moment."); return; }
      await charger();
      // La page bascule d'un visage à l'autre : on remonte, sinon l'ambassadeur tout juste
      // admis atterrit au milieu de son propre tableau de bord sans avoir vu sa carte.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setErreur("Erreur réseau. Réessayez."); }
    finally { setRejoindre(false); }
  }

  function copier(valeur: string, quoi: "lien" | "texte") {
    navigator.clipboard.writeText(valeur).then(() => {
      setCopie(quoi);
      setTimeout(() => setCopie(c => (c === quoi ? null : c)), 2200);
    }).catch(() => setErreur("Copie impossible — sélectionnez le texte à la main."));
  }

  async function telechargerCertificat() {
    setTelechargement(true);
    try { await downloadStudentFile("/api/academy/certificate/ambassador", "certificat-ambassadeur"); }
    catch { setErreur("Téléchargement impossible, réessayez."); }
    finally { setTelechargement(false); }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto" aria-busy="true" aria-live="polite">
        <span className="sr-only">Chargement de votre espace ambassadeur…</span>
        <div className="shimmer rounded-3xl h-[320px] sm:h-[300px]" />
        <div className="grid sm:grid-cols-3 gap-4 mt-10">
          {[0, 1, 2].map(i => <div key={i} className="shimmer rounded-2xl h-40" />)}
        </div>
      </div>
    );
  }
  if (!etat) return null;

  const nom = getStudent()?.full_name || "";
  const prenom = nom.split(" ")[0] || "";
  const taux = etat.taux;

  /** Ce qu'une attestation payante rapporte aujourd'hui — lu dans le registre des parcours,
   *  jamais recopié : le jour où un prix bouge, cette phrase bouge avec lui. */
  const tarifs = PROGRAMS.filter(p => p.prixAttestation > 0)
    .map(p => ({ prix: p.prixAttestation, part: Math.round(p.prixAttestation * taux / 100) }));
  const tarifUnique = tarifs.length === 1 ? tarifs[0] : null;

  const texteAPartager = etat.lien
    ? `J'apprends le MEAL avec LouisFarm Learning : collecte de données sur KoboCollect, `
      + `cartographie sur QGIS, automatisation du reporting en Python — par projets, avec des `
      + `exercices corrigés. La formation est gratuite, l'entrée se fait sur test. `
      + `Si ça t'intéresse, voici mon lien : ${etat.lien}`
    : "";

  const ETAPES = [
    { titre: "Vous rejoignez", texte: "Un clic depuis cette page. Votre code et votre lien personnel sont générés immédiatement." },
    { titre: "Vous partagez", texte: "WhatsApp, LinkedIn, un groupe de promo, une réunion d'équipe. Aucune exclusivité, aucun quota." },
    { titre: "Votre réseau s'inscrit", texte: "Toute inscription ouverte depuis votre lien vous est rattachée, définitivement." },
    { titre: "Un filleul va au bout", texte: "Il suit le parcours, le termine, et demande son attestation de compétence." },
    { titre: "Vous êtes payé", texte: `${taux} % du montant sont crédités automatiquement, puis versés par Mobile Money.` },
  ];

  /** Partage natif quand le navigateur le propose (le cas sur téléphone), sinon WhatsApp —
   *  le canal réel de nos étudiants — et la copie comme filet dans tous les cas. */
  async function partager() {
    if (!etat?.lien) return;
    if (navigator.share) {
      try { await navigator.share({ title: "LouisFarm Learning", text: texteAPartager, url: etat.lien }); return; }
      catch { /* partage refusé ou annulé : on retombe sur la copie */ }
    }
    copier(texteAPartager, "texte");
  }

  const fondSombre = { background: `linear-gradient(155deg, ${VERT_FONCE_2} 0%, ${VERT_FONCE} 78%)` };

  return (
    <div className="max-w-5xl mx-auto">
      <SEO
        title="Programme ambassadeur — LouisFarm Learning"
        description="Recommandez une formation que vous suivez vraiment, touchez une commission sur chaque attestation payée, et repartez avec un certificat qui l'atteste." />

      <button onClick={() => navigate("/academy/dashboard")}
        className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-primary transition-colors mb-5 rounded-md pressable">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Tableau de bord
      </button>

      {/* Une seule zone d'annonce pour toute la page : erreur réseau, refus d'adhésion,
          échec de copie. Sans `aria-live`, un lecteur d'écran ne saurait jamais qu'un bouton
          n'a rien fait. */}
      <div role="status" aria-live="polite" className="sr-only">
        {copie === "lien" ? "Lien copié dans le presse-papiers."
          : copie === "texte" ? "Message copié dans le presse-papiers." : ""}
      </div>

      {!etat.isAmbassador ? (
        /* ══════════════ L'offre ══════════════ */
        <>
          <MountStagger className="relative overflow-hidden rounded-3xl text-white" gap={0.08}>
            <div className="absolute inset-0" style={fondSombre} aria-hidden />
            <span aria-hidden className="orb absolute -top-24 -right-16 w-72 h-72 animate-float-slow"
              style={{ color: VERT_CLAIR, opacity: 0.22 }} />
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/15" />

            <div className="relative p-6 sm:p-9 lg:p-11 grid lg:grid-cols-12 gap-9 lg:gap-8 items-center">
              <div className="lg:col-span-7 min-w-0">
                <MountItem><SurTitre clair>Programme ambassadeur</SurTitre></MountItem>

                <MountItem>
                  <h1 className="titre-affichage text-white text-[26px] sm:text-4xl lg:text-[42px] font-semibold mt-5 mb-4 text-balance">
                    Vous êtes déjà la meilleure preuve que ça marche.
                  </h1>
                </MountItem>

                <MountItem>
                  <p className="text-[15px] sm:text-base leading-relaxed text-white/75 max-w-xl text-pretty">
                    Ce programme transforme votre parcours en recommandation. Chaque personne que vous
                    amenez et qui paie son attestation vous rapporte <strong className="text-white font-semibold">{taux} %</strong> du
                    montant — plus un certificat qui atteste du rôle.
                  </p>
                </MountItem>

                {/* Les règles du jeu, façon fiche technique : c'est ce qui rend l'offre
                    croyable là où une promesse ne le ferait pas. */}
                <MountItem>
                  <dl className="mt-7 space-y-3 border-t border-white/10 pt-6">
                    {[
                      [`${taux} %`, "de l'attestation payée par chaque filleul, crédités automatiquement"],
                      tarifUnique
                        ? [fcfa(tarifUnique.part), `votre part sur une attestation à ${fcfa(tarifUnique.prix)} CFA`]
                        : ["À vie", "un filleul inscrit par votre lien vous reste rattaché, sans limite de temps"],
                      ["0 quota", "aucune exclusivité, aucun engagement, aucun minimum à tenir"],
                    ].map(([valeur, texte]) => (
                      <div key={texte} className="flex gap-4 items-baseline">
                        <dt className="titre-affichage text-lg sm:text-xl font-semibold w-[92px] sm:w-[104px] shrink-0 chiffres-tabulaires"
                          style={{ color: VERT_CLAIR }}>{valeur}</dt>
                        <dd className="text-[13px] sm:text-sm text-white/70 leading-snug">{texte}</dd>
                      </div>
                    ))}
                  </dl>
                </MountItem>

                <MountItem>
                  <div className="flex flex-col sm:flex-row gap-3 mt-8">
                    {etat.eligible ? (
                      <button onClick={rejoindreLeProgramme} disabled={rejoindre}
                        className="pressable inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[15px] font-semibold
                                   transition-opacity hover:opacity-90 disabled:opacity-60
                                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        style={{ color: VERT_FONCE }}>
                        {rejoindre
                          ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Création de votre code…</>
                          : <>Devenir ambassadeur <ArrowRight className="w-4 h-4" aria-hidden /></>}
                      </button>
                    ) : (
                      <a href="#acces"
                        className="pressable inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[15px] font-semibold
                                   transition-opacity hover:opacity-90
                                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        style={{ color: VERT_FONCE }}>
                        Voir ce qu'il me manque <ArrowRight className="w-4 h-4" aria-hidden />
                      </a>
                    )}
                    <a href="#mecanisme"
                      className="pressable inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-white/25 text-[15px] font-semibold text-white
                                 transition-colors hover:bg-white/10
                                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                      Comment ça marche
                    </a>
                  </div>
                </MountItem>
              </div>

              <MountItem className="lg:col-span-5 flex justify-center lg:justify-end" y={30}>
                <div className="w-full flex flex-col items-center lg:items-end gap-3">
                  <CarteAmbassadeur nom={nom} verrouillee />
                  <p className="text-[11px] text-white/50 text-center lg:text-right max-w-[340px]">
                    Votre carte, et le code qu'elle porte, sont créés au moment où vous rejoignez.
                  </p>
                </div>
              </MountItem>
            </div>
          </MountStagger>

          {/* ── Ce que ça rapporte ── */}
          <Reveal className="mt-12 sm:mt-16">
            <TitreSection>Ce que ça vous rapporte</TitreSection>
            <div className="grid sm:grid-cols-3 gap-4">
              <Atout icone={Wallet} valeur={`${taux} %`} titre="Sur chaque attestation payée"
                texte={tarifUnique
                  ? `Soit ${fcfa(tarifUnique.part)} CFA pour une attestation à ${fcfa(tarifUnique.prix)} CFA. Créditée dès que le paiement est confirmé, versée par Mobile Money.`
                  : "Créditée dès que le paiement de votre filleul est confirmé, puis versée par Mobile Money."} />
              <Atout icone={InfiniteIcon} valeur="À vie" titre="Vos filleuls restent les vôtres"
                texte="Une inscription ouverte depuis votre lien vous est rattachée définitivement — même si elle paie son attestation six mois plus tard." />
              <Atout icone={Award} valeur="1 certificat" titre="Une ligne de plus sur votre CV"
                texte="Un document nominatif qui atteste du rôle, de vos filleuls et de vos résultats. À joindre à une candidature ou publier sur LinkedIn." />
            </div>
          </Reveal>

          {/* ── Le mécanisme ── */}
          <Reveal className="mt-12 sm:mt-16">
            <div id="mecanisme" className="scroll-mt-4">
              <TitreSection>Comment ça marche</TitreSection>
              <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
                <Mecanisme etapes={ETAPES} />
              </div>
            </div>
          </Reveal>

          {/* ── Les conditions d'accès ── */}
          <Reveal className="mt-12 sm:mt-16">
            <div id="acces" className="scroll-mt-4">
              <TitreSection>Deux conditions, et la carte est à vous</TitreSection>
              <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  On ne recommande bien que ce qu'on a vraiment vu. Le seuil n'est pas là pour filtrer :
                  il garantit qu'un ambassadeur parle de son propre parcours, pas d'un argumentaire.
                </p>

                <div className="mt-7 space-y-6 max-w-2xl">
                  <Jauge fait={(etat.joursDepuisAdmission ?? 0) >= etat.seuil.jours}
                    label={`${etat.seuil.jours} jours depuis votre admission`}
                    valeur={etat.joursDepuisAdmission ?? 0} cible={etat.seuil.jours} unite="jours" />
                  <Jauge fait={etat.leconsTerminees >= etat.seuil.lecons}
                    label={`${etat.seuil.lecons} leçons terminées`}
                    valeur={etat.leconsTerminees} cible={etat.seuil.lecons} unite="leçons" />
                </div>

                {erreur && (
                  <p className="text-sm text-destructive mt-6" role="alert">{erreur}</p>
                )}

                <div className="mt-7 pt-6 border-t border-border/50">
                  {etat.eligible ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <Button size="lg" className="w-full sm:w-auto gap-2 pressable"
                        disabled={rejoindre} onClick={rejoindreLeProgramme}>
                        {rejoindre
                          ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Création de votre code…</>
                          : <><Megaphone className="w-4 h-4" aria-hidden /> Devenir ambassadeur</>}
                      </Button>
                      <p className="text-[13px] text-muted-foreground">
                        Vous y êtes. Votre code est créé immédiatement, rien d'autre à remplir.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Lock className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                      <p className="leading-relaxed">
                        {manquant(etat)} Continuez vos leçons : cette page se met à jour toute seule,
                        et le bouton apparaîtra ici.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Reveal>

          {/* ── Conclusion ── */}
          <Reveal className="mt-12 sm:mt-16">
            <div className="relative overflow-hidden rounded-3xl text-white p-7 sm:p-10 text-center">
              <div className="absolute inset-0" style={fondSombre} aria-hidden />
              <span aria-hidden className="orb absolute -bottom-24 left-1/2 -translate-x-1/2 w-80 h-56 animate-float-slower"
                style={{ color: VERT_CLAIR, opacity: 0.18 }} />
              <div className="relative">
                <h2 className="titre-affichage text-white text-xl sm:text-3xl font-semibold max-w-xl mx-auto text-balance">
                  La formation vous a coûté du travail. Elle peut commencer à vous rapporter.
                </h2>
                <p className="text-sm text-white/70 mt-4 max-w-lg mx-auto leading-relaxed">
                  {etat.eligible
                    ? "Il ne manque plus que votre lien."
                    : "Vous n'êtes plus très loin — le seuil se franchit en continuant votre parcours."}
                </p>
                {nbEtudiants !== null && (
                  <p className="text-[13px] text-white/55 mt-3">
                    Vous recommanderiez une école qui compte déjà{" "}
                    <strong className="text-white/85 font-semibold chiffres-tabulaires">
                      <AnimatedNumber value={nbEtudiants} /> étudiants inscrits
                    </strong>.
                  </p>
                )}
                <div className="mt-7 flex justify-center">
                  {etat.eligible ? (
                    <button onClick={rejoindreLeProgramme} disabled={rejoindre}
                      className="pressable inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-[15px] font-semibold
                                 transition-opacity hover:opacity-90 disabled:opacity-60
                                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      style={{ color: VERT_FONCE }}>
                      {rejoindre
                        ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Création de votre code…</>
                        : <>Devenir ambassadeur <ArrowRight className="w-4 h-4" aria-hidden /></>}
                    </button>
                  ) : (
                    <a href="/academy/dashboard"
                      className="pressable inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-[15px] font-semibold
                                 transition-opacity hover:opacity-90
                                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      style={{ color: VERT_FONCE }}>
                      Reprendre mes leçons <ArrowRight className="w-4 h-4" aria-hidden />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </>
      ) : (
        /* ══════════════ Le poste de pilotage ══════════════ */
        <>
          <MountStagger className="relative overflow-hidden rounded-3xl text-white" gap={0.08}>
            <div className="absolute inset-0" style={fondSombre} aria-hidden />
            <span aria-hidden className="orb absolute -top-24 -right-16 w-72 h-72 animate-float-slow"
              style={{ color: VERT_CLAIR, opacity: 0.22 }} />
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/15" />

            <div className="relative p-6 sm:p-9 lg:p-11 grid lg:grid-cols-12 gap-9 lg:gap-8 items-center">
              <div className="lg:col-span-7 min-w-0">
                <MountItem><SurTitre clair>Votre espace ambassadeur</SurTitre></MountItem>
                <MountItem>
                  <h1 className="titre-affichage text-white text-[26px] sm:text-4xl lg:text-[40px] font-semibold mt-5 mb-3 text-balance">
                    Tout part de ce lien{prenom ? `, ${prenom}` : ""}.
                  </h1>
                </MountItem>
                <MountItem>
                  <p className="text-[15px] leading-relaxed text-white/70 max-w-lg text-pretty">
                    Partagez-le tel quel. Toute inscription qui passe par là vous est rattachée,
                    et {taux} % de l'attestation vous reviennent le jour où elle est payée.
                  </p>
                </MountItem>

                <MountItem>
                  <div className="mt-7">
                    <label htmlFor="lien-parrainage" className="block text-[11px] uppercase tracking-[0.14em] text-white/50 mb-2">
                      Votre lien de parrainage
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input id="lien-parrainage" readOnly value={etat.lien || ""}
                        onFocus={e => e.currentTarget.select()}
                        className="flex-1 min-w-0 text-[13px] font-mono bg-black/25 border border-white/15 rounded-xl px-3.5 py-3 text-white/90
                                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" />
                      <button onClick={() => etat.lien && copier(etat.lien, "lien")}
                        className="pressable shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-sm font-semibold
                                   transition-opacity hover:opacity-90
                                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        style={{ color: VERT_FONCE }}>
                        {copie === "lien"
                          ? <><Check className="w-4 h-4" aria-hidden /> Copié</>
                          : <><Copy className="w-4 h-4" aria-hidden /> Copier</>}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button onClick={partager}
                        className="pressable inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/25 text-[13px] font-medium text-white
                                   transition-colors hover:bg-white/10
                                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                        <Share2 className="w-3.5 h-3.5" aria-hidden /> Partager
                      </button>
                      <a href={`https://wa.me/?text=${encodeURIComponent(texteAPartager)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="pressable inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/25 text-[13px] font-medium text-white
                                   transition-colors hover:bg-white/10
                                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                        <MessageCircle className="w-3.5 h-3.5" aria-hidden /> WhatsApp
                        <span className="sr-only">(ouvre un nouvel onglet)</span>
                      </a>
                      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(etat.lien || "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="pressable inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/25 text-[13px] font-medium text-white
                                   transition-colors hover:bg-white/10
                                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                        <Link2 className="w-3.5 h-3.5" aria-hidden /> LinkedIn
                        <span className="sr-only">(ouvre un nouvel onglet)</span>
                      </a>
                    </div>
                  </div>
                </MountItem>
              </div>

              <MountItem className="lg:col-span-5 flex justify-center lg:justify-end" y={30}>
                <CarteAmbassadeur nom={nom} code={etat.code} depuis={etat.since} />
              </MountItem>
            </div>
          </MountStagger>

          {erreur && <p className="text-sm text-destructive mt-4" role="alert">{erreur}</p>}

          {/* ── Le tableau de bord ── */}
          <Reveal className="mt-12 sm:mt-16">
            <TitreSection>Où vous en êtes</TitreSection>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Indicateur icone={Users} label="Filleuls inscrits"
                enfant={<AnimatedNumber value={etat.filleuls?.length || 0} />} />
              <Indicateur icone={BadgeCheck} label="Attestations payées"
                enfant={<AnimatedNumber value={etat.commissions?.length || 0} />} />
              <Indicateur icone={Wallet} accent label="Total gagné"
                enfant={<><AnimatedNumber value={etat.totalGagne || 0} /> <span className="text-lg">F</span></>} />
              <Indicateur icone={Clock} label="En attente de versement"
                enfant={<><AnimatedNumber value={etat.enAttente || 0} /> <span className="text-lg">F</span></>} />
            </div>
            {(etat.totalPaye || 0) > 0 && (
              <p className="text-[13px] text-foreground/70 mt-3">
                Dont <strong className="text-foreground chiffres-tabulaires">{fcfa(etat.totalPaye || 0)} CFA</strong> déjà versés.
              </p>
            )}
          </Reveal>

          {/* ── Les filleuls ── */}
          <Reveal className="mt-12 sm:mt-16">
            <TitreSection>Vos filleuls</TitreSection>
            <div className="rounded-3xl border border-border/60 bg-card overflow-hidden">
              {!etat.filleuls?.length ? (
                <div className="px-6 py-14 text-center">
                  <span className="w-12 h-12 rounded-2xl bg-muted grid place-items-center mx-auto mb-4" aria-hidden>
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </span>
                  <p className="font-semibold">Personne pour l'instant.</p>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                    C'est normal le premier jour. Un message dans un groupe WhatsApp de promo suffit
                    souvent à faire venir la première inscription.
                  </p>
                  <Button className="mt-6 gap-2 pressable" onClick={partager}>
                    <Share2 className="w-4 h-4" aria-hidden /> Partager mon lien
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {etat.filleuls.map(f => {
                    // Rapprochement par identifiant, jamais par nom : deux étudiants peuvent
                    // porter le même, et un filleul peut payer plusieurs attestations.
                    const siennes = (etat.commissions || []).filter(c => c.referred_student_id === f.id);
                    const total = siennes.reduce((a, c) => a + c.amount, 0);
                    const toutPaye = siennes.length > 0 && siennes.every(c => c.status === "payee");
                    return (
                      <li key={f.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                        <span className="w-9 h-9 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0" aria-hidden>
                          {(f.full_name || "").split(" ").filter(Boolean).map(m => m[0]).slice(0, 2).join("").toUpperCase() || "?"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{f.full_name}</p>
                          <p className="text-[11px] text-muted-foreground chiffres-tabulaires">
                            Inscrit le {new Date(f.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        {siennes.length > 0 ? (
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 chiffres-tabulaires ${
                            toutPaye ? "bg-primary/10 text-primary"
                                     : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
                            {fcfa(total)} · {toutPaye ? "versée" : "en attente"}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground shrink-0">en cours de parcours</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Reveal>

          {/* ── Le message prêt à l'emploi ── */}
          <Reveal className="mt-12 sm:mt-16">
            <TitreSection>Un message prêt à envoyer</TitreSection>
            <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-2xl p-4 leading-relaxed">
                {texteAPartager}
              </p>
              {nbEtudiants !== null && (
                <p className="text-[13px] text-muted-foreground mt-3">
                  À citer si on vous pose la question :{" "}
                  <strong className="text-foreground chiffres-tabulaires">
                    <AnimatedNumber value={nbEtudiants} /> étudiants
                  </strong>{" "}
                  sont aujourd'hui inscrits sur la plateforme.
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button variant="outline" className="w-full sm:w-auto gap-2 pressable"
                  onClick={() => copier(texteAPartager, "texte")}>
                  {copie === "texte"
                    ? <><Check className="w-4 h-4" aria-hidden /> Message copié</>
                    : <><Copy className="w-4 h-4" aria-hidden /> Copier le message</>}
                </Button>
                <Button className="w-full sm:w-auto gap-2 pressable" onClick={partager}>
                  <Share2 className="w-4 h-4" aria-hidden /> Partager
                </Button>
              </div>
            </div>
          </Reveal>

          {/* ── Rappel du mécanisme ── */}
          <Reveal className="mt-12 sm:mt-16">
            <div id="mecanisme" className="scroll-mt-4">
              <TitreSection>Ce qui déclenche une commission</TitreSection>
              <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
                <Mecanisme etapes={ETAPES} />
              </div>
            </div>
          </Reveal>

          {/* ── Le certificat ── */}
          <Reveal className="mt-12 sm:mt-16">
            <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
              <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary grid place-items-center shrink-0" aria-hidden>
                <Award className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Votre certificat d'ambassadeur</h2>
                <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                  Nominatif, daté, avec vos filleuls et vos résultats. À joindre à une candidature
                  ou publier sur LinkedIn.
                </p>
              </div>
              <Button className="w-full sm:w-auto gap-2 shrink-0 pressable"
                disabled={telechargement} onClick={telechargerCertificat}>
                {telechargement
                  ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Préparation…</>
                  : <><Download className="w-4 h-4" aria-hidden /> Télécharger</>}
              </Button>
            </div>
          </Reveal>

          {/* ── Conclusion ── */}
          <Reveal className="mt-12 sm:mt-16">
            <div className="relative overflow-hidden rounded-3xl text-white p-7 sm:p-10 text-center">
              <div className="absolute inset-0" style={fondSombre} aria-hidden />
              <span aria-hidden className="orb absolute -bottom-24 left-1/2 -translate-x-1/2 w-80 h-56 animate-float-slower"
                style={{ color: VERT_CLAIR, opacity: 0.18 }} />
              <div className="relative">
                <h2 className="titre-affichage text-white text-xl sm:text-3xl font-semibold max-w-xl mx-auto text-balance">
                  Un lien partagé aujourd'hui, c'est un parcours qui commence la semaine prochaine.
                </h2>
                <p className="text-sm text-white/70 mt-4 max-w-lg mx-auto leading-relaxed">
                  Vous n'avez rien à vendre : vous racontez ce que vous faites déjà.
                </p>
                <button onClick={partager}
                  className="pressable mt-7 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-[15px] font-semibold
                             transition-opacity hover:opacity-90
                             focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  style={{ color: VERT_FONCE }}>
                  <Share2 className="w-4 h-4" aria-hidden /> Partager mon lien
                </button>
              </div>
            </div>
          </Reveal>
        </>
      )}
    </div>
  );
}

/** Ce qu'il reste à franchir, dit en toutes lettres plutôt qu'en « pas encore éligible ». */
function manquant(etat: Etat): string {
  const jours = Math.max(0, etat.seuil.jours - (etat.joursDepuisAdmission ?? 0));
  const lecons = Math.max(0, etat.seuil.lecons - etat.leconsTerminees);
  if (etat.joursDepuisAdmission == null) {
    return "Le programme s'ouvre après votre admission à un parcours.";
  }
  const bouts: string[] = [];
  if (jours > 0) bouts.push(`${jours} jour${jours > 1 ? "s" : ""}`);
  if (lecons > 0) bouts.push(`${lecons} leçon${lecons > 1 ? "s" : ""}`);
  if (!bouts.length) return "Vous remplissez les conditions.";
  return `Il vous reste ${bouts.join(" et ")}.`;
}
