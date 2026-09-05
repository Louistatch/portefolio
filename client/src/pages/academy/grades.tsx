import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, TrendingUp, Download, FileText, BookOpen, Award,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn, downloadStudentFile } from "@/lib/student";

/**
 * Mes notes — évolution par cours et relevé de notes complet.
 *
 * Auparavant, le relevé n'existait qu'en aperçu condensé (tableau de bord) ou en tableau brut
 * (profil) : nulle part une vue d'ensemble de la progression, et aucun moyen de l'emporter.
 * Cette page ajoute les deux — l'évolution se lit dans l'ordre des évaluations plutôt que par
 * une bibliothèque de graphe, et le PDF est généré côté serveur (voir /api/academy/transcript/pdf).
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
  // Regroupement par cours, dans l'ordre chronologique déjà fourni par le serveur : c'est ce
  // qui permet de lire une évolution (premier essai → dernier), pas seulement une moyenne.
  const parCours: Record<string, { code: string; title: string; grades: any[] }> = {};
  for (const g of grades) {
    const horsCours = g.type === "group_work"
      ? { code: "GROUP-WORK", title: "Travaux de groupe" }
      : { code: "ADMISSION", title: "Test d'admission" };
    const code = g.sms_courses?.code || horsCours.code;
    if (!parCours[code]) parCours[code] = { code, title: g.sms_courses?.title || horsCours.title, grades: [] };
    parCours[code].grades.push(g);
  }
  const cours = Object.values(parCours);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <SEO title="Mes notes — LouisFarm Learning" description="Votre évolution et votre relevé de notes complet." />
      <button onClick={() => navigate("/academy/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Tableau de bord
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-primary" /> Mes notes</h1>
          <p className="text-sm text-muted-foreground mt-1">Votre évolution dans chaque cours, et votre relevé de notes complet.</p>
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
          <div className="flex gap-3 flex-wrap mb-6">
            <div className="bg-primary/10 rounded-xl px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground">Moyenne générale</p>
              <p className="text-xl font-bold text-primary">{transcript.overall}%</p>
            </div>
            <div className="bg-muted rounded-xl px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground">Évaluations</p>
              <p className="text-xl font-bold">{transcript.totalGrades}</p>
            </div>
          </div>

          {/* Évolution par cours */}
          <section className="space-y-4 mb-8">
            <h2 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Évolution par cours</h2>
            {cours.map(c => {
              const moyenne = transcript.courseAverages?.find((ca: any) => ca.code === c.code)?.average ?? 0;
              return (
                <div key={c.code} className="bg-card rounded-2xl border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-sm">{c.title}</p>
                    <span className={`text-sm font-bold ${moyenne >= 70 ? "text-primary" : moyenne >= 50 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>{moyenne}%</span>
                  </div>
                  {/* Chaque barre est une évaluation, dans l'ordre où elle a été obtenue : la
                      lecture de gauche à droite EST l'évolution, sans bibliothèque de graphe. */}
                  <div className="flex items-end gap-1.5 h-16">
                    {c.grades.map((g: any, i: number) => {
                      const pct = Math.round(Number(g.score) / Number(g.max_score) * 100);
                      return (
                        <div key={g.id ?? i} title={`${g.title} — ${pct}%`}
                          className="flex-1 min-w-[6px] max-w-[28px] flex flex-col items-center justify-end h-full">
                          <div className={`w-full rounded-t ${pct >= 70 ? "bg-primary" : pct >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                            style={{ height: `${Math.max(pct, 6)}%` }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Relevé de notes complet */}
          <section>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Relevé de notes complet</h2>
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
                  {[...grades].reverse().map((g: any) => {
                    const pct = Math.round(Number(g.score) / Number(g.max_score) * 100);
                    return (
                      <tr key={g.id} className="border-b border-border/30 last:border-0">
                        <td className="py-2.5 px-4">{g.title}</td>
                        <td className="py-2.5 px-3 hidden sm:table-cell text-muted-foreground text-xs">{g.sms_courses?.code || "—"}</td>
                        <td className={`py-2.5 px-4 text-right font-medium ${pct >= 70 ? "text-primary" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>{g.score}/{g.max_score} ({pct}%)</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
