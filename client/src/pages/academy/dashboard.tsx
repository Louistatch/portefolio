import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, LogOut, User, TrendingUp, Award, BookOpen, Loader2,
  CheckCircle2, Clock, Trophy, ChevronRight, Target,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { getStudent, clearStudentSession, studentFetch, isStudentLoggedIn } from "@/lib/student";

interface Grade { id: number; title: string; score: number; max_score: number; type: string; graded_at: string; sms_courses?: { code: string; title: string }; }
interface Enrollment { id: number; course_id: number; status: string; progress: number; sms_courses?: { id: number; code: string; title: string; description: string; tools: string[]; level: string; total_lessons: number }; }

export default function AcademyDashboard() {
  const [, navigate] = useLocation();
  const student = getStudent();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [average, setAverage] = useState(0);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attestations, setAttestations] = useState<any[]>([]);
  const [testStatus, setTestStatus] = useState<any>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => {
      try {
        const [g, e, a, ts, ac] = await Promise.all([
          studentFetch("/api/academy/my-grades").then(r => r.json()),
          studentFetch("/api/academy/my-enrollments").then(r => r.json()),
          studentFetch("/api/academy/my-attestations").then(r => r.json()),
          studentFetch("/api/academy/test-status").then(r => r.json()).catch(() => null),
          fetch("/api/academy/courses").then(r => r.json()).catch(() => []),
        ]);
        setGrades(g.grades || []); setAverage(g.average || 0);
        setEnrollments(e || []); setAttestations(a || []);
        setTestStatus(ts); setAllCourses(Array.isArray(ac) ? ac : []);
      } catch (err) { /* handled by studentFetch */ } finally { setLoading(false); }
    })();
  }, []);

  function logout() { clearStudentSession(); navigate("/academy/login"); }

  // Données du graphique d'évolution (note en % par évaluation, ordre chronologique)
  const chartData = grades.map((g, i) => ({
    name: g.sms_courses?.code ? `${g.sms_courses.code}` : `Éval ${i + 1}`,
    label: g.title.length > 18 ? g.title.slice(0, 18) + "…" : g.title,
    pct: Math.round((Number(g.score) / Number(g.max_score)) * 100),
  }));

  // Moyenne par cours
  const byCourse: Record<string, { sum: number; n: number }> = {};
  grades.forEach(g => {
    const code = g.sms_courses?.code || "Test";
    if (!byCourse[code]) byCourse[code] = { sum: 0, n: 0 };
    byCourse[code].sum += (Number(g.score) / Number(g.max_score)) * 100;
    byCourse[code].n++;
  });
  const courseAvg = Object.entries(byCourse).map(([code, v]) => ({ code, moyenne: Math.round(v.sum / v.n) }));

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const completedCourses = enrollments.filter(e => e.status === "completed").length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <SEO title="Mon espace — DataMEAL Academy" description="Tableau de bord étudiant." />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
            {student?.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("") || "ET"}
          </div>
          <div>
            <h1 className="text-xl font-bold">Bonjour, {student?.full_name?.split(" ")[0] || "Étudiant"}</h1>
            <p className="text-sm text-muted-foreground">{student?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/academy/profile")}><User className="w-4 h-4" /> Mon profil</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={logout}><LogOut className="w-4 h-4" /> Déconnexion</Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Moyenne générale", value: `${average}%`, icon: Target, color: "text-primary" },
          { label: "Cours inscrits", value: enrollments.length, icon: BookOpen, color: "text-blue-600 dark:text-blue-400" },
          { label: "Cours terminés", value: completedCourses, icon: CheckCircle2, color: "text-primary" },
          { label: "Attestations", value: attestations.length, icon: Award, color: "text-amber-600 dark:text-amber-400" },
        ].map(m => (
          <div key={m.label} className="bg-card rounded-2xl p-5 border border-border/50">
            <m.icon className={`w-5 h-5 ${m.color} mb-2`} />
            <div className="text-2xl font-bold">{m.value}</div>
            <div className="text-xs text-muted-foreground">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Evolution chart */}
      <div className="bg-card rounded-3xl p-6 border border-border/50 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Évolution de mes notes</h2>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }}
                formatter={(v: any) => [`${v}%`, "Note"]}
                labelFormatter={(_l, p: any) => p?.[0]?.payload?.label || ""}
              />
              <Line type="monotone" dataKey="pct" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-12 text-center">Aucune note pour le moment. Complétez des leçons pour voir votre évolution.</p>
        )}
      </div>

      {/* Course averages bar chart */}
      {courseAvg.length > 0 && (
        <div className="bg-card rounded-3xl p-6 border border-border/50 mb-8">
          <h2 className="font-semibold mb-5">Moyenne par cours</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={courseAvg} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="code" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} formatter={(v: any) => [`${v}%`, "Moyenne"]} />
              <Bar dataKey="moyenne" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* My courses */}
      {testStatus && !testStatus.passed && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"><Target className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="font-medium text-sm">{testStatus.hasTaken ? `Test passe : ${testStatus.score}/30` : "Passez le test d'aptitude"}</p>
              <p className="text-xs text-muted-foreground">{testStatus.hasTaken ? "Score requis : 21/30. Vous pouvez le repasser." : "Reussissez le test (21/30) pour debloquer vos cours."}</p>
            </div>
          </div>
          <Button onClick={() => navigate("/elearning")} className="gap-2">{testStatus.hasTaken ? "Repasser le test" : "Passer le test"} <ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Mes cours</h2>
        {enrollments.length > 0 && <span className="text-xs text-muted-foreground">{enrollments.length} cours · {completedCourses} termine(s)</span>}
      </div>

      {enrollments.length === 0 && (
        <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center mb-8">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium mb-1">Aucun cours pour le moment</p>
          <p className="text-sm text-muted-foreground mb-5">{testStatus?.passed ? "Explorez le catalogue ci-dessous pour commencer." : "Reussissez d'abord le test d'aptitude pour debloquer l'acces aux cours."}</p>
          {!testStatus?.passed && <Button onClick={() => navigate("/elearning")} className="gap-2">Passer le test <ChevronRight className="w-4 h-4" /></Button>}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mb-8">
        {enrollments.map(e => (
          <div key={e.id} className="group bg-card rounded-2xl p-5 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => navigate(`/academy/classroom/${e.course_id}`)}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-mono text-muted-foreground">{e.sms_courses?.code}</span>
              {e.status === "completed"
                ? <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Terminé</span>
                : <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> En cours</span>}
            </div>
            <h3 className="font-semibold mb-2 leading-snug group-hover:text-primary transition-colors">{e.sms_courses?.title}</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {e.sms_courses?.tools?.map(t => <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-mono">{t}</span>)}
            </div>
            <div className="h-1.5 bg-muted rounded-full mb-1">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${e.progress}%` }} />
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-muted-foreground">{e.progress}% complété</span>
            </div>
            <Button size="sm" className="w-full gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {e.progress > 0 ? "Continuer le cours" : "Commencer le cours"}</Button>
          </div>
        ))}
      </div>

      {allCourses.length > 0 && (
        <div id="catalogue" className="mb-8">
          <h2 className="text-lg font-bold mb-4">Catalogue des cours</h2>
          <div className="grid lg:grid-cols-3 gap-4">
            {allCourses.map((co: any) => {
              const enrolled = enrollments.some(e => e.course_id === co.id);
              return (
                <div key={co.id} className="bg-card rounded-2xl p-5 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-primary">{co.code}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">{co.level}</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-2 leading-snug">{co.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{co.description}</p>
                  {enrolled
                    ? <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => navigate(`/academy/classroom/${co.id}`)}><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Inscrit — Ouvrir</Button>
                    : <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={!testStatus?.passed} onClick={() => navigate(`/academy/classroom/${co.id}`)}>{testStatus?.passed ? "Ouvrir" : "Test requis"}</Button>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent grades table */}
      {grades.length > 0 && (
        <>
          <h2 className="text-lg font-bold mb-4">Relevé de notes</h2>
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Évaluation</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Type</th>
                  <th className="text-right px-4 py-2.5 font-medium">Note</th>
                  <th className="text-right px-4 py-2.5 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {[...grades].reverse().map(g => {
                  const pct = Math.round((Number(g.score) / Number(g.max_score)) * 100);
                  return (
                    <tr key={g.id} className="border-t border-border/40">
                      <td className="px-4 py-2.5">{g.title}</td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{g.type}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{g.score}/{g.max_score}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${pct >= 70 ? "text-primary" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
