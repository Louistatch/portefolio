import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, TrendingUp, Download, FileText, BookOpen, Award, Route,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn, downloadStudentFile } from "@/lib/student";

/**
 * Mes notes — un relevé par parcours, pas une seule liste qui mélange tout.
 *
 * Un étudiant inscrit à plusieurs cursus (le MEAL et les Coopératives, par exemple) voyait
 * toutes ses notes entremêlées dans une seule liste chronologique — impossible d'y lire sa
 * progression dans un cursus précis. Le serveur renvoie désormais `transcript.parcours`, un
 * détail déjà séparé par cursus (voir construireTranscript dans api/index.ts) ; cette page se
 * contente de l'afficher section par section, avec l'accent propre à chaque parcours.
 */
export default function AcademyGrades() {
  const [, navigate] = useLocation();
  const [transcript, setTranscript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => {
      try {
        const tr = await studentFetch("/api/academy/transcript").then(r => r.json());
        setTranscript(tr);
      } finally { setLoading(false); }
    })();
  }, []);

  async function telecharger() {
    setDownloading(true);
    try { await downloadStudentFile("/api/academy/transcript/pdf", "releve-de-notes"); }
    catch { alert("Téléchargement impossible, réessayez."); }
    finally { setDownloading(false); }
  }

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!transcript) return null;

  const grades = transcript.grades || [];
  const parcours: { programId: string; titre: string; accent: string; overall: number; totalGrades: number; courseAverages: { code: string; title: string; average: number }[]; grades: any[] }[] = transcript.parcours || [];

  // Au sein d'un parcours, regroupement par cours dans l'ordre chronologique déjà fourni par
  // le serveur : c'est ce qui permet de lire une évolution (premier essai → dernier), pas
  // seulement une moyenne.
  function parCoursDe(notesParcours: any[]) {
    const parCours: Record<string, { code: string; title: string; grades: any[] }> = {};
    for (const g of notesParcours) {
      const horsCours = g.type === "group_work"
        ? { code: "GROUP-WORK", title: "Travaux de groupe" }
        : { code: "ADMISSION", title: "Test d'admission" };
      const code = g.sms_courses?.code || horsCours.code;
      if (!parCours[code]) parCours[code] = { code, title: g.sms_courses?.title || horsCours.title, grades: [] };
      parCours[code].grades.push(g);
    }
    return Object.values(parCours);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <SEO title="Mes notes — LouisFarm Learning" description="Votre évolution et votre relevé de notes, par parcours." />
      <button onClick={() => navigate("/academy/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Tableau de bord
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-primary" /> Mes notes</h1>
          <p className="text-sm text-muted-foreground mt-1">Un relevé par parcours — votre évolution dans chaque cours, et le détail complet.</p>
        </div>
        {grades.length > 0 && (
          <Button className="gap-2" disabled={downloading} onClick={telecharger}>
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Télécharger en PDF
          </Button>
        )}
      </div>

      {grades.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
          <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Aucune note pour l'instant</p>
          <p className="text-sm text-muted-foreground mt-1.5">Vos notes apparaîtront ici au fil de vos leçons et évaluations.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3 flex-wrap mb-8">
            <div className="bg-primary/10 rounded-xl px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground">Moyenne générale</p>
              <p className="text-xl font-bold text-primary">{transcript.overall}%</p>
            </div>
            <div className="bg-muted rounded-xl px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground">Évaluations</p>
              <p className="text-xl font-bold">{transcript.totalGrades}</p>
            </div>
          </div>

          <div className="space-y-10">
            {parcours.map(p => {
              const cours = parCoursDe(p.grades);
              return (
                <section key={p.programId}>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-3 border-b-2" style={{ borderColor: p.accent }}>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Route className="w-5 h-5" style={{ color: p.accent }} /> {p.titre}
                    </h2>
                    <span className="text-sm font-bold" style={{ color: p.accent }}>{p.overall}% — {p.totalGrades} évaluation{p.totalGrades > 1 ? "s" : ""}</span>
                  </div>

                  {/* Évolution par cours */}
                  <div className="space-y-4 mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Évolution par cours</h3>
                    {cours.map(c => {
                      // Le test d'admission et les travaux de groupe n'ont pas de cours réel derrière
                      // eux : le serveur ne calcule pas leur moyenne dans courseAverages (qui ne connaît
                      // que les vrais cours). On la calcule donc ici, directement à partir des notes déjà
                      // affichées — ça marche pour un vrai cours comme pour ces groupes synthétiques.
                      const pourcentages = c.grades.map((g: any) => Number(g.score) / Number(g.max_score) * 100);
                      const moyenne = Math.round(pourcentages.reduce((a: number, b: number) => a + b, 0) / pourcentages.length);
                      return (
                        <div key={c.code} className="bg-card rounded-2xl border border-border/50 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-medium text-sm">{c.title}</p>
                            <span className="text-sm font-bold" style={{ color: p.accent }}>{moyenne}%</span>
                          </div>
                          {/* Chaque barre est une évaluation, dans l'ordre où elle a été obtenue :
                              la lecture de gauche à droite EST l'évolution, sans bibliothèque de graphe. */}
                          <div className="flex items-end gap-1.5 h-16">
                            {c.grades.map((g: any, i: number) => {
                              const pct = Math.round(Number(g.score) / Number(g.max_score) * 100);
                              return (
                                <div key={g.id ?? i} title={`${g.title} — ${pct}%`}
                                  className="flex-1 min-w-[6px] max-w-[28px] flex flex-col items-center justify-end h-full">
                                  <div className="w-full rounded-t" style={{ height: `${Math.max(pct, 6)}%`, background: p.accent }} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Relevé du parcours */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> Relevé de ce parcours</h3>
                    <div className="bg-card rounded-2xl border border-border/50 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-muted-foreground text-xs border-b border-border/50">
                          <tr>
                            <th className="text-left py-2.5 px-4">Évaluation</th>
                            <th className="text-left py-2.5 px-3 hidden sm:table-cell">Cours</th>
                            <th className="text-right py-2.5 px-4">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...p.grades].reverse().map((g: any) => {
                            const pct = Math.round(Number(g.score) / Number(g.max_score) * 100);
                            return (
                              <tr key={g.id} className="border-b border-border/30 last:border-0">
                                <td className="py-2.5 px-4">{g.title}</td>
                                <td className="py-2.5 px-3 hidden sm:table-cell text-muted-foreground text-xs">{g.sms_courses?.code || "—"}</td>
                                <td className="py-2.5 px-4 text-right font-medium" style={{ color: p.accent }}>{g.score}/{g.max_score} ({pct}%)</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
