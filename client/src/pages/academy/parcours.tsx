import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import {
  Loader2, BookOpen, Calendar, CheckCircle2, Trophy, ChevronRight,
  Lock, Clock, ArrowLeft, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";
import { isStudentLoggedIn, studentFetch } from "@/lib/student";
import { PROGRAMS, programOf, programById, type Program } from "@shared/programs";

/**
 * Un parcours, une page.
 *
 * Les deux cursus de LouisFarm — le MEAL et la formation de formateurs — n'ont ni le même
 * public, ni le même métier, ni le même certificat. Tant qu'ils cohabitaient sur le tableau
 * de bord, la séparation restait cosmétique : on lisait toujours ses cours de cartographie et
 * ses cours d'animation rurale dans le même écran, l'un sous l'autre, comme un programme
 * unique dont on aurait pris du retard sur une moitié.
 *
 * Chaque parcours a donc désormais son adresse, son planning et sa progression. Le tableau de
 * bord garde le rôle d'accueil : il dit où l'on en est dans chacun et renvoie ici.
 */

type Ligne = any;

export default function AcademyParcours() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/academy/parcours/:id");
  const programId = params?.id ?? "";

  const [chargement, setChargement] = useState(true);
  const [cours, setCours] = useState<any[]>([]);
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [planning, setPlanning] = useState<Ligne[]>([]);
  const [voirTermines, setVoirTermines] = useState(false);
  const [toutesSemaines, setToutesSemaines] = useState(false);

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => {
      try {
        const [c, e, s] = await Promise.all([
          fetch("/api/academy/courses").then(r => r.json()).catch(() => []),
          studentFetch("/api/academy/my-enrollments").then(r => r.json()).catch(() => []),
          studentFetch("/api/academy/lesson-schedule").then(r => r.json()).catch(() => []),
        ]);
        setCours(Array.isArray(c) ? c : []);
        setInscriptions(Array.isArray(e) ? e : []);
        setPlanning(Array.isArray(s) ? s : []);
      } finally { setChargement(false); }
    })();
  }, [programId]);

  if (chargement) {
    return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Un identifiant inconnu ne doit pas afficher une page vide qui laisserait croire que le
  // parcours n'a pas de contenu : on le dit, et on renvoie à l'accueil.
  let parcours: Program;
  try { parcours = programById(programId); }
  catch {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <p className="font-semibold">Ce parcours n'existe pas</p>
        <p className="text-sm text-muted-foreground mt-2">
          Le lien que vous avez suivi ne correspond à aucun parcours de la plateforme.
        </p>
        <Button variant="outline" className="mt-5 gap-2" onClick={() => navigate("/academy/dashboard")}>
          <ArrowLeft className="w-4 h-4" /> Retour à mon espace
        </Button>
      </div>
    );
  }

  const coursDuParcours = cours.filter(c => programOf(c.code)?.id === programId);
  const idsCours = new Set(coursDuParcours.map(c => c.id));
  const lignes = planning.filter(l => idsCours.has(l.course_id));

  // Accès réel : inscrit à au moins un cours, ou une leçon planifiée. Se fier à la seule
  // inscription ferait apparaître « pas encore admis » à un étudiant dont le planning existe
  // et qui travaille dedans.
  const inscrit = coursDuParcours.some(c => inscriptions.some(i => i.course_id === c.id)) || lignes.length > 0;

  const stats = coursDuParcours.map(co => {
    const enr = inscriptions.find(i => i.course_id === co.id);
    return { co, enr, prog: enr?.progress || 0, done: enr?.status === "completed" };
  });
  const termines = stats.filter(s => s.done).length;
  const pourcent = stats.length ? Math.round(stats.reduce((a, s) => a + s.prog, 0) / stats.length) : 0;
  const visibles = voirTermines ? stats : stats.filter(s => !s.done);

  const semaines: { index: number; lignes: Ligne[] }[] = [];
  for (const l of lignes) {
    let s = semaines.find(x => x.index === l.week_index);
    if (!s) { s = { index: l.week_index, lignes: [] }; semaines.push(s); }
    s.lignes.push(l);
  }
  semaines.sort((a, b) => a.index - b.index);
  const semaineCourante = semaines.find(s => s.lignes.some(l => l.status !== "completed"))?.index ?? 1;
  const semainesVues = toutesSemaines ? semaines : semaines.filter(s => s.index <= semaineCourante + 1);
  const masquees = semaines.length - semainesVues.length;

  const prochaine = lignes.find(l => l.status === "available" || l.status === "missed");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SEO title={`${parcours.title} — LouisFarm Learning`} description={parcours.subtitle} />

      {/* ── En-tête du parcours ── */}
      <div className="rounded-2xl border border-border/50 overflow-hidden">
        <div className="h-1.5" style={{ background: parcours.accent }} />
        <div className="p-5 sm:p-6 bg-card">
          <Link href="/academy/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Mon espace
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">{parcours.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{parcours.subtitle}</p>
              <p className="text-sm mt-2">{parcours.outcome}</p>
            </div>
            {parcours.credential && (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border shrink-0 ${
                termines === stats.length && stats.length > 0
                  ? "border-transparent text-white" : "border-dashed border-border text-muted-foreground"}`}
                style={termines === stats.length && stats.length > 0 ? { background: parcours.accent } : undefined}>
                <Trophy className="w-3.5 h-3.5" /> {parcours.credential}
              </span>
            )}
          </div>

          {inscrit ? (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{termines} / {stats.length} cours terminés</span>
                <span className="font-semibold" style={{ color: parcours.accent }}>{pourcent} %</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pourcent}%`, background: parcours.accent }} />
              </div>
            </div>
          ) : (
            // Ne pas afficher un planning vide comme si l'étudiant avait pris du retard :
            // il n'a simplement pas encore passé le test d'admission de CE parcours.
            <div className="mt-5 p-4 rounded-2xl bg-muted/50">
              <p className="font-medium text-sm">Vous n'êtes pas encore inscrit(e) à ce parcours</p>
              <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                Il a sa propre admission : {parcours.admission.seuil} bonnes réponses
                sur {parcours.admission.nbQuestions}. Le réussir n'enlève rien à vos autres
                parcours, et n'en dépend pas non plus.
              </p>
              <Button size="sm" className="mt-3 gap-1.5 border-0 text-white"
                style={{ background: parcours.accent }}
                onClick={() => navigate(
                  // Le cursus MEAL garde son test historique sur la page publique ; les autres
                  // parcours ont le leur, à leur propre adresse.
                  programId === "meal" ? "/elearning" : `/academy/test/${programId}`
                )}>
                Passer le test d'admission <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Reprendre où l'on s'est arrêté ── */}
      {prochaine && (
        <button
          onClick={() => navigate(`/academy/classroom/${prochaine.course_id}?lesson=${prochaine.lesson_id}`)}
          className="w-full text-left rounded-2xl border p-4 sm:p-5 hover:shadow-md transition-shadow"
          style={{ borderColor: `${parcours.accent}40`, background: `${parcours.accent}0A` }}>
          <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: parcours.accent }}>
            {prochaine.status === "missed" ? "En retard — à reprendre" : "Prochaine leçon"}
          </p>
          <p className="font-semibold mt-1">{prochaine.sms_lessons?.title || "Leçon suivante"}</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">{prochaine.sms_courses?.title}</p>
        </button>
      )}

      {/* ── Les cours du parcours ── */}
      {stats.length > 0 && (
        <section>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5" style={{ color: parcours.accent }} /> Les cours
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibles.map(({ co, enr, prog, done }) => (
              <div key={co.id}
                className={`bg-card rounded-2xl border overflow-hidden flex flex-col ${done ? "border-border/40 opacity-80" : "border-border/50"}`}>
                <div className="h-1" style={{ background: done ? parcours.accent : `${parcours.accent}40` }} />
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold" style={{ color: parcours.accent }}>{co.code}</span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">{co.level}</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-2 leading-snug">{co.title}</h3>
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2 flex-1">{co.description}</p>
                  {enr && (
                    <>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                        <div className="h-full rounded-full" style={{ width: `${prog}%`, background: parcours.accent }} />
                      </div>
                      <Button size="sm" variant={done ? "outline" : "default"} className="w-full gap-1.5"
                        onClick={() => navigate(`/academy/classroom/${co.id}`)}>
                        {done ? <><CheckCircle2 className="w-3.5 h-3.5" /> Revoir</> : <>Continuer <ChevronRight className="w-3.5 h-3.5" /></>}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {termines > 0 && (
            <button onClick={() => setVoirTermines(v => !v)}
              className="text-xs text-muted-foreground hover:underline mt-3">
              {voirTermines ? "Masquer les cours terminés" : `Voir les ${termines} cours terminé${termines > 1 ? "s" : ""}`}
            </button>
          )}
        </section>
      )}

      {/* ── Le planning du parcours ── */}
      {semaines.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: parcours.accent }} /> Mon planning
            </h2>
            <span className="text-xs text-muted-foreground">
              Rythme conseillé — vous pouvez prendre de l'avance
            </span>
          </div>
          <div className="space-y-3">
            {semainesVues.map(s => {
              const faites = s.lignes.filter(l => l.status === "completed").length;
              return (
                <div key={s.index} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40">
                    <span className="text-xs font-semibold">Semaine {s.index}</span>
                    <span className="text-[11px] text-muted-foreground">{faites} / {s.lignes.length}</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {s.lignes.map(l => (
                      <button key={l.id}
                        onClick={() => l.status !== "locked" && navigate(`/academy/classroom/${l.course_id}?lesson=${l.lesson_id}`)}
                        disabled={l.status === "locked"}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          l.status === "locked" ? "opacity-55 cursor-default" : "hover:bg-muted/50"}`}>
                        <span className="shrink-0">
                          {l.status === "completed" ? <CheckCircle2 className="w-4 h-4" style={{ color: parcours.accent }} />
                            : l.status === "locked" ? <Lock className="w-4 h-4 text-muted-foreground" />
                            : <Clock className="w-4 h-4 text-muted-foreground" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium truncate">
                            {l.sms_lessons?.title || `Leçon ${l.lesson_id}`}
                          </span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {l.sms_courses?.title}
                          </span>
                        </span>
                        {l.status === "missed" && (
                          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">
                            en retard
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {masquees > 0 && (
              <button onClick={() => setToutesSemaines(true)}
                className="w-full text-xs text-muted-foreground hover:text-primary py-2.5 rounded-xl border border-dashed border-border/60 hover:border-primary/40 transition-colors">
                Voir les {masquees} semaine{masquees > 1 ? "s" : ""} suivante{masquees > 1 ? "s" : ""}
              </button>
            )}
            {toutesSemaines && semaines.length > 2 && (
              <button onClick={() => setToutesSemaines(false)}
                className="w-full text-xs text-muted-foreground hover:text-primary py-2.5 rounded-xl border border-dashed border-border/60 hover:border-primary/40 transition-colors">
                Réduire le planning
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── L'autre parcours, en pied de page ──
           Un lien discret, pour que la séparation ne se transforme pas en cloisonnement :
           on doit pouvoir passer de l'un à l'autre sans repasser par l'accueil. */}
      <div className="flex flex-wrap gap-2 pt-2">
        {PROGRAMS.filter(p => p.id !== programId).map(p => (
          <Link key={p.id} href={`/academy/parcours/${p.id}`}
            className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-xl border border-border/60 hover:bg-muted transition-colors">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: p.accent }} />
            Voir « {p.title} »
          </Link>
        ))}
      </div>
    </div>
  );
}
