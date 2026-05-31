import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { SocialShare } from "@/components/social-share";
import {
  GraduationCap, User, Award, BookOpen, Loader2, CheckCircle2, Clock,
  Trophy, ChevronRight, Target, Lock, X, Download, Share2, ShieldCheck,
  Sparkles, TrendingUp, Calendar, AlertCircle, Video, Radio, Users } from "lucide-react";
import { getStudent, studentFetch, isStudentLoggedIn, getStudentToken } from "@/lib/student";

interface Cred { id: string; type: string; title: string; subtitle: string; issued_at: string; expires_at: string | null; status: string; certificate_no: string | null; score: number | null; download_url: string | null; skills: string[]; color: string; }

export default function AcademyDashboard() {
  const [, navigate] = useLocation();
  const student = getStudent();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [testStatus, setTestStatus] = useState<any>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [transcript, setTranscript] = useState<any>(null);
  const [creds, setCreds] = useState<Cred[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => {
      try {
        const [e, ts, ac, sch, tr, cr, mt] = await Promise.all([
          studentFetch("/api/academy/my-enrollments").then(r => r.json()).catch(() => []),
          studentFetch("/api/academy/test-status").then(r => r.json()).catch(() => null),
          fetch("/api/academy/courses").then(r => r.json()).catch(() => []),
          studentFetch("/api/academy/lesson-schedule").then(r => r.json()).catch(() => []),
          studentFetch("/api/academy/transcript").then(r => r.json()).catch(() => null),
          studentFetch("/api/academy/my-credentials").then(r => r.json()).catch(() => null),
          studentFetch("/api/academy/meetings").then(r => r.json()).catch(() => null),
        ]);
        setEnrollments(Array.isArray(e) ? e : []);
        setTestStatus(ts); setAllCourses(Array.isArray(ac) ? ac : []);
        setSchedule(Array.isArray(sch) ? sch : []); setTranscript(tr);
        setCreds(cr?.credentials || []); setMeetings(mt?.meetings || []);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const completedCourses = enrollments.filter(e => e.status === "completed").length;
  const nextLesson = schedule.find((s: any) => s.status === "available");
  const overall = transcript?.overall ?? 0;
  const firstName = student?.full_name?.split(" ")[0] || "étudiant";
  const emailVerified = testStatus ? testStatus.emailVerified !== false : true;

  const initials = student?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "ET";

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8">
      <SEO title="Mon espace — DataMEAL Academy" description="Tableau de bord étudiant." />

      {/* ───── Hero header ───── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-teal-700 p-6 sm:p-8 mb-6 text-white" style={{ transform: "translateZ(0)", isolation: "isolate", WebkitBackfaceVisibility: "hidden" }}>
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute -right-16 top-12 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold border border-white/30">
              {initials}
            </div>
            <div>
              <p className="text-white/70 text-sm">Bon retour,</p>
              <h1 className="text-2xl sm:text-3xl font-bold">{firstName} 👋</h1>
              {testStatus?.passed && (
                <span className="inline-flex items-center gap-1.5 mt-1.5 text-xs bg-white/15 px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" /> Admis(e) · {creds.length} credential{creds.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          {nextLesson ? (
            <button onClick={() => navigate(`/academy/classroom/${nextLesson.course_id}`)}
              className="bg-white text-primary rounded-2xl px-5 py-3 text-left hover:bg-white/95 transition-colors shadow-lg">
              <p className="text-[11px] uppercase tracking-wide text-primary/60 font-semibold">Cette semaine</p>
              <p className="font-bold text-sm max-w-[200px] truncate">{nextLesson.sms_lessons?.title || "Leçon disponible"}</p>
              <span className="text-xs flex items-center gap-1 mt-0.5">Continuer <ChevronRight className="w-3 h-3" /></span>
            </button>
          ) : !testStatus?.passed ? (
            <Button onClick={() => navigate("/elearning")} className="bg-white text-primary hover:bg-white/95 gap-2 shadow-lg">
              <Target className="w-4 h-4" /> Passer le test d'admission
            </Button>
          ) : null}
        </div>
      </div>

      {/* ───── Alerte vérification email ───── */}
      {!emailVerified && (
        <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">Vérifiez votre email pour débloquer le test et les cours.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/academy/profile")}>Vérifier maintenant</Button>
        </div>
      )}

      {/* ───── Stats cards ───── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6" style={{ isolation: "isolate" }}>
        {[
          { label: "Moyenne générale", value: `${overall}%`, icon: TrendingUp, tint: "text-primary bg-primary/10" },
          { label: "Cours terminés", value: `${completedCourses}/${allCourses.length || 3}`, icon: BookOpen, tint: "text-blue-600 bg-blue-500/10" },
          { label: "Credentials", value: creds.length, icon: Award, tint: "text-purple-600 bg-purple-500/10" },
          { label: "Évaluations", value: transcript?.totalGrades ?? 0, icon: CheckCircle2, tint: "text-emerald-600 bg-emerald-500/10" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl border border-border/50 p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.tint}`}><s.icon className="w-4.5 h-4.5" /></div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ───── Rencontres en ligne à venir ───── */}
      {meetings.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Video className="w-5 h-5 text-primary" /> Rencontres en ligne</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {meetings.map((m: any) => {
              const start = new Date(m.starts_at);
              const isWebinar = m.kind === "webinar";
              const isLive = m.status === "live";
              const soon = start.getTime() - Date.now() < 15 * 60 * 1000 && start.getTime() - Date.now() > -m.duration_min * 60 * 1000;
              const canJoin = isLive || soon;
              return (
                <div key={m.id} className={`bg-card rounded-2xl border p-4 ${isLive ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isWebinar ? "bg-purple-500/10 text-purple-600" : "bg-primary/10 text-primary"}`}>
                      {isWebinar ? <Radio className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{m.title}</p>
                        {isLive && <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded animate-pulse shrink-0">● LIVE</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {isWebinar ? "Webinaire" : "Interactive"}</p>
                    </div>
                  </div>
                  <Button size="sm" className="w-full mt-3 gap-1.5" variant={canJoin ? "default" : "outline"}
                    onClick={() => navigate(`/academy/live/${m.id}`)}>
                    <Video className="w-3.5 h-3.5" /> {canJoin ? "Rejoindre maintenant" : "Voir les détails"}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ───── Portefeuille de credentials (style Credly) ───── */}
      {creds.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Mon portefeuille de credentials</h2>
            <span className="text-xs text-muted-foreground">Vérifiables · Téléchargeables</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creds.map((cr) => (
              <CredentialCard key={cr.id} cred={cr} />
            ))}
          </div>
        </section>
      )}

      {/* ───── Bannière test (non admis) ───── */}
      {testStatus && !testStatus.passed && emailVerified && (
        <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-2xl p-5 mb-6 flex items-center justify-between flex-wrap gap-4" style={{ transform: "translateZ(0)" }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center"><Target className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="font-semibold text-sm">{testStatus.hasTaken ? `Dernier score : ${testStatus.score}/30` : "Passez le test d'admission"}</p>
              <p className="text-xs text-muted-foreground">{testStatus.canRetry ? "Réussissez (21/30) pour débloquer vos cours." : "Patientez avant de réessayer."}</p>
            </div>
          </div>
          {testStatus.canRetry && <Button onClick={() => navigate("/elearning")} className="gap-2">{testStatus.hasTaken ? "Repasser" : "Commencer"} <ChevronRight className="w-4 h-4" /></Button>}
        </div>
      )}

      {/* ───── Planning hebdomadaire ───── */}
      {testStatus?.passed && schedule.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Mon planning</h2>
            <span className="text-xs text-muted-foreground">1 leçon / semaine</span>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/40 overflow-hidden">
            {schedule.map((s: any) => {
              const isDone = s.status === "completed", isAvail = s.status === "available";
              const isMissed = s.status === "missed";
              return (
                <div key={s.id} className={`flex items-center gap-3 p-3.5 ${isAvail ? "bg-primary/5" : ""}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                    isDone ? "bg-primary text-white" : isAvail ? "bg-primary/15 text-primary" :
                    isMissed ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : isMissed ? <X className="w-4 h-4" /> : isAvail ? `S${s.week_index}` : <Lock className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.sms_lessons?.title || "Leçon"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.sms_courses?.code} · {isDone ? "Complétée ✓" : isAvail ? `Avant le ${new Date(s.due_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` :
                      isMissed ? "Recalé(e)" : `Débloque le ${new Date(s.unlock_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                    </p>
                  </div>
                  {isAvail && <Button size="sm" onClick={() => navigate(`/academy/classroom/${s.course_id}`)} className="shrink-0">Commencer</Button>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ───── Catalogue ───── */}
      {allCourses.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Mes projets</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCourses.map((co: any, i: number) => {
              const enr = enrollments.find(e => e.course_id === co.id);
              const prog = enr?.progress || 0;
              const palette = ["from-teal-500/15 to-teal-600/5", "from-blue-500/15 to-blue-600/5", "from-purple-500/15 to-purple-600/5"];
              return (
                <div key={co.id} className="bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col">
                  <div className={`h-2 bg-gradient-to-r ${palette[i % 3]}`} />
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-primary font-semibold">{co.code}</span>
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">{co.level}</span>
                    </div>
                    <h3 className="font-semibold text-sm mb-2 leading-snug">{co.title}</h3>
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2 flex-1">{co.description}</p>
                    {enr && (
                      <div className="mb-3">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${prog}%` }} /></div>
                        <p className="text-[11px] text-muted-foreground mt-1">{prog}% complété</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={enr ? "default" : "outline"} className="flex-1 gap-1.5"
                        disabled={!testStatus?.passed}
                        onClick={() => navigate(`/academy/classroom/${co.id}`)}>
                        {!testStatus?.passed ? <><Lock className="w-3.5 h-3.5" /> Test requis</> :
                         enr ? <>{prog > 0 ? "Continuer" : "Commencer"} <ChevronRight className="w-3.5 h-3.5" /></> :
                         <>Ouvrir <ChevronRight className="w-3.5 h-3.5" /></>}
                      </Button>
                      <SocialShare
                        url="/elearning"
                        title={`${co.title} — Formation MEAL gratuite | DataMEAL Academy`}
                        description={`${co.description || "Formation par projets"} — Rejoins DataMEAL Academy, une formation MEAL gratuite et certifiante. Inscris-toi !`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ───── Relevé de notes condensé ───── */}
      {transcript && transcript.grades?.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Mon relevé de notes</h2>
            <button onClick={() => navigate("/academy/profile")} className="text-xs text-primary hover:underline flex items-center gap-1">Détail complet <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <div className="flex gap-3 flex-wrap mb-4">
              <div className="bg-primary/10 rounded-xl px-4 py-2.5">
                <p className="text-[11px] text-muted-foreground">Moyenne générale</p>
                <p className="text-xl font-bold text-primary">{transcript.overall}%</p>
              </div>
              {transcript.courseAverages?.map((ca: any) => (
                <div key={ca.code} className="bg-muted rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">{ca.code}</p>
                  <p className="text-base font-bold">{ca.average}%</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {transcript.grades.slice(-4).reverse().map((g: any) => {
                const pct = Math.round(Number(g.score) / Number(g.max_score) * 100);
                return (
                  <div key={g.id} className="flex items-center justify-between text-sm py-1.5">
                    <span className="truncate flex-1 text-muted-foreground">{g.title}</span>
                    <span className={`font-semibold ml-3 ${pct >= 70 ? "text-primary" : pct >= 50 ? "text-amber-600" : "text-destructive"}`}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ───── Carte de credential (style Credly) ─────
function CredentialCard({ cred }: { cred: Cred }) {
  const expired = cred.status === "expired";
  const issued = cred.issued_at ? new Date(cred.issued_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
  const isFinal = cred.type === "final";
  return (
    <div className={`group relative bg-card rounded-2xl border overflow-hidden transition-all hover:shadow-lg ${expired ? "border-border/50 opacity-75" : "border-border/50 hover:border-primary/30"}`}>
      {/* Badge médaillon */}
      <div className="relative p-5 pb-4" style={{ background: `linear-gradient(135deg, ${cred.color}18, transparent)`, transform: "translateZ(0)" }}>
        <div className="flex items-start justify-between">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: cred.color }}>
            {isFinal ? <Trophy className="w-7 h-7 text-white" /> : <Award className="w-7 h-7 text-white" />}
          </div>
          {expired ? (
            <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-1 rounded-full">Expiré</span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: `${cred.color}18`, color: cred.color }}>
              <ShieldCheck className="w-3 h-3" /> Vérifié
            </span>
          )}
        </div>
        <h3 className="font-bold text-sm mt-3 leading-snug">{cred.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{cred.subtitle}</p>
      </div>

      {/* Skills */}
      {cred.skills.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {cred.skills.slice(0, 4).map((sk) => (
            <span key={sk} className="text-[10px] bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{sk}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/40 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {cred.score != null && <p className="text-xs font-semibold" style={{ color: cred.color }}>Score {cred.score}%</p>}
          <p className="text-[10px] text-muted-foreground truncate">{issued}</p>
        </div>
        <div className="flex gap-1.5">
          {cred.certificate_no && (
            <a href={`/academy/verify-certificate/${cred.certificate_no}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-xs px-2" title="Page de vérification publique"><ShieldCheck className="w-3.5 h-3.5" /></Button>
            </a>
          )}
          {cred.download_url && (
            <a href={`${cred.download_url}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"><Download className="w-3.5 h-3.5" /> PDF</Button>
            </a>
          )}
        </div>
      </div>
      {cred.certificate_no && (
        <div className="px-5 pb-3"><p className="text-[9px] font-mono text-muted-foreground/60">N° {cred.certificate_no}</p></div>
      )}
    </div>
  );
}
