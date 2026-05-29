import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, CheckCircle2, PlayCircle, Terminal,
  FileCode2, Loader2, Trophy, Lock, BookOpen, Star,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn } from "@/lib/student";

interface Cell { type: string; content?: string; lang?: string; code?: string; output?: string; }
interface Lesson { id: number; title: string; content: { cells: Cell[] }; points: number; order_index: number; }
interface Course { id: number; code: string; title: string; description: string; tools: string[]; lessons: Lesson[]; }

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

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    if (!courseId) return;
    (async () => {
      try {
        const [c, enr, g] = await Promise.all([
          fetch(`/api/academy/courses/${courseId}`).then(r => r.json()),
          studentFetch("/api/academy/my-enrollments").then(r => r.json()),
          studentFetch("/api/academy/my-grades").then(r => r.json()),
        ]);
        setCourse(c);
        const myEnr = (enr || []).find((e: any) => e.course_id === courseId);
        setProgress(myEnr?.progress || 0);
        const done = new Set<number>((g.grades || []).filter((gr: any) => gr.course_id === courseId && gr.lesson_id).map((gr: any) => gr.lesson_id as number));
        setCompletedLessons(done);
      } catch (e) { /* handled */ } finally { setLoading(false); }
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
  if (!course) return <div className="text-center py-32 text-muted-foreground">Cours introuvable</div>;

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
            if (cell.type === "md") {
              return (
                <div key={ci} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/30">
                    <FileCode2 className="w-3.5 h-3.5 text-primary" /><span className="text-xs text-muted-foreground font-mono">markdown</span>
                  </div>
                  <div className="px-5 py-4 text-sm leading-relaxed">
                    {(cell.content || "").split("\n").map((line, li) =>
                      line.startsWith("## ")
                        ? <h3 key={li} className="font-semibold text-base mt-2 mb-1">{line.slice(3)}</h3>
                        : <p key={li} className="text-muted-foreground">{line}</p>
                    )}
                  </div>
                </div>
              );
            }
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
