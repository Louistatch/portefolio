import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { studentFetch, isStudentLoggedIn } from "@/lib/student";
import { groupByProgram } from "@shared/programs";
import { Award, ArrowLeft, Loader2, ShieldCheck, TrendingUp, Lock } from "lucide-react";
import { CredentialCard, type Cred } from "./dashboard";

type Onglet = "tous" | "cours" | "parcours" | "expires";
const ONGLETS: [Onglet, string][] = [["tous", "Tous"], ["cours", "Cours"], ["parcours", "Parcours"], ["expires", "Expirés"]];
const FILTRES: Record<Onglet, (c: Cred) => boolean> = {
  tous: () => true,
  cours: c => c.type === "course",
  parcours: c => c.type === "final" || c.type === "admission",
  expires: c => c.status === "expired",
};

/**
 * Mes certifications — la page dédiée que le menu promettait déjà.
 *
 * Le lien « Certifications » du menu renvoyait jusqu'ici à l'ancre #credentials du tableau
 * de bord : pas de filtre, pas de vue d'ensemble, juste la même grille condensée. Cette page
 * reprend le même portefeuille (mêmes cartes, mêmes données de /api/academy/my-credentials)
 * mais lui donne sa propre place, avec des onglets et un aperçu du prochain badge à venir.
 */
export default function AcademyCertifications() {
  const [, navigate] = useLocation();
  const [creds, setCreds] = useState<Cred[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [onglet, setOnglet] = useState<Onglet>("tous");

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => {
      try {
        const [cr, e, ac, sch] = await Promise.all([
          studentFetch("/api/academy/my-credentials").then(r => r.json()).catch(() => null),
          studentFetch("/api/academy/my-enrollments").then(r => r.json()).catch(() => []),
          fetch("/api/academy/courses").then(r => r.json()).catch(() => []),
          studentFetch("/api/academy/lesson-schedule").then(r => r.json()).catch(() => []),
        ]);
        setCreds(cr?.credentials || []);
        setEnrollments(Array.isArray(e) ? e : []);
        setAllCourses(Array.isArray(ac) ? ac : []);
        setSchedule(Array.isArray(sch) ? sch : []);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const scores = creds.map(c => c.score).filter((s): s is number => s != null);
  const scoreMoyen = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // Prochain jalon : le premier parcours accessible où il reste des cours à terminer — calculé
  // comme les cartes de parcours du tableau de bord (faits/total), pas un chiffre inventé.
  const idsAccessibles = new Set<number>([
    ...enrollments.map((e: any) => e.course_id),
    ...schedule.map((s: any) => s.course_id),
  ]);
  const mesCours = (allCourses as any[]).filter(c => idsAccessibles.has(c.id));
  const prochain = groupByProgram(mesCours)
    .map(({ program, courses }) => ({
      program, total: courses.length,
      faits: courses.filter(co => enrollments.find((e: any) => e.course_id === co.id)?.status === "completed").length,
    }))
    .find(p => p.total > 0 && p.faits < p.total);

  const visibles = creds.filter(FILTRES[onglet]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SEO title="Mes certifications — LouisFarm Learning" description="Vos badges vérifiables, un pour chaque cours et chaque parcours terminé." />
      <button onClick={() => navigate("/academy/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Tableau de bord
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="titre-affichage text-2xl sm:text-[28px] font-semibold flex items-center gap-2"><Award className="w-6 h-6 text-primary" /> Mes certifications</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">Vos badges vérifiables, un pour chaque cours et chaque parcours terminé — téléchargeables et prêts à partager.</p>
        </div>
        {creds.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold bg-primary/10 text-primary px-3.5 py-2 rounded-full shrink-0">
            <Award className="w-4 h-4" /> {creds.length} obtenu{creds.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {creds.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
          <Award className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Aucun credential pour l'instant</p>
          <p className="text-sm text-muted-foreground mt-1.5">Terminez votre premier cours pour décrocher un badge vérifiable.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-card rounded-2xl border border-border/50 p-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3"><Award className="w-[18px] h-[18px]" /></div>
              <p className="text-2xl font-bold chiffres-tabulaires">{creds.length}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Credentials au relevé</p>
            </div>
            <div className="bg-card rounded-2xl border border-border/50 p-4">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3"><TrendingUp className="w-[18px] h-[18px]" /></div>
              <p className="text-2xl font-bold chiffres-tabulaires">{scoreMoyen != null ? `${scoreMoyen}%` : "—"}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Score moyen des badges</p>
            </div>
            <div className="bg-card rounded-2xl border border-border/50 p-4">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3"><Lock className="w-[18px] h-[18px]" /></div>
              <p className="text-2xl font-bold chiffres-tabulaires">{prochain ? `${prochain.total - prochain.faits}` : "—"}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{prochain ? `Cours avant le badge ${prochain.program.title}` : "Aucun badge en préparation"}</p>
            </div>
          </div>

          <div className="inline-flex gap-1 p-1 bg-muted rounded-2xl w-fit">
            {ONGLETS.map(([k, l]) => (
              <button key={k} onClick={() => setOnglet(k)}
                className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${onglet === k ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {l}
              </button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Aucun credential dans cette catégorie.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibles.map(cr => <CredentialCard key={cr.id} cred={cr} />)}
            </div>
          )}

          {prochain && (
            <div className="bg-card rounded-2xl border border-dashed border-border p-5 flex items-center gap-4 max-w-xl">
              <span className="w-12 h-12 rounded-2xl bg-muted grid place-items-center shrink-0"><Lock className="w-5 h-5 text-muted-foreground" /></span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Prochain badge : {prochain.program.title}</p>
                <div className="flex items-center justify-between text-xs mt-2.5 mb-1.5">
                  <span className="text-muted-foreground chiffres-tabulaires">{prochain.faits} / {prochain.total} cours terminés</span>
                  <span className="font-semibold chiffres-tabulaires" style={{ color: prochain.program.accent }}>{Math.round(prochain.faits / prochain.total * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.round(prochain.faits / prochain.total * 100)}%`, background: prochain.program.accent }} />
                </div>
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border/50 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <p className="text-sm font-semibold">Chaque certification est vérifiable publiquement</p>
              <p className="text-xs text-muted-foreground mt-0.5">Un numéro unique permet à un recruteur de confirmer son authenticité, sans compte ni mot de passe.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
