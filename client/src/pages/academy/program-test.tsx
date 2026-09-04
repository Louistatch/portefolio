import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import {
  Loader2, ChevronLeft, ChevronRight, CheckCircle2, Clock, ArrowRight, Trophy, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";
import { isStudentLoggedIn, studentFetch } from "@/lib/student";
import { programById, type Program } from "@shared/programs";
import { QUESTIONS_TOF } from "@shared/tof-test";
import { QUESTIONS_FCA } from "@shared/fca-test";

/**
 * Test d'admission d'un parcours.
 *
 * Une seule page pour tous les parcours ayant leur propre porte d'entrée : le parcours est un
 * paramètre d'adresse, les questions viennent d'un registre. Écrire une page par test aurait
 * produit trois copies à corriger séparément le jour où la navigation change.
 *
 * Le score est calculé CÔTÉ SERVEUR uniquement. Le navigateur n'a que les énoncés et les
 * options ; la clé de correction ne quitte jamais api/.
 */

const BANQUES: Record<string, { domaine: string; q: string; opts: string[] }[]> = {
  tof: QUESTIONS_TOF,
  fca: QUESTIONS_FCA,
};

export default function ProgramTest() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/academy/test/:id");
  const programId = params?.id ?? "";

  const [chargement, setChargement] = useState(true);
  const [statut, setStatut] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [reponses, setReponses] = useState<Record<number, number>>({});
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<any>(null);
  const [engage, setEngage] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => {
      try {
        const r = await studentFetch(`/api/academy/programs/${programId}/test-status`);
        const d = await r.json();
        // Vérifier la réponse plutôt que la supposer : un parcours dont le test n'est pas
        // encore disponible répond 503, et l'afficher comme « 0 bonne réponse » serait faux.
        if (!r.ok) { setErreur(d?.message || "Ce test n'est pas accessible."); return; }
        setStatut(d);
      } catch { setErreur("Impossible de charger le test. Vérifiez votre connexion."); }
      finally { setChargement(false); }
    })();
  }, [programId]);

  let parcours: Program | null = null;
  try { parcours = programById(programId); } catch { parcours = null; }
  const questions = BANQUES[programId] ?? [];

  if (chargement) {
    return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!parcours || questions.length === 0 || erreur) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <p className="font-semibold">Test indisponible</p>
        <p className="text-sm text-muted-foreground mt-2">
          {erreur || "Ce parcours n'a pas de test d'admission en ligne pour le moment."}
        </p>
        <Button variant="outline" className="mt-5 gap-2" onClick={() => navigate("/academy/dashboard")}>
          <ArrowLeft className="w-4 h-4" /> Retour à mon espace
        </Button>
      </div>
    );
  }

  const accent = parcours.accent;

  // ── Déjà admis ──
  if (statut?.passed && !resultat) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <CheckCircle2 className="w-14 h-14 mx-auto mb-5" style={{ color: accent }} />
        <h1 className="text-2xl font-bold">Vous êtes déjà admis(e)</h1>
        <p className="text-muted-foreground mt-2">
          Votre admission au parcours « {parcours.title} » est active. Il n'y a pas lieu de
          repasser le test.
        </p>
        <Button className="mt-6 gap-2 border-0 text-white" style={{ background: accent }}
          onClick={() => navigate(`/academy/parcours/${programId}`)}>
          Ouvrir le parcours <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // ── Délai de reprise en cours ──
  if (statut && !statut.canRetry && statut.nextTestAllowed && !resultat) {
    const quand = new Date(statut.nextTestAllowed).toLocaleDateString("fr-FR",
      { day: "numeric", month: "long", year: "numeric" });
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <Clock className="w-14 h-14 text-amber-500 mx-auto mb-5" />
        <h1 className="text-2xl font-bold">Patientez avant de réessayer</h1>
        <p className="text-muted-foreground mt-2">
          Vous avez déjà passé ce test sans atteindre le score requis.
        </p>
        <p className="text-sm mt-3">
          Nouvelle tentative possible à partir du <strong style={{ color: accent }}>{quand}</strong>.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate("/academy/dashboard")}>
          Retour à mon espace
        </Button>
      </div>
    );
  }

  // ── Résultat ──
  if (resultat) {
    const admis = resultat.passed;
    // Le tarif vient du serveur, jamais d'une constante recopiée ici : un prix écrit à
    // deux endroits finit par différer, et c'est l'étudiant qui découvre l'écart en payant.
    const prixAttestation = Number(resultat.prixAttestation ?? 0);
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="w-28 h-28 rounded-full mx-auto mb-6 flex flex-col items-center justify-center border-4"
          style={{ borderColor: admis ? accent : "hsl(var(--destructive))" }}>
          <span className="text-3xl font-black">{resultat.score}</span>
          <span className="text-xs text-muted-foreground">sur {resultat.nbQuestions}</span>
        </div>
        <h1 className="text-2xl font-bold">
          {admis ? "Félicitations, vous êtes admis(e)" : "Score insuffisant"}
        </h1>
        <p className="text-muted-foreground mt-3">
          {admis
            ? `Le parcours « ${parcours.title} » vous est ouvert. Vos premières leçons sont disponibles dès maintenant.`
            : `Il fallait ${resultat.seuil} bonnes réponses sur ${resultat.nbQuestions}. Vous pourrez repasser le test dans une semaine.`}
        </p>
        {resultat.message && (
          <p className="text-sm text-destructive mt-4 max-w-md mx-auto">{resultat.message}</p>
        )}
        {admis && parcours.credential && (
          <p className="flex items-center justify-center gap-2 text-sm mt-5">
            <Trophy className="w-4 h-4" style={{ color: accent }} />
            Ce parcours mène au <strong>{parcours.credential}</strong>.
          </p>
        )}

        {/* ── Le tarif, annoncé au sommet de l'engagement ──

            C'est ici que le prix doit être lu, et nulle part plus tard. La personne vient
            de réussir un test et de s'entendre dire qu'elle est admise : c'est le moment
            où elle est le plus disposée à accepter une condition, et le seul où l'annonce
            reste honnête. À la semaine huit, la même somme découverte pour la première
            fois se lirait comme un piège — et un seul message de ce genre circulant sur
            WhatsApp coûte plus cher que dix inscriptions.

            La case n'est pas un verrou : l'admission est déjà accordée, la retirer à qui
            ne coche pas serait hostile. C'est un enregistrement — la date et le montant
            affiché à cet instant — parce que le tarif changera et que ce qui a été accepté
            ne doit pas changer avec lui. */}
        {admis && prixAttestation > 0 && (
          <div className="mt-7 text-left rounded-2xl border border-border/60 bg-muted/30 p-5 max-w-md mx-auto">
            <p className="text-[13.5px] leading-relaxed">
              <strong>La formation est gratuite.</strong> À la fin du parcours, l'attestation
              vérifiable — à votre nom, signée, avec son code de vérification — coûte{" "}
              <strong className="whitespace-nowrap">
                {prixAttestation.toLocaleString("fr-FR")} F CFA
              </strong>. Vous ne réglez rien avant de l'avoir terminé.
            </p>
            <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
              <input type="checkbox" className="mt-0.5 w-4 h-4 shrink-0 accent-primary"
                checked={engage} onChange={e => setEngage(e.target.checked)} />
              <span className="text-[13px] text-muted-foreground leading-relaxed">
                Je m'engage à suivre {parcours.lessonsPerWeek === 1 ? "une leçon" : `${parcours.lessonsPerWeek} leçons`} par
                semaine, et je sais que l'attestation coûte {prixAttestation.toLocaleString("fr-FR")} F CFA à la fin.
              </span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Button className="gap-2 border-0 text-white disabled:opacity-50"
            style={{ background: accent }}
            disabled={admis && prixAttestation > 0 && !engage}
            onClick={async () => {
              if (admis && prixAttestation > 0 && engage) {
                // L'enregistrement ne doit pas retenir l'étudiant : s'il échoue, on
                // continue. Le rappel de mi-parcours reste là pour rattraper.
                await studentFetch(`/api/academy/programs/${programId}/engagement`, { method: "POST" })
                  .catch(() => {});
              }
              navigate(admis ? `/academy/parcours/${programId}` : "/academy/dashboard");
            }}>
            {admis ? "Commencer le parcours" : "Retour à mon espace"} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Le test ──
  const q = questions[idx];
  const choisie = reponses[idx];
  const repondues = Object.keys(reponses).length;

  async function envoyer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const tableau = questions.map((_, i) => (reponses[i] ?? -1));
      const r = await studentFetch(`/api/academy/programs/${programId}/submit-test`, {
        method: "POST", body: JSON.stringify({ answers: tableau }),
      });
      const d = await r.json();
      // Le serveur explique pourquoi il refuse — déjà admis, délai non écoulé, test
      // indisponible. Afficher ce message vaut mieux qu'une erreur générique.
      if (!r.ok && typeof d?.score !== "number") { setErreur(d?.message || "Envoi impossible."); return; }
      setResultat(d);
    } catch { setErreur("Envoi impossible. Vérifiez votre connexion et réessayez."); }
    finally { setEnvoi(false); }
  }

  return (
    <div className="max-w-2xl mx-auto py-10" translate="no">
      <SEO title={`Test d'admission — ${parcours.title}`} description={parcours.subtitle} />

      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: accent }}>
          Test d'admission
        </p>
        <h1 className="text-xl font-bold mt-1">{parcours.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {statut?.nbQuestions ?? questions.length} questions · {statut?.seuil ?? "—"} bonnes
          réponses requises · aucune pénalité en cas d'erreur
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium">Question {idx + 1} / {questions.length}</span>
          <span className="text-muted-foreground">{repondues} répondues</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((idx + 1) / questions.length) * 100}%`, background: accent }} />
        </div>
        <div className="flex gap-1 mt-2 flex-wrap">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`Question ${i + 1}`}
              className="w-5 h-1.5 rounded-full transition-colors"
              style={{
                background: reponses[i] !== undefined ? accent
                  : i === idx ? `${accent}66` : "hsl(var(--muted))",
              }} />
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <p className="text-[11px] font-medium text-muted-foreground mb-2">{q.domaine}</p>
        <p className="font-semibold leading-snug mb-5">{q.q}</p>
        <div className="space-y-2">
          {q.opts.map((o, i) => (
            // La clé inclut l'index de question : sans elle, React réutilise les nœuds d'une
            // question à l'autre et les options restent figées sur celles de la première.
            <button key={`${idx}-${i}`}
              onClick={() => setReponses({ ...reponses, [idx]: i })}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                choisie === i ? "border-transparent" : "border-border/60 hover:bg-muted/50"}`}
              style={choisie === i ? { background: `${accent}1A`, borderColor: accent } : undefined}>
              <span className="font-semibold mr-2" style={{ color: accent }}>
                {["A", "B", "C", "D"][i]}.
              </span>
              {o}
            </button>
          ))}
        </div>
      </div>

      {erreur && <p className="text-sm text-destructive mt-4 text-center">{erreur}</p>}

      <div className="flex items-center justify-between gap-3 mt-6">
        <Button variant="outline" className="gap-1.5" disabled={idx === 0}
          onClick={() => setIdx(i => Math.max(0, i - 1))}>
          <ChevronLeft className="w-4 h-4" /> Précédente
        </Button>

        {idx < questions.length - 1 ? (
          <Button className="gap-1.5 border-0 text-white" style={{ background: accent }}
            onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))}>
            Suivante <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button className="gap-1.5 border-0 text-white" style={{ background: accent }}
            disabled={envoi} onClick={envoyer}>
            {envoi ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Terminer et envoyer
          </Button>
        )}
      </div>

      {repondues < questions.length && idx === questions.length - 1 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          {questions.length - repondues} question{questions.length - repondues > 1 ? "s" : ""} sans
          réponse. Aucune pénalité : répondez au jugé plutôt que de laisser vide.
        </p>
      )}
    </div>
  );
}
