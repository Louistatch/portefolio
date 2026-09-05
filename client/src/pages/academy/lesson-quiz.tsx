import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Loader2, ArrowRight, ArrowLeft, Check, Clock, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";
import { isStudentLoggedIn, studentFetch } from "@/lib/student";
import { programOf } from "@shared/programs";
import { dureeQuizSecondes } from "@shared/chronometrage";
import { useChronoEpreuve, type FenetreChrono } from "@/lib/chrono-epreuve";

/**
 * Le quiz d'une leçon (« à vous de jouer »), à part de la lecture.
 *
 * Contrairement au test d'admission, ce quiz ne se passe qu'une fois dans la vie de
 * l'étudiant : démarré, l'essai est consommé, qu'il soit remis à temps, en retard, ou
 * jamais remis. La leçon reste lisible normalement dans la salle de classe ; seuls ses
 * exercices notés vivent ici, à l'écart du reste, pour que le compte à rebours porte sur
 * une tâche bornée et non sur une lecture qu'on doit pouvoir prendre à son rythme.
 */

type Exercice = {
  id?: string; kind?: "choice" | "number" | "text"; title?: string; prompt?: string;
  opts?: string[]; hint?: string; unit?: string;
};

/** Cadre commun des écrans d'état, dans le même registre que l'épreuve d'admission. */
function EcranAdministratif({ accent, label, children }: { accent: string; label: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-8 py-10 sm:py-16">
      <div className="border-t-2 pt-6" style={{ borderColor: accent }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>{label}</p>
        {children}
      </div>
    </div>
  );
}

export default function LessonQuiz() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/academy/quiz/:courseId/:lessonId");
  const courseId = params?.courseId ?? "";
  const lessonId = params?.lessonId ?? "";

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [statut, setStatut] = useState<any>(null);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [accent, setAccent] = useState("#0d9488");
  const [titreLecon, setTitreLecon] = useState("");
  const [fenetre, setFenetre] = useState<FenetreChrono | null>(null);
  const [demarrage, setDemarrage] = useState(false);

  const [idx, setIdx] = useState(0);
  const [reponses, setReponses] = useState<Record<string, any>>({});
  const [showHint, setShowHint] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<any>(null);

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => {
      try {
        const [rStatut, rCours] = await Promise.all([
          studentFetch(`/api/academy/lesson-quiz/${lessonId}`),
          fetch(`/api/academy/courses/${courseId}`),
        ]);
        const dStatut = await rStatut.json();
        if (!rStatut.ok) { setErreur(dStatut?.message || "Ce quiz n'est pas accessible."); return; }
        if (!dStatut.hasQuiz) { setErreur("Cette leçon ne contient aucun exercice noté."); return; }
        setStatut(dStatut);
        if (dStatut.status === "in_progress") {
          setFenetre({ testStartedAt: dStatut.testStartedAt, expiresAt: dStatut.expiresAt, durationSeconds: dStatut.durationSeconds });
        }

        const dCours = await rCours.json().catch(() => null);
        const lecon = dCours?.lessons?.find((l: any) => String(l.id) === String(lessonId));
        setTitreLecon(lecon?.title || "");
        const prog = programOf(dCours?.code || "");
        if (prog) setAccent(prog.accent);
        const cells = (lecon?.content?.cells || []).filter((c: any) => c.type === "exercise");
        setExercices(cells.map((c: any, i: number) => ({ ...c, id: c.id || `ex${i + 1}` })));
      } catch { setErreur("Impossible de charger le quiz. Vérifiez votre connexion."); }
      finally { setChargement(false); }
    })();
  }, [courseId, lessonId]);

  async function demarrerQuiz() {
    setDemarrage(true);
    setErreur(null);
    try {
      const r = await studentFetch(`/api/academy/lesson-quiz/${lessonId}/start`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) { setErreur(d?.message || "Impossible de démarrer le quiz."); return; }
      setFenetre({ testStartedAt: d.testStartedAt, expiresAt: d.expiresAt, durationSeconds: d.durationSeconds });
    } catch { setErreur("Impossible de démarrer le quiz. Vérifiez votre connexion."); }
    finally { setDemarrage(false); }
  }

  async function remettre() {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await studentFetch("/api/academy/complete-lesson", {
        method: "POST", body: JSON.stringify({ course_id: Number(courseId), lesson_id: Number(lessonId), answers: reponses }),
      });
      const d = await r.json();
      if (!r.ok && !d?.horsDelai) { setErreur(d?.message || "Envoi impossible."); return; }
      setResultat(d);
      setFenetre(null);
    } catch { setErreur("Envoi impossible. Vérifiez votre connexion et réessayez."); }
    finally { setEnvoi(false); }
  }

  // Appelé une seule fois, exactement quand le temps s'épuise : ce qui a déjà été répondu
  // part, la note sera 0 quoi qu'il arrive — c'est le serveur qui tranche, pas cet appel.
  const chrono = useChronoEpreuve(fenetre, () => { if (!envoi) remettre(); });

  if (chargement) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-8 py-24">
        <div className="h-0.5 w-24 bg-muted overflow-hidden" role="status" aria-label="Chargement">
          <div className="h-full w-1/3 animate-pulse" style={{ background: accent }} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Chargement du quiz…</p>
      </div>
    );
  }

  if (erreur && !statut) {
    return (
      <EcranAdministratif accent="#7f1d1d" label="Quiz indisponible">
        <p className="mt-4 leading-7 text-muted-foreground">{erreur}</p>
        <Button variant="outline" className="mt-6 gap-2 min-h-11 rounded-none"
          onClick={() => navigate(`/academy/classroom/${courseId}`)}>
          <ArrowLeft className="w-4 h-4" /> Retour à la leçon
        </Button>
      </EcranAdministratif>
    );
  }

  // ── Déjà remis (ou clos par le balayage d'expiration) ──
  const fini = resultat || statut?.status === "finished";
  if (fini) {
    const d = resultat || statut;
    const horsDelai = !!d.horsDelai;
    return (
      <EcranAdministratif accent={horsDelai ? "#b45309" : accent} label="Résultat du quiz">
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{titreLecon}</h1>
        <p className="mt-6 font-mono text-5xl font-semibold tabular-nums tracking-tight">
          {d.lessonScore ?? d.score ?? 0}<span className="text-xl text-muted-foreground"> / {d.lessonMax ?? d.maxScore ?? 10}</span>
        </p>
        <p className="mt-4 leading-7 text-muted-foreground">
          {horsDelai
            ? "Le temps imparti était écoulé au moment de la remise : la note enregistrée est 0, quelles qu'aient été les réponses données."
            : "Ce quiz ne peut être repassé : votre note est définitive."}
        </p>
        <Button className="mt-8 gap-2 min-h-11 rounded-none border-0 text-white"
          style={{ background: accent }} onClick={() => navigate(`/academy/classroom/${courseId}`)}>
          Retour à la leçon <ArrowRight className="w-4 h-4" />
        </Button>
      </EcranAdministratif>
    );
  }

  // ── Avant de commencer ──
  if (!fenetre) {
    const duree = statut?.durationSeconds ?? dureeQuizSecondes(exercices.length);
    const minutes = Math.round(duree / 60);
    return (
      <EcranAdministratif accent={accent} label="À vous de jouer">
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{titreLecon}</h1>
        <dl className="mt-6 max-w-md border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-muted-foreground">Exercices notés</dt>
            <dd className="font-mono tabular-nums">{statut?.nbExercices ?? exercices.length}</dd>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-muted-foreground">Temps alloué</dt>
            <dd className="font-mono tabular-nums">{minutes} minutes</dd>
          </div>
        </dl>
        <p className="mt-6 max-w-2xl leading-7 text-muted-foreground">
          Ce quiz ne se passe qu'une seule fois : une fois démarré, il n'y a pas de seconde
          tentative. S'il n'est pas remis dans le temps imparti, la note enregistrée est 0 —
          un rappel par email part dix minutes avant l'échéance si vous n'avez pas terminé.
          Démarrez uniquement quand vous êtes prêt(e) à aller jusqu'au bout.
        </p>
        {erreur && <p className="mt-4 text-sm text-destructive">{erreur}</p>}
        <Button className="mt-8 gap-2 min-h-11 rounded-none border-0 text-white disabled:opacity-50"
          style={{ background: accent }} disabled={demarrage} onClick={demarrerQuiz}>
          {demarrage ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Commencer le quiz <ArrowRight className="w-4 h-4" />
        </Button>
      </EcranAdministratif>
    );
  }

  // ── Le quiz ──
  const verrouille = !!chrono?.expire || envoi;
  const ex = exercices[idx];
  const exId = ex?.id || `ex${idx + 1}`;
  const choisie = reponses[exId];
  const repondues = Object.keys(reponses).length;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-8 py-8 sm:py-12" translate="no">
      <SEO title={`Quiz — ${titreLecon}`} description="Exercices notés, chronométrés." />

      <header className="border-t-2 pt-6 flex items-start justify-between gap-4" style={{ borderColor: accent }}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>À vous de jouer</p>
          <h1 className="mt-2 text-xl font-semibold leading-tight">{titreLecon}</h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            <span className="font-mono tabular-nums">{exercices.length}</span> exercices · essai unique
          </p>
        </div>
        {chrono && (
          <div className={`shrink-0 flex items-center gap-1.5 border px-3 py-1.5 font-mono text-sm tabular-nums transition-colors ${
            chrono.alerte ? "border-destructive text-destructive" : "border-border text-muted-foreground"
          }`}>
            <Clock className={`w-3.5 h-3.5 ${chrono.alerte && !chrono.expire ? "animate-pulse" : ""}`} />
            {chrono.affichage}
          </div>
        )}
      </header>

      {chrono?.expire && (
        <p className="mt-4 text-sm font-medium" style={{ color: accent }}>
          Temps écoulé — votre quiz a été transmis automatiquement.
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
        <aside className="order-last lg:order-first border-t border-border pt-6 lg:border-t-0 lg:pt-0">
          <p className="font-mono text-xs tabular-nums text-muted-foreground">{repondues} répondu{repondues > 1 ? "s" : ""} / {exercices.length}</p>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {exercices.map((e, i) => {
              const courant = i === idx;
              const faite = reponses[e.id || `ex${i + 1}`] !== undefined;
              return (
                <button key={i} onClick={() => { setIdx(i); setShowHint(false); }} disabled={verrouille}
                  aria-current={courant ? "step" : undefined}
                  className={`flex min-h-11 items-center justify-center border font-mono text-xs tabular-nums transition-colors disabled:opacity-50 ${
                    courant ? "border-2 font-bold" : faite ? "border-border bg-muted" : "border-dashed border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                  style={courant ? { borderColor: accent } : undefined}>
                  {faite && !courant ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </button>
              );
            })}
          </div>
        </aside>

        <div>
          <p className="font-mono text-sm tabular-nums">Exercice {idx + 1} sur {exercices.length}</p>
          {ex?.title && <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{ex.title}</p>}
          <p className="mt-3 text-xl sm:text-2xl font-semibold leading-snug tracking-tight">{ex?.prompt}</p>

          <div className="mt-8">
            {ex?.kind === "choice" ? (
              <div className="flex flex-col gap-2">
                {(ex.opts || []).map((opt, i) => {
                  const prise = Number(choisie) === i;
                  return (
                    <button key={`${idx}-${i}`} disabled={verrouille} onClick={() => setReponses({ ...reponses, [exId]: i })}
                      aria-pressed={prise}
                      className={`flex min-h-14 items-start gap-4 border px-4 py-3 text-left text-sm leading-6 transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                        prise ? "border-foreground bg-muted font-medium" : "border-border hover:bg-muted/50"
                      }`}>
                      <span className="flex w-6 h-6 shrink-0 items-center justify-center border font-mono text-xs"
                        style={prise ? { borderColor: accent, color: accent } : undefined}>{["A", "B", "C", "D"][i]}</span>
                      <span>{opt}</span>
                      {prise && <Check className="ml-auto mt-0.5 w-4 h-4 shrink-0" style={{ color: accent }} />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input type={ex?.kind === "number" ? "number" : "text"} inputMode={ex?.kind === "number" ? "decimal" : undefined}
                step="any" disabled={verrouille} value={choisie ?? ""} onChange={e => setReponses({ ...reponses, [exId]: e.target.value })}
                placeholder={ex?.kind === "number" ? "Votre résultat" : "Votre réponse"}
                className="w-full min-h-14 px-4 py-3 border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:border-foreground disabled:opacity-50" />
            )}
            {ex?.unit && <p className="mt-2 text-xs text-muted-foreground">Unité attendue : {ex.unit}</p>}
          </div>

          {ex?.hint && (
            showHint
              ? <p className="mt-4 text-xs text-muted-foreground bg-muted/50 p-3 flex gap-2"><Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />{ex.hint}</p>
              : <button onClick={() => setShowHint(true)} disabled={verrouille} className="mt-4 text-xs hover:underline flex items-center gap-1 disabled:opacity-50" style={{ color: accent }}>
                  <Lightbulb className="w-3 h-3" /> Un indice
                </button>
          )}

          {erreur && <p className="mt-4 text-sm text-destructive">{erreur}</p>}

          <div className="mt-10 border-t border-border pt-5 flex items-center justify-between gap-3">
            <Button variant="outline" className="gap-1.5 min-h-11 rounded-none" disabled={idx === 0 || verrouille}
              onClick={() => { setIdx(i => Math.max(0, i - 1)); setShowHint(false); }}>
              <ArrowLeft className="w-4 h-4" /> Précédent
            </Button>
            {idx < exercices.length - 1 && !chrono?.expire ? (
              <Button className="gap-1.5 min-h-11 rounded-none border-0 text-white" style={{ background: accent }}
                onClick={() => { setIdx(i => Math.min(exercices.length - 1, i + 1)); setShowHint(false); }}>
                Suivant <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button className="gap-1.5 min-h-11 rounded-none border-0 text-white" style={{ background: accent }}
                disabled={envoi} onClick={remettre}>
                {envoi ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Remettre le quiz
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
