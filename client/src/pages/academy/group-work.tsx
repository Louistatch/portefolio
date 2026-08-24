import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  Users, Loader2, Lock, Clock, CheckCircle2, Send, AlertCircle, Link2,
  Plus, X, Mail, Calendar, Trophy, FileText,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn, getStudent } from "@/lib/student";
import { GROUP_WORK_STATUS_LABEL, type GroupWorkStatus } from "@shared/groupwork";

/**
 * Travaux de groupe — la partie collective du cursus, à partir de la semaine 4.
 *
 * Trois écrans en un, parce que ce sont trois questions que l'étudiant se pose ensemble :
 * avec qui je travaille, ce qu'on attend de nous, et où en est notre rendu. Séparer la
 * composition du groupe de l'énoncé aurait obligé à faire des allers-retours pour écrire
 * à un coéquipier.
 */

type Membre = { studentId: number; nom: string; email: string | null; role: string };
type Travail = {
  id: number; index: number; titre: string; enonce: string | null;
  livrables: string[]; maxScore: number; semaine: number;
  ouvertureLe: string | null; echeanceLe: string | null;
  statut: GroupWorkStatus; note: number | null; feedback: string | null;
  rendu: { le: string; parMoi: boolean; par: string | null; contenu: any } | null;
};

const jour = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";
const jourCourt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—";

const TON: Record<GroupWorkStatus, { badge: string; icone: any; puce: string }> = {
  locked:    { badge: "bg-muted text-muted-foreground", icone: Lock, puce: "bg-muted text-muted-foreground" },
  available: { badge: "bg-primary/15 text-primary", icone: Send, puce: "bg-primary/15 text-primary" },
  submitted: { badge: "bg-blue-500/15 text-blue-600", icone: Clock, puce: "bg-blue-500/15 text-blue-600" },
  completed: { badge: "bg-primary text-white", icone: CheckCircle2, puce: "bg-primary text-white" },
  missed:    { badge: "bg-amber-500/15 text-amber-600", icone: AlertCircle, puce: "bg-amber-500/15 text-amber-600" },
};

function initiales(nom?: string | null) {
  return (nom || "").split(" ").filter(Boolean).map(m => m[0]).slice(0, 2).join("").toUpperCase() || "ET";
}

export default function AcademyGroupWork() {
  const [, navigate] = useLocation();
  const moi = getStudent();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const charger = async () => {
    const d = await studentFetch("/api/academy/group-work").then(r => r.json()).catch(() => null);
    setData(d);
  };

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => { await charger(); setLoading(false); })();
  }, []);

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!data || data.actif === false) {
    return (
      <div className="max-w-3xl mx-auto">
        <SEO title="Travaux de groupe — DataMEAL Academy" description="Les évaluations collectives du cursus." />
        <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Les travaux de groupe ne sont pas encore ouverts.</p>
          <p className="text-sm text-muted-foreground mt-1">Revenez un peu plus tard, ou écrivez-nous si cela persiste.</p>
        </div>
      </div>
    );
  }

  if (data.admis === false) {
    return (
      <div className="max-w-3xl mx-auto">
        <SEO title="Travaux de groupe — DataMEAL Academy" description="Les évaluations collectives du cursus." />
        <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Réussissez d'abord le test d'admission.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Les travaux de groupe démarrent en semaine 4 de votre parcours.
          </p>
          <Button className="mt-4" onClick={() => navigate("/academy/dashboard")}>Retour à mon espace</Button>
        </div>
      </div>
    );
  }

  const travaux: Travail[] = data.travaux || [];
  const corriges = travaux.filter(t => t.statut === "completed").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SEO title="Travaux de groupe — DataMEAL Academy" description="Les évaluations collectives du cursus MEAL." />

      {/* ───── En-tête ───── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-teal-700 p-6 sm:p-8 text-white">
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/10" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-white/15 px-2.5 py-1 rounded-full">
            <Users className="w-3.5 h-3.5" /> Évaluation collective
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-3">Travaux de groupe</h1>
          <p className="text-white/85 text-sm mt-2 max-w-2xl">
            À partir de la semaine 4, un travail collectif s'ajoute chaque mois à vos leçons —
            trois au total, en semaines 4, 8 et 12. Un seul rendu par groupe, une note partagée
            par tous ses membres.
          </p>
          <div className="flex items-center gap-2 mt-4 text-sm">
            <Trophy className="w-4 h-4" />
            <span className="font-semibold">{corriges}/{travaux.length}</span>
            <span className="text-white/80">corrigé{corriges > 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* ───── Mon groupe ───── */}
      <MonGroupe groupe={data.groupe} moiId={moi?.id} premiereOuverture={travaux[0]?.ouvertureLe ?? null} />

      {/* ───── Les trois travaux ───── */}
      <div className="space-y-4">
        {travaux.map(t => (
          <CarteTravail key={t.id} travail={t} groupe={data.groupe} onRendu={charger} />
        ))}
      </div>
    </div>
  );
}

function MonGroupe({ groupe, moiId, premiereOuverture }:
  { groupe: any; moiId?: number; premiereOuverture: string | null }) {
  if (!groupe) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border/60 p-5 flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-muted grid place-items-center shrink-0">
          <Users className="w-5 h-5 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm">Votre groupe n'est pas encore constitué</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            La répartition se fait à l'ouverture du premier travail de groupe
            {premiereOuverture ? `, le ${jour(premiereOuverture)}` : ""}. Vous recevrez un email
            avec la composition de votre équipe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border/40">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> {groupe.nom}
        </h2>
        <span className="text-[11px] text-muted-foreground">Cohorte {groupe.cohorte}</span>
      </div>
      <div className="p-4 grid sm:grid-cols-2 gap-2.5">
        {(groupe.membres || []).map((m: Membre) => (
          <div key={m.studentId} className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
            <span className="w-9 h-9 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold shrink-0">
              {initiales(m.nom)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium leading-tight truncate">
                {m.nom}{m.studentId === moiId && <span className="text-muted-foreground font-normal"> · vous</span>}
              </span>
              {m.email && (
                <a href={`mailto:${m.email}`}
                  className="block text-[11px] text-muted-foreground hover:text-primary leading-tight truncate">
                  {m.email}
                </a>
              )}
            </span>
            {m.email && m.studentId !== moiId && (
              <a href={`mailto:${m.email}`} aria-label={`Écrire à ${m.nom}`}
                className="w-7 h-7 rounded-lg hover:bg-background grid place-items-center text-muted-foreground hover:text-primary shrink-0">
                <Mail className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CarteTravail({ travail, groupe, onRendu }:
  { travail: Travail; groupe: any; onRendu: () => Promise<void> }) {
  const [ouvert, setOuvert] = useState(false);
  const t = travail;
  const ton = TON[t.statut] ?? TON.locked;
  const Icone = ton.icone;
  const verrouille = t.statut === "locked";
  const deposable = t.statut === "available" || t.statut === "missed" || t.statut === "submitted";

  return (
    <section className={`bg-card rounded-2xl border overflow-hidden ${
      t.statut === "available" || t.statut === "missed" ? "border-primary/40" : "border-border/50"}`}>
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-border/40">
        <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${ton.puce}`}>
          <Icone className="w-[18px] h-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{t.titre}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            Semaine {t.semaine} · {verrouille
              ? `s'ouvre le ${jourCourt(t.ouvertureLe)}`
              : `du ${jourCourt(t.ouvertureLe)} au ${jourCourt(t.echeanceLe)}`}
          </p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${ton.badge}`}>
          {t.statut === "completed" && t.note != null
            ? `${t.note}/${t.maxScore}`
            : GROUP_WORK_STATUS_LABEL[t.statut]}
        </span>
      </div>

      {verrouille ? (
        <p className="px-4 sm:px-5 py-4 text-sm text-muted-foreground">
          Ce travail s'ouvrira le {jour(t.ouvertureLe)}. L'énoncé et la composition de votre
          groupe vous seront envoyés par email.
        </p>
      ) : (
        <div className="px-4 sm:px-5 py-4 space-y-4">
          {t.enonce && <p className="text-sm text-muted-foreground leading-relaxed">{t.enonce}</p>}

          {t.livrables?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Livrables attendus
              </p>
              <ul className="space-y-1.5">
                {t.livrables.map((l, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <FileText className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {t.statut === "missed" && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              L'échéance conseillée est passée — le dépôt reste possible jusqu'à la fin de
              votre période d'admission.
            </p>
          )}

          {t.rendu && (
            <div className="rounded-xl bg-muted/40 border border-border/40 p-3.5">
              <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Rendu le {jour(t.rendu.le)}{t.rendu.par ? ` par ${t.rendu.parMoi ? "vous" : t.rendu.par}` : ""}
              </p>
              {t.rendu.contenu?.summary && (
                <p className="text-sm whitespace-pre-wrap">{t.rendu.contenu.summary}</p>
              )}
              {Array.isArray(t.rendu.contenu?.links) && t.rendu.contenu.links.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {t.rendu.contenu.links.map((l: any, i: number) => (
                    <li key={i}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1.5 break-all">
                        <Link2 className="w-3 h-3 shrink-0" />{l.label || l.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {t.statut === "completed" && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3.5">
              <p className="text-sm font-semibold text-primary">
                Note du groupe : {t.note}/{t.maxScore}
              </p>
              {t.feedback && <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{t.feedback}</p>}
            </div>
          )}

          {deposable && groupe && (
            ouvert
              ? <Formulaire travail={t} onFini={async () => { setOuvert(false); await onRendu(); }} onAnnuler={() => setOuvert(false)} />
              : <Button size="sm" variant={t.rendu ? "outline" : "default"} className="gap-1.5" onClick={() => setOuvert(true)}>
                  <Send className="w-3.5 h-3.5" /> {t.rendu ? "Modifier le rendu" : "Déposer le rendu du groupe"}
                </Button>
          )}

          {deposable && !groupe && (
            <p className="text-xs text-muted-foreground">
              Le dépôt sera possible dès que votre groupe sera constitué.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Formulaire de dépôt. Le rendu est volontairement simple — un résumé, des liens, la
 * répartition du travail : les livrables eux-mêmes vivent là où le groupe les a produits
 * (Kobo, QGIS, un tableau de bord), et un dépôt de fichiers en dupliquerait des versions
 * que personne ne saurait plus départager.
 */
function Formulaire({ travail, onFini, onAnnuler }:
  { travail: Travail; onFini: () => Promise<void>; onAnnuler: () => void }) {
  const contenu = travail.rendu?.contenu;
  const [resume, setResume] = useState<string>(contenu?.summary ?? "");
  const [contributions, setContributions] = useState<string>(contenu?.contributions ?? "");
  const [liens, setLiens] = useState<{ label: string; url: string }[]>(
    Array.isArray(contenu?.links) && contenu.links.length ? contenu.links : [{ label: "", url: "" }]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const majLien = (i: number, champ: "label" | "url", v: string) =>
    setLiens(prev => prev.map((l, j) => j === i ? { ...l, [champ]: v } : l));

  async function envoyer() {
    setErreur(""); setEnvoi(true);
    try {
      const res = await studentFetch(`/api/academy/group-work/${travail.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          resume,
          contributions,
          liens: liens.filter(l => l.url.trim()),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(json?.message || "Le dépôt a échoué."); return; }
      await onFini();
    } finally { setEnvoi(false); }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Ce que votre groupe a produit
        </label>
        <textarea value={resume} onChange={e => setResume(e.target.value)} rows={5}
          placeholder="Décrivez votre production, vos choix méthodologiques et ce qui reste en suspens…"
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <p className="text-[11px] text-muted-foreground mt-1">{resume.trim().length}/30 caractères minimum</p>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Liens vers vos livrables
        </label>
        <div className="space-y-2">
          {liens.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input value={l.label} onChange={e => majLien(i, "label", e.target.value)}
                placeholder="Formulaire Kobo"
                className="w-36 sm:w-44 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={l.url} onChange={e => majLien(i, "url", e.target.value)}
                placeholder="https://…" inputMode="url"
                className="flex-1 min-w-0 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {liens.length > 1 && (
                <button type="button" onClick={() => setLiens(prev => prev.filter((_, j) => j !== i))}
                  aria-label="Retirer ce lien"
                  className="w-9 h-9 rounded-xl hover:bg-muted grid place-items-center text-muted-foreground hover:text-destructive shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {liens.length < 10 && (
          <button type="button" onClick={() => setLiens(prev => [...prev, { label: "", url: "" }])}
            className="mt-2 text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Ajouter un lien
          </button>
        )}
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Répartition du travail (facultatif)
        </label>
        <textarea value={contributions} onChange={e => setContributions(e.target.value)} rows={3}
          placeholder="Qui a fait quoi dans le groupe…"
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {erreur && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{erreur}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={envoyer} disabled={envoi || resume.trim().length < 30} className="gap-1.5">
          {envoi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Déposer pour le groupe
        </Button>
        <Button size="sm" variant="ghost" onClick={onAnnuler} disabled={envoi}>Annuler</Button>
      </div>
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Calendar className="w-3 h-3 shrink-0" />
        Ce dépôt vaut pour tous les membres du groupe et remplace le précédent tant que la
        correction n'a pas eu lieu.
      </p>
    </div>
  );
}
