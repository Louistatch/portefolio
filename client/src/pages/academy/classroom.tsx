import { useEffect, useState, memo } from "react";
import { useLocation, useRoute } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, CheckCircle2, PlayCircle, Terminal,
  FileCode2, Loader2, Trophy, Lock, X, BookOpen, Star, Info, Lightbulb,
  AlertTriangle, ExternalLink, MapPin, BookMarked, Image as ImageIcon, PenLine,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn } from "@/lib/student";
import DOMPurify from "dompurify";

interface Cell {
  type: string; content?: string; lang?: string; code?: string; output?: string; variant?: string;
  title?: string; url?: string; provider?: string; desc?: string; question?: string; opts?: string[];
  ans?: number; svg?: string; caption?: string;
  src?: string;                       // cellule image : chemin interne d'une capture
  // Cellules d'exercice (le corrigé est retiré côté serveur avant envoi)
  id?: string; kind?: "choice" | "number" | "text"; prompt?: string; unit?: string;
  hint?: string; explain?: string; placeholder?: string;
}
interface Lesson { id: number; title: string; content: { cells: Cell[] }; points: number; order_index: number; }
interface Course { id: number; code: string; title: string; description: string; tools: string[]; lessons: Lesson[]; }


function QuizCell({ cell }: { cell: any }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === cell.ans;
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium"><Info className="w-4 h-4 text-primary" /> Question rapide</div>
      <p className="text-sm mb-3">{cell.question}</p>
      <div className="space-y-2">
        {(cell.opts || []).map((opt: string, i: number) => {
          const isPicked = picked === i;
          const show = picked !== null;
          const isAns = i === cell.ans;
          return (
            <button key={i} onClick={() => setPicked(i)} disabled={picked !== null}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                show && isAns ? "border-primary bg-primary/10 text-primary" :
                show && isPicked && !isAns ? "border-destructive bg-destructive/10 text-destructive" :
                isPicked ? "border-primary bg-primary/10" :
                "border-border hover:border-primary/40"
              }`}>
              <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className={`text-sm mt-3 font-medium ${correct ? "text-primary" : "text-amber-600 dark:text-amber-400"}`}>
          {correct ? "✓ Correct !" : `La bonne réponse est ${String.fromCharCode(65 + cell.ans)}.`}
        </p>
      )}
    </div>
  );
}

const MarkdownCell = memo(function MarkdownCell({ content }: { content: string }) {
  return (
    <div className="px-1 py-1 text-sm leading-relaxed">
      {(content || "").split("\n").map((line, li) => {
        if (line.startsWith("### ")) return <h4 key={li} className="font-semibold text-[15px] mt-4 mb-1.5">{line.slice(4)}</h4>;
        if (line.startsWith("## ")) return <h3 key={li} className="font-bold text-lg mt-3 mb-2">{line.slice(3)}</h3>;
        if (line.startsWith("| ")) return <div key={li} className="font-mono text-xs bg-muted/60 px-3 py-1 my-0.5 rounded overflow-x-auto whitespace-nowrap">{line.replace(/\|/g, " | ").replace(/---/g, "—")}</div>;
        if (line.match(/^\d+\. /)) return <div key={li} className="ml-3 text-muted-foreground my-1">{line.replace(/\*\*(.+?)\*\*/g, "$1")}</div>;
        if (line.startsWith("- ")) return <div key={li} className="ml-3 text-muted-foreground my-0.5">• {line.slice(2).replace(/\*\*(.+?)\*\*/g, "$1")}</div>;
        if (line.startsWith("```")) return null;
        if (line.trim() === "") return <div key={li} className="h-1" />;
        return <p key={li} className="text-muted-foreground my-1" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(line.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>").replace(/`(.+?)`/g, "<code class='font-mono text-xs bg-muted px-1.5 py-0.5 rounded'>$1</code>")) }} />;
      })}
    </div>
  );
});

const FigureCell = memo(function FigureCell({ title, svg, caption }: { title?: string; svg?: string; caption?: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      {title && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/30">
          <ImageIcon className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">{title}</span>
        </div>
      )}
      <div className="p-4 bg-white dark:bg-slate-900/40 flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svg || "", { USE_PROFILES: { svg: true, svgFilters: true } }) }} />
      {caption && (
        <div className="px-4 py-2.5 bg-muted/20 border-t border-border/50">
          <p className="text-xs text-muted-foreground leading-relaxed">{caption}</p>
        </div>
      )}
    </div>
  );
});

// ── Capture d'écran ──
// Les leçons Kobo s'appuient sur de vraies captures de l'outil : sans elles, « cliquez sur
// Déployer » n'aide pas quelqu'un qui découvre l'interface. Les fichiers sont servis en
// statique depuis client/public ; on n'accepte qu'un chemin interne pour qu'un contenu de
// leçon ne puisse pas faire charger une image tierce.
const ImageCell = memo(function ImageCell({ src, title, caption }: { src?: string; title?: string; caption?: string }) {
  const safe = typeof src === "string" && src.startsWith("/") && !src.startsWith("//") ? src : null;
  if (!safe) return null;
  return (
    <figure className="bg-card rounded-2xl border border-border/50 overflow-hidden m-0">
      {title && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/30">
          <ImageIcon className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">{title}</span>
        </div>
      )}
      <a href={safe} target="_blank" rel="noopener noreferrer" className="block bg-slate-50 dark:bg-slate-900/40">
        <img src={safe} alt={caption || title || "Capture d'écran"} loading="lazy" decoding="async"
          className="w-full h-auto max-h-[520px] object-contain mx-auto" />
      </a>
      {caption && (
        <figcaption className="px-4 py-2.5 bg-muted/20 border-t border-border/50">
          <p className="text-xs text-muted-foreground leading-relaxed">{caption}</p>
        </figcaption>
      )}
    </figure>
  );
});

// ── Exercice noté ──
// L'énoncé demande de produire quelque chose (un calcul, une décision, une écriture) ; le
// corrigé n'est pas dans la page — il reste en base et c'est le serveur qui tranche.
function ExerciseCell({ exId, cell, value, result, locked, onChange }: {
  exId: string; cell: any; value: any;
  result?: { correct: boolean; explain: string | null };
  locked: boolean; onChange: (v: any) => void;
}) {
  const [showHint, setShowHint] = useState(false);
  const state = result ? (result.correct ? "correct" : "wrong") : "todo";
  const border = state === "correct" ? "border-primary/50" : state === "wrong" ? "border-destructive/40" : "border-amber-500/40";

  return (
    <div className={`bg-card rounded-2xl border ${border} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-amber-500/5">
        <div className="flex items-center gap-2">
          <PenLine className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium">À vous de jouer{cell.title ? ` — ${cell.title}` : ""}</span>
        </div>
        {state === "correct" && <span className="text-[10px] font-semibold text-primary flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Juste</span>}
        {state === "wrong" && <span className="text-[10px] font-semibold text-destructive flex items-center gap-1"><X className="w-3 h-3" /> À revoir</span>}
      </div>

      <div className="p-4 space-y-3">
        <p className="text-sm leading-relaxed">{cell.prompt}</p>

        {cell.kind === "choice" ? (
          <div className="space-y-2">
            {(cell.opts || []).map((opt: string, i: number) => (
              <button key={i} disabled={locked} onClick={() => onChange(i)}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                  Number(value) === i ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                } ${locked ? "opacity-70 cursor-default" : ""}`}>
                <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
              </button>
            ))}
          </div>
        ) : (
          <input
            type={cell.kind === "number" ? "number" : "text"}
            inputMode={cell.kind === "number" ? "decimal" : undefined}
            step="any"
            disabled={locked}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={cell.placeholder || (cell.kind === "number" ? "Votre résultat" : "Votre réponse")}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-70"
          />
        )}

        {cell.unit && <p className="text-xs text-muted-foreground">Unité attendue : {cell.unit}</p>}

        {/* Leçon revue après coup : les réponses saisies ne sont pas rechargées. */}
        {locked && !result && (
          <p className="text-xs text-muted-foreground italic">Leçon déjà validée — cet exercice a été corrigé.</p>
        )}

        {cell.hint && !result && (
          showHint
            ? <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 flex gap-2"><Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />{cell.hint}</p>
            : <button onClick={() => setShowHint(true)} className="text-xs text-primary hover:underline flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Un indice</button>
        )}

        {/* La correction n'apparaît qu'après passage par le serveur */}
        {result?.explain && (
          <div className={`text-xs rounded-xl p-3 leading-relaxed ${result.correct ? "bg-primary/5 text-foreground/80" : "bg-destructive/5 text-foreground/80"}`}>
            <span className="font-semibold">{result.correct ? "Pourquoi c'est juste : " : "Correction : "}</span>
            {result.explain}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcademyClassroom() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/academy/classroom/:id");
  const courseId = params?.id && /^\d+$/.test(params.id) ? Number(params.id) : null;

  const [course, setCourse] = useState<Course | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [activeLesson, setActiveLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [ranCells, setRanCells] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [testPassed, setTestPassed] = useState(false);
  const [schedule, setSchedule] = useState<Record<number, any>>({});
  // Planning complet, tous cours confondus : en semaine N, une leçon est ouverte dans
  // chaque cours. Sans cette liste, la salle ne connaît que son propre cours et ne peut
  // pas proposer les autres leçons de la semaine.
  const [weekPlan, setWeekPlan] = useState<any[]>([]);
  const [completeError, setCompleteError] = useState<string | null>(null);
  // Réponses saisies pour les exercices de la leçon courante, et correction renvoyée par le serveur.
  const [exAnswers, setExAnswers] = useState<Record<string, any>>({});
  const [exResults, setExResults] = useState<Record<string, { correct: boolean; explain: string | null }>>({});
  const [lessonScore, setLessonScore] = useState<{ score: number; max: number } | null>(null);

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    if (!courseId) { setCourse(null); setLoading(false); return; }
    setLoadError(false);
    (async () => {
      try {
        const [c, enr, g, ts, sched] = await Promise.all([
          fetch(`/api/academy/courses/${courseId}`).then(r => r.json()),
          studentFetch("/api/academy/my-enrollments").then(r => r.json()),
          studentFetch("/api/academy/my-grades").then(r => r.json()),
          studentFetch("/api/academy/test-status").then(r => r.json()).catch(() => null),
          studentFetch("/api/academy/lesson-schedule").then(r => r.json()).catch(() => []),
        ]);
        // Le cours est valide seulement s'il a un id
        if (!c || c.message || !c.id) { setCourse(null); setLoading(false); return; }
        // Normaliser le content de chaque leçon (peut être string ou objet selon Supabase)
        const lessons = (c.lessons || []).map((l: any) => {
          let content = l.content;
          if (typeof content === "string") {
            try { content = JSON.parse(content); } catch { content = { cells: [] }; }
          }
          if (!content || !Array.isArray(content.cells)) content = { cells: [] };
          return { ...l, content };
        });
        setCourse({ ...c, lessons });
        const myEnr = (enr || []).find((e: any) => e.course_id === courseId);
        setEnrolled(!!myEnr);
        setProgress(myEnr?.progress || 0);
        setTestPassed(ts?.passed ?? false);
        const done = new Set<number>((g.grades || []).filter((gr: any) => gr.course_id === courseId && gr.lesson_id).map((gr: any) => gr.lesson_id as number));
        setCompletedLessons(done);
        // Map du planning hebdomadaire par lesson_id
        const schedList = Array.isArray(sched) ? sched : [];
        const schedMap: Record<number, any> = {};
        schedList.forEach((s: any) => { schedMap[s.lesson_id] = s; });
        setSchedule(schedMap);
        setWeekPlan(schedList);

        // Lien profond « ?lesson=<id> » : ouvrir la leçon demandée plutôt que la première
        // du cours, qui est souvent déjà terminée.
        const wanted = Number(new URLSearchParams(window.location.search).get("lesson"));
        if (wanted) {
          const idx = lessons.findIndex((l: any) => l.id === wanted);
          if (idx >= 0) setActiveLesson(idx);
        }
      } catch (e) { setCourse(null); setLoadError(true); } finally { setLoading(false); }
    })();
  }, [courseId]);

  function runCell(key: string) { setRanCells(prev => new Set(prev).add(key)); }

  // Changer de leçon repart d'une copie vierge : réponses, correction et message d'erreur.
  function goToLesson(index: number) {
    setActiveLesson(index);
    setCompleteError(null);
    setExAnswers({});
    setExResults({});
    setLessonScore(null);
  }

  async function completeLesson() {
    if (!course || !courseId) return;
    const lesson = course.lessons[activeLesson];
    setSubmitting(true);
    setCompleteError(null);
    try {
      const res = await studentFetch("/api/academy/complete-lesson", {
        method: "POST",
        body: JSON.stringify({ course_id: courseId, lesson_id: lesson.id, answers: exAnswers }),
      });
      const data = await res.json();
      // Exercices ratés : la correction s'affiche exercice par exercice, rien n'est enregistré.
      if (res.status === 422 && data?.exercisesFailed) {
        setExResults(Object.fromEntries((data.exerciseResults || []).map((r: any) => [r.id, { correct: r.correct, explain: r.explain }])));
        setCompleteError(data.message || "Certaines réponses sont à revoir.");
        return;
      }
      // Le serveur peut refuser (leçon verrouillée, fenêtre dépassée, admission expirée, email non
      // vérifié) : sans ce contrôle la leçon s'affichait comme complétée alors que rien n'était
      // enregistré, et la barre de progression recevait un pourcentage indéfini.
      if (!res.ok) {
        setCompleteError(data?.message || "Impossible d'enregistrer cette leçon.");
        if (data?.locked || data?.missed) {
          setSchedule(prev => ({
            ...prev,
            [lesson.id]: { ...(prev[lesson.id] || {}), status: data.missed ? "missed" : "locked", unlock_at: data.unlockAt ?? prev[lesson.id]?.unlock_at },
          }));
        }
        return;
      }
      if (typeof data.progress === "number") setProgress(data.progress);
      if (data.exerciseResults) {
        setExResults(Object.fromEntries(data.exerciseResults.map((r: any) => [r.id, { correct: r.correct, explain: r.explain }])));
      }
      if (typeof data.lessonScore === "number") setLessonScore({ score: data.lessonScore, max: data.lessonMax });
      setCompletedLessons(prev => new Set(prev).add(lesson.id));
    } catch (e: any) {
      setCompleteError("Erreur réseau. Réessayez.");
    } finally { setSubmitting(false); }
  }

  async function requestAttestation() {
    if (!courseId) return;
    setSubmitting(true);
    try {
      const res = await studentFetch("/api/academy/attestation", {
        method: "POST", body: JSON.stringify({ course_id: courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(`Demande d'attestation envoyée ! N° ${data.certificate_no} — Score final : ${data.final_score}%`);
      navigate("/academy/dashboard");
    } catch (e: any) { alert(e.message); } finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!course) return (
    <div className="max-w-md mx-auto text-center py-32 px-6">
      <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">{loadError ? "Erreur de chargement" : "Cours introuvable"}</h2>
      <p className="text-muted-foreground mb-6">{loadError ? "Une erreur réseau est survenue. Réessayez." : "Ce cours n'existe pas ou n'est plus disponible."}</p>
      {loadError
        ? <Button onClick={() => window.location.reload()}>Réessayer</Button>
        : <Button onClick={() => navigate("/academy/dashboard")}>Retour au tableau de bord</Button>}
    </div>
  );

  // Accès refusé si non inscrit ET test non réussi
  if (!enrolled && !testPassed) return (
    <div className="max-w-md mx-auto text-center py-32 px-6">
      <Lock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Accès verrouillé</h2>
      <p className="text-muted-foreground mb-6">Vous devez réussir le test d'aptitude (21/30) pour accéder à ce cours.</p>
      <Button onClick={() => navigate("/elearning")} className="gap-2"><Trophy className="w-4 h-4" /> Passer le test</Button>
    </div>
  );

  // Cours sans contenu (leçons non chargées)
  if (!course.lessons || course.lessons.length === 0) return (
    <div className="max-w-md mx-auto text-center py-32 px-6">
      <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Contenu en préparation</h2>
      <p className="text-muted-foreground mb-6">Les leçons de ce cours ne sont pas encore disponibles. Revenez bientôt !</p>
      <Button onClick={() => navigate("/academy/dashboard")}>Retour au tableau de bord</Button>
    </div>
  );

  const lesson = course.lessons[activeLesson];
  const lessonSched = lesson ? schedule[lesson.id] : null;
  const lessonDone = lesson ? completedLessons.has(lesson.id) : false;
  const lessonStatus = lessonDone ? "completed" : (lessonSched?.status || (testPassed && activeLesson === 0 ? "available" : "locked"));
  const lessonLocked = lessonStatus === "locked";
  const lessonMissed = lessonStatus === "missed";
  const cells = lesson?.content?.cells || [];
  const codeCells = cells.filter(c => c.type === "code");
  const allCodeRan = codeCells.every((_, i) => ranCells.has(`${activeLesson}-code-${i}`));
  // Exercices de la leçon : identifiants dans le même ordre que le rendu, pour savoir
  // si l'étudiant a bien tout renseigné avant de soumettre sa copie.
  const exerciseIds = cells.reduce<string[]>((acc, c, ci) => {
    if (c.type !== "exercise") return acc;
    acc.push((c as any).id || `ex${cells.slice(0, ci).filter(x => x.type === "exercise").length + 1}`);
    return acc;
  }, []);
  const hasExercises = exerciseIds.length > 0;
  const answeredCount = exerciseIds.filter(id => exAnswers[id] !== undefined && exAnswers[id] !== "").length;
  const allAnswered = answeredCount === exerciseIds.length;
  const isLessonDone = completedLessons.has(lesson?.id);
  const allLessonsDone = course.lessons.every(l => completedLessons.has(l.id));

  // La leçon suivante DANS ce cours n'est ouverte que si la semaine en cours l'a débloquée.
  const nextInCourse = course.lessons[activeLesson + 1];
  const nextInCourseSched = nextInCourse ? schedule[nextInCourse.id] : null;
  const nextInCourseOpen = !!nextInCourse &&
    (completedLessons.has(nextInCourse.id) || nextInCourseSched?.status === "available");

  // Les leçons encore ouvertes cette semaine, tous cours confondus. Le planning avance en
  // parallèle : quand la suite de ce cours attend la semaine prochaine, l'étudiant a
  // presque toujours une autre leçon disponible ailleurs — c'est là qu'il faut l'emmener.
  const openElsewhere = weekPlan
    .filter((sp: any) => sp.status === "available"
      && !completedLessons.has(sp.lesson_id)
      && sp.lesson_id !== lesson?.id)
    .sort((a: any, b: any) => (a.sms_courses?.code || "").localeCompare(b.sms_courses?.code || ""));

  return (
    <div className="flex min-h-screen">
      <SEO title={`${course.title} — Salle de cours`} description={course.description} />

      {/* Sidebar — liste des leçons */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border/50 bg-muted/20 pt-6 px-4">
        <button onClick={() => navigate("/academy/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-5 px-2">
          <ChevronLeft className="w-4 h-4" /> Tableau de bord
        </button>
        <div className="text-xs font-mono text-primary mb-1 px-2">{course.code}</div>
        <div className="text-sm font-semibold mb-4 px-2 leading-snug">{course.title}</div>
        <div className="h-1.5 bg-muted rounded-full mb-1 mx-2"><div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} /></div>
        <div className="text-xs text-muted-foreground mb-4 px-2">{progress}% complété</div>
        <nav className="space-y-1">
          {course.lessons.map((l, i) => {
            const done = completedLessons.has(l.id);
            const sp = schedule[l.id];
            const st = sp?.status || (done ? "completed" : "locked");
            const isLocked = !done && st === "locked";
            const isMissed = !done && st === "missed";
            return (
              <button key={l.id} onClick={() => goToLesson(i)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 ${activeLesson === i ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  : isMissed ? <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                  : isLocked ? <Lock className="w-3.5 h-3.5 shrink-0 opacity-50" />
                  : <span className="w-3.5 h-3.5 rounded-full border border-current shrink-0" />}
                <span className="truncate flex-1">{i + 1}. {l.title}</span>
                {sp && <span className="text-[9px] text-muted-foreground shrink-0">S{sp.week_index}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main — notebook */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <span className="font-mono">{course.code}</span><ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Leçon {activeLesson + 1}</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">{lesson?.title}</h1>
        <p className="text-sm text-muted-foreground mb-4">{lesson?.points} points · {isLessonDone ? "Complétée ✓" : "Non complétée"}</p>

        {lessonLocked && (
          <div className="bg-muted/50 border border-border rounded-2xl p-5 mb-6 flex items-center gap-3">
            <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium text-sm">Leçon verrouillée</p>
              <p className="text-xs text-muted-foreground">{lessonSched?.unlock_at ? `Se débloque le ${new Date(lessonSched.unlock_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} (semaine ${lessonSched.week_index}). Une leçon par semaine.` : "Cette leçon se débloquera prochainement."}</p>
            </div>
          </div>
        )}
        {lessonMissed && (
          <div className="bg-destructive/5 border border-destructive/30 rounded-2xl p-5 mb-6 flex items-center gap-3">
            <X className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-sm text-destructive">Recalé(e) sur cette leçon</p>
              <p className="text-xs text-muted-foreground">La fenêtre d'une semaine pour compléter cette leçon est dépassée. Contactez l'administration si besoin.</p>
            </div>
          </div>
        )}

        {/* Notebook cells (masquées si verrouillée) */}
        {!lessonLocked && !lessonMissed && (
        <div className="space-y-4 mb-8">
          {cells.map((cell, ci) => {
            // ── Markdown (avec tableaux simples) ──
            if (cell.type === "md") {
              return <MarkdownCell key={ci} content={cell.content || ""} />;
            }

            // ── Callout (situation réelle / astuce / attention) ──
            if (cell.type === "callout") {
              const cfg: Record<string, { icon: any; cls: string; lab: string }> = {
                real: { icon: MapPin, cls: "bg-primary/5 border-primary/30 text-primary", lab: "Situation réelle" },
                tip: { icon: Lightbulb, cls: "bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300", lab: "Astuce" },
                warning: { icon: AlertTriangle, cls: "bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300", lab: "Attention" },
              };
              const v = cfg[cell.variant || "tip"] || cfg.tip;
              const Icon = v.icon;
              return (
                <div key={ci} className={`rounded-2xl border p-4 ${v.cls}`}>
                  <div className="flex items-center gap-2 mb-1.5 font-medium text-sm">
                    <Icon className="w-4 h-4" /> {cell.title || v.lab}
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{cell.content}</p>
                </div>
              );
            }

            // ── Figure SVG (capture d'interface annotée) ──
            if (cell.type === "figure") {
              return <FigureCell key={ci} title={cell.title} svg={cell.svg} caption={cell.caption} />;
            }

            // ── Capture d'écran de l'outil ──
            if (cell.type === "image") {
              return <ImageCell key={ci} src={cell.src} title={cell.title} caption={cell.caption} />;
            }

            // ── Ressource externe open-source ──
            if (cell.type === "resource") {
              return (
                <a key={ci} href={cell.url} target="_blank" rel="noopener noreferrer"
                  className="group block bg-card rounded-2xl border border-border/50 p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <BookMarked className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm group-hover:text-primary transition-colors">{cell.title}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{cell.provider}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cell.desc}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </a>
              );
            }

            // ── Quiz inline (auto-correction locale, sans note) ──
            if (cell.type === "quiz") {
              return <QuizCell key={ci} cell={cell} />;
            }

            // ── Exercice noté : l'étudiant produit une réponse, le serveur corrige ──
            if (cell.type === "exercise") {
              const exId = cell.id || `ex${cells.slice(0, ci).filter(c => c.type === "exercise").length + 1}`;
              return (
                <ExerciseCell
                  key={ci}
                  exId={exId}
                  cell={cell}
                  value={exAnswers[exId]}
                  result={exResults[exId]}
                  locked={isLessonDone}
                  onChange={(v) => setExAnswers(prev => ({ ...prev, [exId]: v }))}
                />
              );
            }

            // ── Notebook LIVE (JupyterLite embed — exécute vraiment dans le navigateur) ──
            if (cell.type === "embed") {
              const liteUrl = `https://jupyterlite.github.io/demo/repl/index.html?kernel=python&toolbar=1&theme=JupyterLab%20Light&code=${encodeURIComponent(cell.code || "")}`;
              return (
                <div key={ci} className="bg-card rounded-2xl border border-primary/30 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-primary/5">
                    <div className="flex items-center gap-2"><PlayCircle className="w-3.5 h-3.5 text-primary" /><span className="text-xs text-primary font-medium">{cell.title || "Notebook live"}</span></div>
                    <span className="text-[10px] text-muted-foreground font-mono">JupyterLite · 100% gratuit · dans le navigateur</span>
                  </div>
                  <iframe src={liteUrl} className="w-full" style={{ height: 360, border: "none" }} title={cell.title || "notebook"} loading="lazy" />
                  <div className="px-4 py-2 bg-muted/20 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">▶ Cliquez dans la cellule et appuyez sur <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">Maj+Entrée</kbd> pour exécuter. Modifiez le code librement.</p>
                  </div>
                </div>
              );
            }

            // ── Code statique (run pour révéler l'output) ──
            const codeIdx = cells.slice(0, ci).filter(c => c.type === "code").length;
            const key = `${activeLesson}-code-${codeIdx}`;
            const ran = ranCells.has(key);
            return (
              <div key={ci} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5 text-blue-500" /><span className="text-xs text-muted-foreground font-mono">{cell.lang || "python"}</span></div>
                  <Button size="sm" variant={ran ? "outline" : "default"} className={`h-7 text-xs gap-1.5 ${ran ? "text-primary border-primary/40" : ""}`} onClick={() => runCell(key)}>
                    {ran ? <><CheckCircle2 className="w-3 h-3" /> Exécuté</> : <><PlayCircle className="w-3 h-3" /> Exécuter</>}
                  </Button>
                </div>
                <pre className="px-5 py-4 text-xs font-mono overflow-x-auto bg-[#0d1117] text-slate-300 leading-relaxed"><code>{cell.code}</code></pre>
                {ran && cell.output && (
                  <div className="border-t border-border/50">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/20"><Star className="w-3 h-3 text-primary" /><span className="text-xs text-muted-foreground font-mono">output</span></div>
                    <pre className="px-5 py-3 text-xs font-mono text-primary/80 whitespace-pre-wrap">{cell.output}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}

        {/* Note obtenue après correction serveur */}
        {lessonScore && (
          <div className="bg-primary/5 border border-primary/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="font-medium text-sm">Leçon validée — {lessonScore.score}/{lessonScore.max} points</p>
              <p className="text-xs text-muted-foreground">La correction de chaque exercice est affichée ci-dessus.</p>
            </div>
          </div>
        )}

        {/* Erreur de validation renvoyée par le serveur */}
        {completeError && (
          <div className="bg-destructive/5 border border-destructive/30 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{completeError}</p>
          </div>
        )}

        {/* Et maintenant ? — l'enchaînement quand la suite de ce cours n'est pas encore ouverte.
            Sans ce panneau, « Suivant » menait droit sur une leçon verrouillée de la semaine
            suivante, alors que d'autres leçons de la semaine en cours restaient à faire. */}
        {isLessonDone && !nextInCourseOpen && (openElsewhere.length > 0 || nextInCourse) && (
          <div className="bg-primary/5 border border-primary/25 rounded-2xl p-5 mb-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Et maintenant ?</p>
            {nextInCourse && nextInCourseSched?.unlock_at && (
              <p className="text-sm text-muted-foreground mb-3">
                La suite de <strong className="text-foreground">{course.code}</strong> — « {nextInCourse.title} » — s'ouvre le{" "}
                {new Date(nextInCourseSched.unlock_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.
              </p>
            )}
            {openElsewhere.length > 0 ? (
              <>
                <p className="text-sm mb-3">
                  {openElsewhere.length === 1 ? "Il vous reste une leçon ouverte cette semaine :" : `Il vous reste ${openElsewhere.length} leçons ouvertes cette semaine :`}
                </p>
                <div className="space-y-2">
                  {openElsewhere.map((sp: any) => (
                    <button key={sp.lesson_id}
                      onClick={() => navigate(`/academy/classroom/${sp.course_id}?lesson=${sp.lesson_id}`)}
                      className="w-full text-left bg-card border border-border/50 hover:border-primary/40 rounded-xl px-4 py-3 transition-colors flex items-center gap-3">
                      <span className="text-[10px] font-mono font-semibold text-primary shrink-0">{sp.sms_courses?.code}</span>
                      <span className="text-sm flex-1 truncate">{sp.sms_lessons?.title || "Leçon"}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Vous avez terminé tout ce qui était ouvert cette semaine. Revenez à la prochaine ouverture.
              </p>
            )}
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => navigate("/academy/dashboard")}>
              Mon planning <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Nav + complete */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button variant="outline" disabled={activeLesson === 0} onClick={() => goToLesson(activeLesson - 1)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </Button>
          <div className="flex gap-2">
            {!isLessonDone && (
              <Button
                onClick={completeLesson}
                disabled={submitting || lessonLocked || lessonMissed || (codeCells.length > 0 && !allCodeRan) || (hasExercises && !allAnswered)}
                className="gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {codeCells.length > 0 && !allCodeRan ? "Exécutez les cellules"
                  : hasExercises && !allAnswered ? `Répondez aux exercices (${answeredCount}/${exerciseIds.length})`
                  : hasExercises ? "Corriger ma copie"
                  : "Marquer comme complété"}
              </Button>
            )}
            {isLessonDone && nextInCourse && nextInCourseOpen && (
              <Button onClick={() => goToLesson(activeLesson + 1)} className="gap-2">Suivant <ChevronRight className="w-4 h-4" /></Button>
            )}
            {allLessonsDone && (
              <Button onClick={requestAttestation} disabled={submitting} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                <Trophy className="w-4 h-4" /> Demander l'attestation
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
