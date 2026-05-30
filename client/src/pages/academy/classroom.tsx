import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, CheckCircle2, PlayCircle, Terminal,
  FileCode2, Loader2, Trophy, Lock, BookOpen, Star, Info, Lightbulb,
  AlertTriangle, ExternalLink, MapPin, BookMarked, Image as ImageIcon,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn } from "@/lib/student";

interface Cell { type: string; content?: string; lang?: string; code?: string; output?: string; variant?: string; title?: string; url?: string; provider?: string; desc?: string; question?: string; opts?: string[]; ans?: number; svg?: string; caption?: string; }
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

export default function AcademyClassroom() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/academy/classroom/:id");
  const courseId = params?.id ? Number(params.id) : null;

  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [ranCells, setRanCells] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [testPassed, setTestPassed] = useState(false);

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    if (!courseId) return;
    (async () => {
      try {
        const [c, enr, g, ts] = await Promise.all([
          fetch(`/api/academy/courses/${courseId}`).then(r => r.json()),
          studentFetch("/api/academy/my-enrollments").then(r => r.json()),
          studentFetch("/api/academy/my-grades").then(r => r.json()),
          studentFetch("/api/academy/test-status").then(r => r.json()).catch(() => null),
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
      } catch (e) { setCourse(null); } finally { setLoading(false); }
    })();
  }, [courseId]);

  function runCell(key: string) { setRanCells(prev => new Set(prev).add(key)); }

  async function completeLesson() {
    if (!course || !courseId) return;
    const lesson = course.lessons[activeLesson];
    setSubmitting(true);
    try {
      const res = await studentFetch("/api/academy/complete-lesson", {
        method: "POST",
        body: JSON.stringify({ course_id: courseId, lesson_id: lesson.id, score: lesson.points }),
      });
      const data = await res.json();
      setProgress(data.progress);
      setCompletedLessons(prev => new Set(prev).add(lesson.id));
      if (activeLesson < course.lessons.length - 1) setActiveLesson(a => a + 1);
    } catch (e) { /* handled */ } finally { setSubmitting(false); }
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
      <h2 className="text-xl font-bold mb-2">Cours introuvable</h2>
      <p className="text-muted-foreground mb-6">Ce cours n'existe pas ou n'est plus disponible.</p>
      <Button onClick={() => navigate("/academy/dashboard")}>Retour au tableau de bord</Button>
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
  const cells = lesson?.content?.cells || [];
  const codeCells = cells.filter(c => c.type === "code");
  const allCodeRan = codeCells.every((_, i) => ranCells.has(`${activeLesson}-code-${i}`));
  const isLessonDone = completedLessons.has(lesson?.id);
  const allLessonsDone = course.lessons.every(l => completedLessons.has(l.id));

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
            return (
              <button key={l.id} onClick={() => setActiveLesson(i)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 ${activeLesson === i ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-current shrink-0" />}
                <span className="truncate">{i + 1}. {l.title}</span>
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
        <p className="text-sm text-muted-foreground mb-6">{lesson?.points} points · {isLessonDone ? "Complétée ✓" : "Non complétée"}</p>

        {/* Notebook cells */}
        <div className="space-y-4 mb-8">
          {cells.map((cell, ci) => {
            // ── Markdown (avec tableaux simples) ──
            if (cell.type === "md") {
              return (
                <div key={ci} className="px-1 py-1 text-sm leading-relaxed">
                  {(cell.content || "").split("\n").map((line, li) => {
                    if (line.startsWith("### ")) return <h4 key={li} className="font-semibold text-[15px] mt-4 mb-1.5">{line.slice(4)}</h4>;
                    if (line.startsWith("## ")) return <h3 key={li} className="font-bold text-lg mt-3 mb-2">{line.slice(3)}</h3>;
                    if (line.startsWith("| ")) return <div key={li} className="font-mono text-xs bg-muted/60 px-3 py-1 my-0.5 rounded overflow-x-auto whitespace-nowrap">{line.replace(/\|/g, " | ").replace(/---/g, "—")}</div>;
                    if (line.match(/^\d+\. /)) return <div key={li} className="ml-3 text-muted-foreground my-1">{line.replace(/\*\*(.+?)\*\*/g, "$1")}</div>;
                    if (line.startsWith("- ")) return <div key={li} className="ml-3 text-muted-foreground my-0.5">• {line.slice(2).replace(/\*\*(.+?)\*\*/g, "$1")}</div>;
                    if (line.startsWith("```")) return null;
                    if (line.trim() === "") return <div key={li} className="h-1" />;
                    return <p key={li} className="text-muted-foreground my-1" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>").replace(/`(.+?)`/g, "<code class='font-mono text-xs bg-muted px-1.5 py-0.5 rounded'>$1</code>") }} />;
                  })}
                </div>
              );
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
              return (
                <div key={ci} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                  {cell.title && (
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/30">
                      <ImageIcon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium text-foreground">{cell.title}</span>
                    </div>
                  )}
                  <div className="p-4 bg-white dark:bg-slate-900/40 flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: cell.svg || "" }} />
                  {cell.caption && (
                    <div className="px-4 py-2.5 bg-muted/20 border-t border-border/50">
                      <p className="text-xs text-muted-foreground leading-relaxed">{cell.caption}</p>
                    </div>
                  )}
                </div>
              );
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

            // ── Quiz inline ──
            if (cell.type === "quiz") {
              return <QuizCell key={ci} cell={cell} />;
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

        {/* Nav + complete */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button variant="outline" disabled={activeLesson === 0} onClick={() => setActiveLesson(a => a - 1)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </Button>
          <div className="flex gap-2">
            {!isLessonDone && (
              <Button onClick={completeLesson} disabled={submitting || (codeCells.length > 0 && !allCodeRan)} className="gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {codeCells.length > 0 && !allCodeRan ? "Exécutez les cellules" : "Marquer comme complété"}
              </Button>
            )}
            {isLessonDone && activeLesson < course.lessons.length - 1 && (
              <Button onClick={() => setActiveLesson(a => a + 1)} className="gap-2">Suivant <ChevronRight className="w-4 h-4" /></Button>
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
