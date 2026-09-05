import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { SocialShare } from "@/components/social-share";
import {
  GraduationCap, User, Award, BookOpen, Loader2, CheckCircle2, Clock,
  Trophy, ChevronRight, Target, Lock, X, Download, Share2, ShieldCheck,
  Sparkles, TrendingUp, Calendar, AlertCircle, Video, Radio, Users, ExternalLink, Send } from "lucide-react";
import { getStudent, studentFetch, isStudentLoggedIn, getStudentToken } from "@/lib/student";
import { groupByProgram } from "@shared/programs";
import { motion } from "framer-motion";
import { MountStagger, MountItem, BarreRemplissage } from "@/components/motion";

/**
 * L'attente, dessinée plutôt que tournoyante.
 *
 * Le tableau de bord tire neuf appels en parallèle ; sur un téléphone en 4G, cela se compte
 * en secondes. Un disque qui tourne au milieu d'un écran vide ne dit rien d'autre que
 * « attendez », et une attente vide paraît plus longue qu'elle ne l'est. La silhouette de la
 * page annonce ce qui arrive et où : quand les données tombent, elles remplissent une forme
 * déjà connue au lieu d'en imposer une nouvelle.
 *
 * `shimmer` vient de index.css — bande claire en `transform`, donc composée : les douze
 * blocs de cet écran ne coûtent pas douze repeints par image.
 */
function SquelettePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6" aria-busy="true" aria-label="Chargement de votre espace">
      <div className="bg-card rounded-2xl border border-border/60 p-5 sm:p-6">
        <div className="flex items-start justify-between flex-wrap gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl shimmer" />
            <div className="space-y-2">
              <div className="h-6 w-40 rounded-md shimmer" />
              <div className="h-3 w-56 rounded shimmer" />
            </div>
          </div>
          <div className="min-w-[220px] space-y-2">
            <div className="h-3 w-32 rounded shimmer" />
            <div className="h-5 w-44 rounded-md shimmer" />
            <div className="h-1.5 w-full rounded-full shimmer" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
            <div className="w-9 h-9 rounded-xl shimmer" />
            <div className="h-7 w-16 rounded-md shimmer" />
            <div className="h-3 w-24 rounded shimmer" />
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="h-1.5 shimmer" />
            <div className="p-5 space-y-3">
              <div className="h-4 w-2/3 rounded-md shimmer" />
              <div className="h-3 w-full rounded shimmer" />
              <div className="h-2 w-full rounded-full shimmer mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { AlerteRetard, constatDepuisPlanning } from "@/components/academy/alerte-retard";

export interface Cred { id: string; type: string; title: string; subtitle: string; issued_at: string; expires_at: string | null; status: string; certificate_no: string | null; score: number | null; download_url: string | null; skills: string[]; color: string; }

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
  const [gw, setGw] = useState<any>(null);
  const [bord, setBord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Les cours terminés sont repliés par défaut, parcours par parcours.

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => {
      try {
        const [e, ts, ac, sch, tr, cr, mt, tg, bd] = await Promise.all([
          studentFetch("/api/academy/my-enrollments").then(r => r.json()).catch(() => []),
          studentFetch("/api/academy/test-status").then(r => r.json()).catch(() => null),
          fetch("/api/academy/courses").then(r => r.json()).catch(() => []),
          studentFetch("/api/academy/lesson-schedule").then(r => r.json()).catch(() => []),
          studentFetch("/api/academy/transcript").then(r => r.json()).catch(() => null),
          studentFetch("/api/academy/my-credentials").then(r => r.json()).catch(() => null),
          studentFetch("/api/academy/meetings").then(r => r.json()).catch(() => null),
          studentFetch("/api/academy/group-work").then(r => r.json()).catch(() => null),
          studentFetch("/api/academy/dashboard").then(r => r.json()).catch(() => null),
        ]);
        setEnrollments(Array.isArray(e) ? e : []);
        setTestStatus(ts); setAllCourses(Array.isArray(ac) ? ac : []);
        setSchedule(Array.isArray(sch) ? sch : []); setTranscript(tr);
        setCreds(cr?.credentials || []); setMeetings(mt?.meetings || []);
        setGw(tg && tg.actif !== false ? tg : null);
        setBord(bd && !bd.message ? bd : null);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <SquelettePage />;

  const completedCourses = enrollments.filter(e => e.status === "completed").length;
  // La prochaine leçon à faire : le planning est trié par semaine, donc une leçon en retard
  // (statut « missed ») remonte avant les leçons de la semaine en cours — c'est bien elle
  // qu'il faut proposer de reprendre en premier.
  const nextLesson = schedule.find((s: any) => s.status === "available" || s.status === "missed");

  const overall = transcript?.overall ?? 0;
  const firstName = student?.full_name?.split(" ")[0] || "étudiant";
  const emailVerified = testStatus ? testStatus.emailVerified !== false : true;

  // Les parcours ont désormais chacun leur admission : n'afficher que ceux auxquels
  // l'étudiant est réellement inscrit. /api/academy/courses renvoie tout le catalogue publié,
  // si bien qu'un étudiant admis au seul cursus MEAL voyait la formation de formateurs à 0 %,
  // comme un cours qu'il aurait négligé — alors qu'il n'y a simplement pas accès.
  //
  // Le test porte sur l'inscription OU sur la présence d'une leçon planifiée : se fier à la
  // seule inscription ferait disparaître le parcours d'un étudiant dont l'insertion aurait
  // échoué, alors que son planning existe et qu'il travaille dedans.
  const idsAccessibles = new Set<number>([
    ...enrollments.map((e: any) => e.course_id),
    ...schedule.map((s: any) => s.course_id),
  ]);
  const mesCours = (allCourses as any[]).filter(c => idsAccessibles.has(c.id));
  const programGroups = groupByProgram(mesCours);

  const initials = student?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "ET";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SEO title="Mon espace — LouisFarm Learning" description="Tableau de bord étudiant." />

      {/* ───── En-tête ─────
          Sobre plutôt qu'en aplat dégradé, et surtout : il porte l'ÉCHÉANCE. Un étudiant
          ouvre son espace pour savoir ce qu'il lui reste à faire et combien de temps il
          lui reste pour le faire ; la fenêtre d'admission de trois mois décidait de tout
          sans être affichée nulle part. Le prénom et la salutation restent, mais ils ne
          sont plus ce que l'écran met en avant. */}
      <div className="bg-card rounded-2xl border border-border/60 p-5 sm:p-6">
        <div className="flex items-start justify-between flex-wrap gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="titre-affichage text-2xl sm:text-[28px] font-semibold">{firstName}</h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                {testStatus?.passed
                  ? <>Admis · {creds.length} credential{creds.length > 1 ? "s" : ""} au relevé</>
                  : "En attente d'admission"}
              </p>
            </div>
          </div>

          {/* La fenêtre d'admission, sur la même ligne que l'identité : c'est elle qui
              cadence tout le parcours, y compris la date des travaux de groupe. */}
          {testStatus?.passed && bord?.etudiant?.admissionExpire && (() => {
            const fin = new Date(bord.etudiant.admissionExpire).getTime();
            const restant = Math.max(0, Math.ceil((fin - Date.now()) / 86400000));
            const total = 13 * 7;
            const ecoule = Math.min(total, Math.max(0, total - restant));
            const semaine = Math.min(13, Math.floor(ecoule / 7) + 1);
            return (
              <div className="min-w-[220px]">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="sur-titre text-muted-foreground">Fin d'admission</span>
                  <span className="text-[11px] text-muted-foreground chiffres-tabulaires">semaine {semaine} / 13</span>
                </div>
                <div className="titre-affichage text-lg font-semibold mb-2 chiffres-tabulaires">
                  {new Date(bord.etudiant.admissionExpire).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </div>
                <BarreRemplissage pct={Math.round((ecoule / total) * 100)}
                  className="h-1.5" barre="bg-primary" />
                <p className="text-[11px] text-muted-foreground mt-1.5 chiffres-tabulaires">
                  {restant} jour{restant > 1 ? "s" : ""} restant{restant > 1 ? "s" : ""}
                </p>
              </div>
            );
          })()}

          {nextLesson ? (
            <button onClick={() => navigate(`/academy/classroom/${nextLesson.course_id}?lesson=${nextLesson.lesson_id}`)}
              className="bg-primary text-primary-foreground rounded-xl px-5 py-3 text-left hover:bg-primary/90 transition-colors pressable lift">
              <p className="sur-titre text-primary-foreground/70">À faire maintenant</p>
              <p className="font-bold text-sm max-w-[220px] truncate">{nextLesson.sms_lessons?.title || "Leçon disponible"}</p>
              <span className="text-xs flex items-center gap-1 mt-0.5">Continuer <ChevronRight className="w-3 h-3" /></span>
            </button>
          ) : !testStatus?.passed ? (
            <Button onClick={() => navigate("/elearning")} className="gap-2">
              <Target className="w-4 h-4" /> Passer le test d'admission
            </Button>
          ) : null}
        </div>
      </div>

      {/* ───── Alerte de retard ─────
          Placée avant tout le reste : la remise à zéro d'un parcours tombait jusqu'ici
          sans avoir été annoncée nulle part, et une règle qu'on découvre en la subissant
          n'en est pas une. Le texte vient de shared/retard.ts, comme celui de l'email. */}
      {testStatus?.passed && (
        <AlerteRetard constat={constatDepuisPlanning(schedule, bord?.etudiant?.admissionExpire)} />
      )}

      {/* ───── Alerte vérification email ───── */}
      {!emailVerified && (
        <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">Confirmez votre email pour pouvoir recevoir vos attestations et certificats.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/academy/verify")}>Confirmer maintenant</Button>
        </div>
      )}

      {/* ───── Stats cards ───── */}
      <MountStagger className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Moyenne générale", value: `${overall}%`, icon: TrendingUp, tint: "text-primary bg-primary/10" },
          { label: "Cours terminés", value: `${completedCourses}/${mesCours.length}`, icon: BookOpen, tint: "text-blue-600 bg-blue-500/10" },
          { label: "Credentials", value: creds.length, icon: Award, tint: "text-purple-600 bg-purple-500/10" },
          { label: "Évaluations", value: transcript?.totalGrades ?? 0, icon: CheckCircle2, tint: "text-emerald-600 bg-emerald-500/10" },
        ].map((s) => (
          <MountItem key={s.label} className="bg-card rounded-2xl border border-border/50 p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.tint}`}><s.icon className="w-[18px] h-[18px]" /></div>
            {/* Chasse fixe : sans elle, « 100 % » est plus large que « 88 % » et la rangée
                de chiffres sautille d'une carte à l'autre. */}
            <p className="text-[28px] leading-none font-bold chiffres-tabulaires tracking-tight">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{s.label}</p>
          </MountItem>
        ))}
      </MountStagger>

      {/* ───── Bannière test (non admis) ───── */}
      {testStatus && !testStatus.passed && emailVerified && (
        <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4" style={{ transform: "translateZ(0)" }}>
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

      {/* ───── Deux colonnes : le travail à gauche, le suivi à droite ─────
          Le planning et les credentials sont ce que l'étudiant vient consulter ; le
          calendrier, les réalisations et les ressources l'accompagnent sans lui disputer
          la place. Sur mobile la grille retombe en une colonne, dans cet ordre. */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
      {/* ───── Portefeuille de credentials (style Credly) ─────
          Avant, tant qu'aucun credential n'était décroché, la section n'existait tout
          simplement pas : un étudiant qui vient d'être admis n'avait aucune idée de ce
          qui l'attendait ni de ce à quoi ressemblerait son premier badge. On garde la
          section visible dès l'admission, avec un état vide qui montre le médaillon
          plutôt que de laisser un trou dans la page. */}
      {(creds.length > 0 || testStatus?.passed) && (
        <section id="credentials" className="scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Mon portefeuille de credentials</h2>
            <button onClick={() => navigate("/academy/certifications")} className="text-xs text-primary hover:underline flex items-center gap-1">Détail complet <ChevronRight className="w-3 h-3" /></button>
          </div>
          {creds.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {creds.map((cr) => (
                <CredentialCard key={cr.id} cred={cr} />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center">
              <IllustrationCredentialVide />
              <p className="font-medium mt-3">Aucun credential pour l'instant</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                Terminez votre premier cours pour décrocher un badge vérifiable — il apparaîtra ici, prêt à télécharger et à partager.
              </p>
            </div>
          )}
        </section>
      )}

        </div>
        <div className="space-y-6">
          {bord?.calendrier?.length > 0 && <Calendrier evenements={bord.calendrier} />}
          {bord?.realisations?.length > 0 && <Realisations realisations={bord.realisations} xp={bord.xp} />}
          {bord?.ressources?.length > 0 && <Ressources ressources={bord.ressources} />}
      {/* ───── Rencontres en ligne à venir ───── */}
      {meetings.length > 0 && (
        <section>
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
        </div>
      </div>

      {/* ───── Parcours ─────
          Les cours sont regroupés par parcours et non alignés dans une grille unique :
          un étudiant du cursus MEAL voyait la formation de formateurs au même rang que
          ses propres cours, sans savoir lequel comptait pour son certificat.
          Les ancres #parcours et #cours servent les liens du menu latéral. */}
      <div id="parcours" className="scroll-mt-24" />
      {/* ── Mes parcours ──
           Une carte par cursus, chacune menant à sa page. Le détail des cours et le planning
           vivent sur /academy/parcours/:id : les garder ici remettait les deux cursus dans le
           même écran, ce que la séparation était précisément censée éviter. */}
      <section id="cours" className="scroll-mt-24 grid sm:grid-cols-2 gap-4">
        {programGroups.map(({ program, courses }) => {
          const st = courses.map(co => enrollments.find((e: any) => e.course_id === co.id));
          const faits = st.filter((e: any) => e?.status === "completed").length;
          const pct = st.length
            ? Math.round(st.reduce((a: number, e: any) => a + (e?.progress || 0), 0) / st.length) : 0;
          return (
            <button key={program.id} onClick={() => navigate(`/academy/parcours/${program.id}`)}
              className="text-left rounded-2xl border border-border/50 bg-card overflow-hidden lift pressable spotlight">
              <div className="h-1.5" style={{ background: program.accent }} />
              <div className="p-5">
                <h3 className="titre-affichage text-[17px] font-semibold">{program.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{program.subtitle}</p>
                <div className="flex items-center justify-between text-xs mt-4 mb-1.5">
                  <span className="text-muted-foreground chiffres-tabulaires">{faits} / {courses.length} cours terminés</span>
                  <span className="font-semibold chiffres-tabulaires" style={{ color: program.accent }}>{pct} %</span>
                </div>
                {/* Se remplit depuis zéro : un 8 % et un 80 % immobiles se ressemblent au
                    coin de l'œil, remplis jamais. */}
                <BarreRemplissage pct={pct} className="h-2" couleur={program.accent} />
                <span className="inline-flex items-center gap-1 text-xs font-medium mt-4"
                  style={{ color: program.accent }}>
                  Ouvrir ce parcours <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </section>

      {/* ───── Relevé de notes condensé ───── */}
      {transcript && transcript.grades?.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Mon relevé de notes</h2>
            <button onClick={() => navigate("/academy/grades")} className="text-xs text-primary hover:underline flex items-center gap-1">Détail complet <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <div className="flex gap-3 flex-wrap mb-4">
              <div className="bg-primary/10 rounded-xl px-4 py-2.5">
                <p className="text-[11px] text-muted-foreground">Moyenne générale</p>
                <p className="text-xl font-bold text-primary chiffres-tabulaires">{transcript.overall}%</p>
              </div>
              {transcript.courseAverages?.map((ca: any) => (
                <div key={ca.code} className="bg-muted rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">{ca.code}</p>
                  <p className="text-base font-bold chiffres-tabulaires">{ca.average}%</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {transcript.grades.slice(-4).reverse().map((g: any) => {
                const pct = Math.round(Number(g.score) / Number(g.max_score) * 100);
                return (
                  <div key={g.id} className="flex items-center justify-between text-sm py-1.5">
                    <span className="truncate flex-1 text-muted-foreground">{g.title}</span>
                    <span className={`font-semibold ml-3 chiffres-tabulaires ${pct >= 70 ? "text-primary" : pct >= 50 ? "text-amber-600" : "text-destructive"}`}>{pct}%</span>
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

/**
 * Illustration du portefeuille vide — un médaillon plutôt qu'un trou dans la page.
 *
 * Tracé main, aux couleurs exactes de la marque (--primary #085e41, --accent #16a260) :
 * pas une photo de stock, pas une capture d'une autre app, juste de quoi montrer à quoi
 * ressemblera le premier badge sans attendre qu'il existe.
 */
function IllustrationCredentialVide() {
  return (
    <svg viewBox="0 0 200 160" className="w-40 h-32 mx-auto" fill="none" aria-hidden="true">
      <ellipse cx="100" cy="146" rx="56" ry="7" fill="#0f172908" />
      <g transform="rotate(-7 100 82)">
        <rect x="53" y="23" width="94" height="118" rx="10" fill="#f1f5f9" stroke="#e1e7ef" strokeWidth="1.5" />
      </g>
      <g transform="rotate(4 100 82)">
        <rect x="50" y="19" width="100" height="122" rx="10" fill="#fcfcfd" stroke="#e1e7ef" strokeWidth="1.5" />
        <rect x="66" y="40" width="52" height="6" rx="3" fill="#e1e7ef" />
        <rect x="66" y="54" width="68" height="6" rx="3" fill="#e1e7ef" />
        <circle cx="100" cy="102" r="22" fill="#085e41" />
        <circle cx="100" cy="102" r="22" fill="none" stroke="#16a260" strokeWidth="2.5" strokeDasharray="3.5 3" />
        <path d="M91 102l6 6 12-13" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M90 121l-8 17 10-4 6 8 4-19z" fill="#16a260" />
        <path d="M110 121l8 17-10-4-6 8-4-19z" fill="#085e41" />
      </g>
      <path d="M38 48l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#16a260" opacity="0.55" />
      <path d="M162 94l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" fill="#085e41" opacity="0.45" />
    </svg>
  );
}

// ───── Carte de credential (style Credly) ─────
export function CredentialCard({ cred }: { cred: Cred }) {
  const expired = cred.status === "expired";
  const issued = cred.issued_at ? new Date(cred.issued_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
  const isFinal = cred.type === "final";
  return (
    <div className={`group relative bg-card rounded-2xl border overflow-hidden lift spotlight ${expired ? "border-border/50 opacity-75" : "border-border/50 hover:border-primary/30"}`}>
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
        <h3 className="titre-affichage text-[15px] font-semibold mt-3">{cred.title}</h3>
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

      {/* Pied de carte : empilé, pas côte à côte.
          Ces cartes tombent dans une grille à trois colonnes logée dans les deux tiers de
          la page — environ 255 pixels. Score et date d'un côté, deux boutons de l'autre,
          et « Score 88 % » passait à la ligne pendant que la date se coupait à « 23 ao… ».
          Une ligne de méta, puis les actions en pleine largeur : plus rien ne se dispute
          la place, à toutes les largeurs. */}
      <div className="px-5 py-3 border-t border-border/40 space-y-2.5">
        <div className="flex items-baseline gap-2 text-[11px] min-w-0">
          {cred.score != null && (
            <span className="font-semibold chiffres-tabulaires shrink-0" style={{ color: cred.color }}>
              {cred.score}%
            </span>
          )}
          <span className="text-muted-foreground truncate">{issued}</span>
        </div>
        <div className="flex gap-1.5">
          {cred.download_url && (
            <a href={`${cred.download_url}`} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs w-full"><Download className="w-3.5 h-3.5" /> PDF</Button>
            </a>
          )}
          {cred.certificate_no && (
            <a href={`/academy/verify-certificate/${cred.certificate_no}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-8 px-2.5" title="Page de vérification publique">
                <ShieldCheck className="w-3.5 h-3.5" />
              </Button>
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

// ═══════════════ Panneaux latéraux ═══════════════

/** Coquille commune : même en-tête, même bordure, pour que les panneaux se lisent en série. */
export function Bloc({ titre, icone: Icone, action, children, id }: {
  titre: string; icone: any; action?: React.ReactNode; children: React.ReactNode; id?: string;
}) {
  return (
    <section id={id} className="bg-card rounded-2xl border border-border/50 scroll-mt-24">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Icone className="w-4 h-4 text-primary" /> {titre}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Calendrier du mois, avec les jours porteurs d'une échéance ou d'une rencontre.
 *
 * La grille commence toujours un lundi : construite naïvement à partir du 1er du mois, elle
 * décalerait toutes les dates d'un ou plusieurs jours selon le jour de la semaine.
 */
/**
 * Une ligne « travail de groupe » dans le planning hebdomadaire.
 *
 * Elle se distingue d'une leçon par le trait qui compte : ce n'est pas un travail qu'on
 * fait seul. Le nom du groupe est donc affiché à même la ligne — sans lui, l'étudiant ne
 * sait pas à qui écrire, et le rendu attend.
 */
function LigneTravailGroupe({ t, groupe, onOuvrir }:
  { t: any; groupe?: { nom: string } | null; onOuvrir: () => void }) {
  const isDone = t.statut === "completed";
  const isSubmitted = t.statut === "submitted";
  const isMissed = t.statut === "missed";
  const isAvail = t.statut === "available";
  const isOpen = isAvail || isMissed || isSubmitted;

  return (
    <div className={`flex items-center gap-3 p-3.5 ${isOpen && !isSubmitted ? "bg-primary/5" : ""}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        isDone ? "bg-primary text-white"
        : isSubmitted ? "bg-blue-500/15 text-blue-600"
        : isAvail ? "bg-primary/15 text-primary"
        : isMissed ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground"}`}>
        {isDone ? <CheckCircle2 className="w-4 h-4" />
          : isSubmitted ? <Clock className="w-4 h-4" />
          : isOpen ? <Users className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{t.titre}</p>
        <p className="text-xs text-muted-foreground truncate">
          <span className="font-mono">GW{t.index}</span>
          {groupe?.nom ? ` · ${groupe.nom}` : " · travail de groupe"}
          {" · "}
          {isDone ? `Corrigé — ${t.note}/${t.maxScore}`
            : isSubmitted ? "Rendu — en cours de correction"
            : isMissed ? "En retard — à rattraper"
            : isAvail ? `À rendre avant le ${new Date(t.echeanceLe).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
            : `S'ouvre le ${new Date(t.ouvertureLe).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
        </p>
      </div>
      {isOpen && (
        <Button size="sm" variant={isAvail && !isSubmitted ? "default" : "outline"}
          onClick={onOuvrir} className="shrink-0 gap-1.5">
          <Send className="w-3.5 h-3.5" />
          {isSubmitted ? "Voir" : isMissed ? "Rattraper" : "Déposer"}
        </Button>
      )}
    </div>
  );
}

export function Calendrier({ evenements }: { evenements: any[] }) {
  const [decalage, setDecalage] = useState(0);
  const aujourdhui = new Date();
  const vue = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + decalage, 1);

  const premierJour = new Date(vue.getFullYear(), vue.getMonth(), 1);
  const nbJours = new Date(vue.getFullYear(), vue.getMonth() + 1, 0).getDate();
  // getDay() renvoie 0 pour dimanche ; la semaine française commence le lundi.
  const debutLundi = (premierJour.getDay() + 6) % 7;

  const cle = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parJour: Record<string, any[]> = {};
  for (const e of evenements) {
    const k = cle(new Date(e.date));
    (parJour[k] ||= []).push(e);
  }

  const cases: (number | null)[] = [
    ...Array<null>(debutLundi).fill(null),
    ...Array.from({ length: nbJours }, (_, i) => i + 1),
  ];

  return (
    <Bloc titre="Mon calendrier" icone={Calendar}
      action={
        <div className="flex items-center gap-1">
          <button onClick={() => setDecalage(d => d - 1)} aria-label="Mois précédent"
            className="w-6 h-6 rounded-md hover:bg-muted grid place-items-center text-muted-foreground">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </button>
          <span className="text-xs font-medium min-w-[92px] text-center capitalize">
            {vue.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </span>
          <button onClick={() => setDecalage(d => d + 1)} aria-label="Mois suivant"
            className="w-6 h-6 rounded-md hover:bg-muted grid place-items-center text-muted-foreground">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      }>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(j => (
            <span key={j} className="text-[10px] text-muted-foreground text-center font-medium">{j}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cases.map((n, i) => {
            if (n === null) return <span key={`v${i}`} />;
            const d = new Date(vue.getFullYear(), vue.getMonth(), n);
            const evts = parJour[cle(d)] || [];
            const estAujourdhui = cle(d) === cle(aujourdhui);
            const aRencontre = evts.some(e => e.type === "rencontre");
            const aGroupe = evts.some(e => e.type === "travail_groupe");
            const enRetard = evts.some(e =>
              (e.type === "echeance" || e.type === "travail_groupe") && e.statut === "missed");
            return (
              <span key={n}
                title={evts.map(e => `${e.titre}${e.detail ? ` — ${e.detail}` : ""}`).join("\n") || undefined}
                className={`relative aspect-square grid place-items-center rounded-lg text-xs ${
                  estAujourdhui ? "bg-primary text-primary-foreground font-bold"
                  : evts.length ? "bg-muted font-medium cursor-help" : "text-muted-foreground"
                }`}>
                {n}
                {evts.length > 0 && !estAujourdhui && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${
                    enRetard ? "bg-destructive" : aGroupe ? "bg-amber-500"
                      : aRencontre ? "bg-violet-500" : "bg-primary"}`} />
                )}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border/40">
          {[["bg-primary", "échéance"], ["bg-amber-500", "travail de groupe"],
            ["bg-violet-500", "rencontre"], ["bg-destructive", "en retard"]].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full ${c}`} /> {l}
            </span>
          ))}
        </div>
      </div>
    </Bloc>
  );
}

/** Réalisations obtenues, puis celles qui restent à décrocher — la suite compte autant que l'acquis. */
export function Realisations({ realisations, xp }: { realisations: any[]; xp: any }) {
  const obtenues = realisations.filter(r => r.obtenue);
  const restantes = realisations.filter(r => !r.obtenue);
  const pct = xp?.seuilSuivant != null
    ? Math.min(100, Math.max(0, Math.round(((xp.total - xp.seuilActuel) / (xp.seuilSuivant - xp.seuilActuel)) * 100)))
    : 100;

  return (
    <Bloc titre="Mes réalisations" icone={Trophy}
      action={<span className="text-xs text-muted-foreground">{obtenues.length}/{realisations.length}</span>}>
      <div className="p-3 space-y-1">
        {obtenues.map(r => (
          <div key={r.cle} className="flex items-center gap-3 px-2 py-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Trophy className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium leading-tight truncate">{r.titre}</span>
              <span className="block text-[11px] text-muted-foreground leading-tight truncate">{r.detail}</span>
            </span>
            <span className="text-[11px] font-bold text-primary shrink-0">+{r.xp} XP</span>
          </div>
        ))}
        {restantes.slice(0, 2).map(r => (
          <div key={r.cle} className="flex items-center gap-3 px-2 py-2 opacity-55">
            <span className="w-9 h-9 rounded-xl bg-muted grid place-items-center shrink-0">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium leading-tight truncate">{r.titre}</span>
              <span className="block text-[11px] text-muted-foreground leading-tight truncate">{r.detail}</span>
            </span>
            <span className="text-[11px] text-muted-foreground shrink-0">+{r.xp} XP</span>
          </div>
        ))}
      </div>

      {xp && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[11px] text-muted-foreground">Votre niveau</span>
            <span className="text-sm font-bold text-primary">{xp.total} XP</span>
          </div>
          <p className="text-[13px] font-semibold mb-2">{xp.titre}</p>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {xp.seuilSuivant != null
              ? `${xp.restantPourNiveauSuivant} XP pour « ${xp.titreSuivant} »`
              : "Palier le plus élevé atteint"}
          </p>
        </div>
      )}
    </Bloc>
  );
}

/** Ressources des leçons ouvertes. Ce sont des liens externes, pas des fichiers : le dire. */
export function Ressources({ ressources }: { ressources: any[] }) {
  return (
    <Bloc id="ressources" titre="Ressources utiles" icone={BookOpen}
      action={<span className="text-xs text-muted-foreground">{ressources.length}</span>}>
      <div className="p-3 space-y-0.5">
        {ressources.slice(0, 6).map(r => (
          <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/60 transition-colors">
            <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 grid place-items-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium leading-tight truncate">{r.titre}</span>
              <span className="block text-[11px] text-muted-foreground leading-tight truncate">
                {[r.fournisseur, r.cours].filter(Boolean).join(" · ") || "Lien externe"}
              </span>
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </a>
        ))}
      </div>
    </Bloc>
  );
}
