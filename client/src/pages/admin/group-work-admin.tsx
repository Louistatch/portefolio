import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import {
  Users, Loader2, UserPlus, Trash2, Shuffle, Check, X, Pencil,
  ClipboardCheck, Link2, AlertCircle, Save, Download, Star, ChevronDown,
  MessageSquare, Send, Megaphone, Clock, RotateCcw,
} from "lucide-react";
import { PEER_REVIEW_CRITERIA, PEER_REVIEW_MAX_TOTAL } from "@shared/groupwork";

/**
 * Travaux de groupe — administration.
 *
 * Deux choses à faire ici, et rien d'autre : ajuster la composition des groupes que la
 * répartition automatique a formés, et corriger les rendus collectifs. Les énoncés sont
 * modifiables au même endroit, parce que c'est là qu'on s'aperçoit qu'un livrable est mal
 * formulé — en lisant ce que les groupes ont rendu.
 */

type Membre = { studentId: number; nom: string; email: string; role: string };
type Rendu = {
  id: number; groupWorkId: number; statut: string; note: number | null; feedback: string | null;
  contenu: any; le: string; corrigeLe: string | null; par: string | null;
  rapport?: { url: string; nom: string } | null; archive?: { url: string; nom: string } | null;
  notesParCritere?: Record<string, number> | null;
  corrigePar?: string | null; tentativesIA?: number; erreurIA?: string | null;
};
type Groupe = { id: number; nom: string; cohorte: string; actif?: boolean; membres: Membre[]; rendus: Rendu[] };

const jour = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

type Travail = { id: number; index: number; titre: string; semaine: number; maxScore: number; grille?: any };
type BlocTravail = { travail: Travail; constitue: boolean; groupes: Groupe[]; sansGroupe: any[] };

export default function AdminGroupWork() {
  const [data, setData] = useState<{ parTravail: BlocTravail[]; travaux: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [msg, setMsg] = useState("");
  const [onglet, setOnglet] = useState<"groupes" | "enonces" | "promotions" | "retards">("groupes");

  const charger = async () => {
    const d = await adminFetch("/api/admin/academy/groups").then(r => r.json()).catch(() => null);
    setData(d);
  };
  useEffect(() => { (async () => { await charger(); setLoading(false); })(); }, []);

  async function tirerAuSort(t: Travail) {
    if (!confirm(
      `Tirer au sort les équipes de ${t.titre} ?\n\n` +
      `Chaque étudiant recevra un email avec la composition de son groupe.`)) return;
    setAction(`t${t.id}`); setMsg("");
    try {
      const res = await adminFetch("/api/admin/academy/groups/auto-assign", {
        method: "POST", body: JSON.stringify({ group_work_id: t.id }),
      });
      const json = await res.json().catch(() => ({}));
      setMsg(json?.message || "Répartition effectuée.");
      await charger();
    } finally { setAction(""); }
  }

  async function defaire(t: Travail) {
    if (!confirm(`Défaire les équipes de ${t.titre} ? Un nouveau tirage sera possible.`)) return;
    setAction(`t${t.id}`); setMsg("");
    try {
      const res = await adminFetch(`/api/admin/academy/groups/gw/${t.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      setMsg(json?.message || "Équipes défaites.");
      await charger();
    } finally { setAction(""); }
  }

  async function deplacer(studentId: number, groupId: number) {
    setAction(`m${studentId}`);
    try {
      await adminFetch(`/api/admin/academy/groups/${groupId}/members`, {
        method: "POST", body: JSON.stringify({ student_id: studentId }),
      });
      await charger();
    } finally { setAction(""); }
  }

  async function retirer(studentId: number, groupId: number) {
    setAction(`m${studentId}`);
    try {
      await adminFetch(`/api/admin/academy/groups/${groupId}/members/${studentId}`, { method: "DELETE" });
      await charger();
    } finally { setAction(""); }
  }

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!data || !Array.isArray(data.parTravail)) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium">Les tables des travaux de groupe ne sont pas encore installées.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Exécutez les scripts <code className="font-mono">supabase/academy_group_work*.sql</code>.
        </p>
      </div>
    );
  }

  const aCorriger = data.parTravail.flatMap(b => b.groupes.flatMap(g => g.rendus.filter(r => r.statut !== "graded"))).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Travaux de groupe</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Une équipe différente est tirée au sort pour chaque travail, une semaine avant son
          ouverture. {aCorriger} rendu{aCorriger > 1 ? "s" : ""} à corriger.
        </p>
      </div>

      {msg && <p className="text-sm text-primary bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">{msg}</p>}

      <div className="flex gap-1 border-b border-border/50 overflow-x-auto">
        {([["groupes", "Groupes et rendus"], ["promotions", "Forum des promotions"],
           ["retards", "Retards"], ["enonces", "Énoncés"]] as const).map(([cle, label]) => (
          <button key={cle} onClick={() => setOnglet(cle)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
              onglet === cle ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {onglet === "promotions" ? <ForumPromotions />
       : onglet === "retards" ? <Retardataires />
       : onglet === "enonces" ? (
        <div className="space-y-4">
          {(data.travaux || []).map((t: any) => <CarteEnonce key={t.id} travail={t} onSaved={charger} />)}
        </div>
      ) : (
        <div className="space-y-8">
          {data.parTravail.map(bloc => (
            <div key={bloc.travail.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-sm">{bloc.travail.titre}</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Semaine {bloc.travail.semaine} · équipes tirées au sort en semaine {Math.max(1, bloc.travail.semaine - 1)}
                    {bloc.constitue ? ` · ${bloc.groupes.length} groupe${bloc.groupes.length > 1 ? "s" : ""}` : " · pas encore constituées"}
                  </p>
                </div>
                {bloc.constitue ? (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => defaire(bloc.travail)} disabled={!!action}>
                    <RotateCcw className="w-3.5 h-3.5" /> Refaire le tirage
                  </Button>
                ) : (
                  <Button size="sm" className="gap-1.5" onClick={() => tirerAuSort(bloc.travail)} disabled={!!action}>
                    {action === `t${bloc.travail.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shuffle className="w-3.5 h-3.5" />}
                    Tirer au sort maintenant
                  </Button>
                )}
              </div>

              {bloc.constitue && bloc.sansGroupe.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-700">
                    {bloc.sansGroupe.length} étudiant(s) sans équipe pour ce travail
                  </p>
                  {bloc.sansGroupe.map((s: any) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{s.nom}</span>
                      <span className="text-xs text-muted-foreground">{s.email}</span>
                      <select className="ml-auto text-xs rounded-lg border border-border/60 bg-background px-2 py-1.5"
                        defaultValue="" disabled={action === `m${s.id}`}
                        onChange={e => e.target.value && deplacer(s.id, Number(e.target.value))}>
                        <option value="">Affecter à…</option>
                        {bloc.groupes.map(g => <option key={g.id} value={g.id}>{g.nom} ({g.membres.length})</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {bloc.groupes.map(g => (
                <CarteGroupe key={g.id} groupe={g} groupes={bloc.groupes} travaux={[bloc.travail as any]}
                  action={action} onDeplacer={deplacer} onRetirer={retirer} onCorrige={charger} />
              ))}

              {!bloc.constitue && (
                <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 p-4">
                  Les équipes seront tirées au sort automatiquement une semaine avant l'ouverture.
                  Le bouton ci-dessus permet de le faire dès maintenant.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CarteGroupe({ groupe, groupes, travaux, action, onDeplacer, onRetirer, onCorrige }: {
  groupe: Groupe; groupes: Groupe[]; travaux: any[]; action: string;
  onDeplacer: (s: number, g: number) => Promise<void>;
  onRetirer: (s: number, g: number) => Promise<void>;
  onCorrige: () => Promise<void>;
}) {
  return (
    <section className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/40">
        <h3 className="text-sm font-bold">{groupe.nom}</h3>
        <span className="text-[11px] text-muted-foreground">
          {groupe.cohorte} · {groupe.membres.length} membre{groupe.membres.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="p-3 space-y-1.5 border-b border-border/40">
        {groupe.membres.map(m => (
          <div key={m.studentId} className="flex flex-wrap items-center gap-2 text-sm px-1">
            <span className="font-medium">{m.nom}</span>
            <span className="text-xs text-muted-foreground truncate">{m.email}</span>
            <select className="ml-auto text-xs rounded-lg border border-border/60 bg-background px-2 py-1"
              value={groupe.id} disabled={action === `m${m.studentId}`}
              onChange={e => onDeplacer(m.studentId, Number(e.target.value))}>
              {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
            <button onClick={() => onRetirer(m.studentId, groupe.id)} disabled={!!action}
              aria-label={`Retirer ${m.nom}`}
              className="w-7 h-7 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {groupe.membres.length === 0 && <p className="text-xs text-muted-foreground px-1">Groupe vide.</p>}
      </div>

      <PanneauDetail groupe={groupe} travaux={travaux} onCorrige={onCorrige} />
    </section>
  );
}

/**
 * Le détail d'un groupe, chargé seulement quand on l'ouvre.
 *
 * Il porte ce qui sert à corriger : les fichiers déposés, la grille de notation et les
 * évaluations que les membres se sont données. Le charger d'office pour tous les groupes
 * aurait fait, sur une promotion de sept équipes, sept requêtes dont six inutiles.
 */
function PanneauDetail({ groupe, travaux, onCorrige }:
  { groupe: Groupe; travaux: Travail[]; onCorrige: () => Promise<void> }) {
  const [ouvert, setOuvert] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [chargement, setChargement] = useState(false);

  const charger = async () => {
    setChargement(true);
    try {
      const d = await adminFetch(`/api/admin/academy/groups/${groupe.id}/detail`)
        .then(r => r.json()).catch(() => null);
      setDetail(d && !d.message ? d : null);
    } finally { setChargement(false); }
  };

  const basculer = async () => {
    const v = !ouvert;
    setOuvert(v);
    if (v && !detail) await charger();
  };

  const rafraichir = async () => { await charger(); await onCorrige(); };
  const aCorriger = groupe.rendus.filter(r => r.statut !== "graded").length;

  return (
    <>
      <button onClick={basculer}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:text-primary hover:bg-muted/30 transition-colors">
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${ouvert ? "rotate-180" : ""}`} />
        {ouvert ? "Masquer le détail" : "Rendus, notation et évaluations par les pairs"}
        {aCorriger > 0 && (
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
            {aCorriger} à corriger
          </span>
        )}
      </button>

      {ouvert && (
        <div className="p-3 space-y-2 border-t border-border/40">
          {chargement && <p className="text-xs text-muted-foreground px-1">Chargement…</p>}
          {detail && travaux.map(t => (
            <LigneRendu key={t.id} travail={t}
              rendu={(detail.rendus || []).find((r: any) => r.groupWorkId === t.id)}
              pairs={(detail.pairs || []).filter((a: any) => a.groupWorkId === t.id)}
              onCorrige={rafraichir} />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Un rendu et sa correction.
 *
 * La note se saisit PAR CRITÈRE et le total en découle. Saisir un total à la main à côté
 * d'une grille affichée revient à demander au formateur de faire l'addition, et à l'étudiant
 * de constater qu'elle ne tombe pas juste — c'est la première chose qu'il conteste.
 */
function LigneRendu({ travail, rendu, pairs, onCorrige }:
  { travail: Travail; rendu?: any; pairs: any[]; onCorrige: () => Promise<void> }) {
  const [ouvert, setOuvert] = useState(false);
  const grille: { cle: string; libelle: string; points: number }[] =
    Array.isArray(travail.grille) ? travail.grille : [];

  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const dep = rendu?.notesParCritere || {};
    return Object.fromEntries(grille.map(c => [c.cle, dep[c.cle] != null ? String(dep[c.cle]) : ""]));
  });
  const [feedback, setFeedback] = useState<string>(rendu?.feedback ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const total = grille.reduce((n, c) => n + (Number(notes[c.cle]) || 0), 0);
  const complet = grille.length > 0 && grille.every(c => notes[c.cle] !== "");

  async function corriger() {
    setErreur(""); setEnvoi(true);
    try {
      const res = await adminFetch(`/api/admin/academy/group-submissions/${rendu.id}`, {
        method: "PUT",
        body: JSON.stringify({
          criteres: Object.fromEntries(grille.map(c => [c.cle, Number(notes[c.cle]) || 0])),
          score: total, feedback,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(json?.message || "La correction a échoué."); return; }
      setOuvert(false);
      await onCorrige();
    } finally { setEnvoi(false); }
  }

  if (!rendu) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
        GW{travail.index} · pas encore rendu
      </div>
    );
  }

  const corrige = rendu.statut === "graded";
  return (
    <div className={`rounded-xl border p-3 ${corrige ? "border-border/40 bg-muted/20" : "border-primary/30 bg-primary/5"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold">GW{travail.index}</span>
        <span className="text-xs text-muted-foreground">
          rendu le {jour(rendu.le)}{rendu.par ? ` par ${rendu.par}` : ""}
        </span>
        {corrige && rendu.corrigePar === "ia" && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600">
            Corrigé par l'IA
          </span>
        )}
        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          corrige ? "bg-primary text-white" : "bg-amber-500/15 text-amber-600"}`}>
          {corrige ? `${rendu.note}/${travail.maxScore}` : "à corriger"}
        </span>
        <button onClick={() => setOuvert(v => !v)}
          className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          {corrige ? <Pencil className="w-3 h-3" /> : <ClipboardCheck className="w-3 h-3" />}
          {ouvert ? "Fermer" : corrige ? "Modifier" : "Corriger"}
        </button>
      </div>

      {/* La correction IA repasse chaque jour tant qu'elle échoue (PDF illisible, quota
          Gemini…) : ce bandeau est ce qui évite qu'un rendu reste bloqué en silence — il dit
          pourquoi, et invite à corriger à la main plutôt que d'attendre indéfiniment. */}
      {!corrige && !!rendu.erreurIA && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 mt-2">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          Correction IA en échec ({rendu.tentativesIA ?? 1} tentative{(rendu.tentativesIA ?? 1) > 1 ? "s" : ""}) — {rendu.erreurIA}
        </p>
      )}

      {/* Les fichiers restent visibles fermé : c'est ce qu'on va chercher le plus souvent. */}
      {(rendu.rapport || rendu.archive) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {rendu.rapport && <Fichier url={rendu.rapport.url} nom={rendu.rapport.nom || "Rapport PDF"} />}
          {rendu.archive && <Fichier url={rendu.archive.url} nom={rendu.archive.nom || "Archive"} />}
        </div>
      )}

      {ouvert && (
        <div className="mt-3 space-y-3">
          {rendu.contenu?.summary && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Production</p>
              <p className="text-sm whitespace-pre-wrap">{rendu.contenu.summary}</p>
            </div>
          )}
          {Array.isArray(rendu.contenu?.links) && rendu.contenu.links.length > 0 && (
            <ul className="space-y-1">
              {rendu.contenu.links.map((l: any, i: number) => (
                <li key={i}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1.5 break-all">
                    <Link2 className="w-3 h-3 shrink-0" />{l.label || l.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {rendu.contenu?.contributions && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Répartition annoncée</p>
              <p className="text-sm whitespace-pre-wrap">{rendu.contenu.contributions}</p>
            </div>
          )}

          {pairs.length > 0 && <EvaluationsPairs pairs={pairs} />}

          <div className="rounded-xl border border-border/50 bg-background p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Grille de notation
            </p>
            <div className="space-y-1.5">
              {grille.map(c => (
                <div key={c.cle} className="flex items-center gap-2">
                  <span className="text-xs flex-1 min-w-0">{c.libelle}</span>
                  <input type="number" min={0} max={c.points} value={notes[c.cle] ?? ""}
                    onChange={e => setNotes(p => ({ ...p, [c.cle]: e.target.value }))}
                    className="w-16 rounded-lg border border-border/60 bg-background px-2 py-1 text-sm text-right" />
                  <span className="text-xs text-muted-foreground w-8 shrink-0">/{c.points}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border/40">
              <span className="text-xs font-semibold flex-1">Total</span>
              <span className="text-sm font-bold text-primary">{total}/{travail.maxScore}</span>
            </div>
          </div>

          <label className="block text-xs text-muted-foreground">
            Commentaire (envoyé à tous les membres)
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2}
              className="block mt-1 w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-sm resize-y" />
          </label>

          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5" onClick={corriger} disabled={envoi || !complet}>
              {envoi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Enregistrer la note
            </Button>
            {!complet && <span className="text-[11px] text-muted-foreground">Renseignez tous les critères.</span>}
          </div>
          {erreur && <p className="text-xs text-destructive">{erreur}</p>}
          <p className="text-[11px] text-muted-foreground">
            La note est écrite dans le relevé de chaque membre du groupe et déclenche leur email de correction.
          </p>
        </div>
      )}
    </div>
  );
}

function Fichier({ url, nom }: { url: string; nom: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted px-2.5 py-1.5 text-xs transition-colors">
      <Download className="w-3 h-3 text-primary shrink-0" />
      <span className="truncate max-w-[220px]">{nom}</span>
    </a>
  );
}

/**
 * Ce que les membres se sont mis entre eux — nominativement.
 *
 * L'anonymat de l'évaluation par les pairs protège les étudiants les uns des autres ; il
 * n'a pas à protéger qui que ce soit du formateur, qui est précisément la personne devant
 * arbitrer quand un membre dit avoir tout porté.
 */
function EvaluationsPairs({ pairs }: { pairs: any[] }) {
  const evalues = Array.from(new Set(pairs.map(p => p.evalue)));
  return (
    <div className="rounded-xl border border-border/50 bg-background p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
        <Star className="w-3 h-3" /> Évaluations entre membres
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-medium py-1 pr-3">Critère</th>
              {evalues.map(n => <th key={n} className="text-center font-medium py-1 px-2 whitespace-nowrap">{n}</th>)}
            </tr>
          </thead>
          <tbody>
            {PEER_REVIEW_CRITERIA.map(c => (
              <tr key={c.cle} className="border-t border-border/40">
                <td className="py-1.5 pr-3">{c.libelle}</td>
                {evalues.map(n => {
                  const recus = pairs.filter(p => p.evalue === n).map(p => Number(p.scores?.[c.cle] ?? 0));
                  const moy = recus.length ? (recus.reduce((a, b) => a + b, 0) / recus.length) : null;
                  return <td key={n} className="py-1.5 px-2 text-center font-mono">{moy === null ? "—" : moy.toFixed(1)}</td>;
                })}
              </tr>
            ))}
            <tr className="border-t border-border/60 font-semibold">
              <td className="py-1.5 pr-3">Total</td>
              {evalues.map(n => {
                const totaux = pairs.filter(p => p.evalue === n).map(p => Number(p.total ?? 0));
                const moy = totaux.length ? (totaux.reduce((a, b) => a + b, 0) / totaux.length) : null;
                return <td key={n} className="py-1.5 px-2 text-center font-mono">
                  {moy === null ? "—" : `${moy.toFixed(0)}/${PEER_REVIEW_MAX_TOTAL}`}
                </td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
      {pairs.filter(p => p.commentaire).map((p, i) => (
        <p key={i} className="text-[11px] text-muted-foreground mt-1.5">
          <span className="font-medium">{p.evaluateur} → {p.evalue} :</span> {p.commentaire}
        </p>
      ))}
    </div>
  );
}

type TravailBrut = { id: number; gw_index: number; week_index: number; title: string; brief: string | null; deliverables: any; max_score: number };

function CarteEnonce({ travail, onSaved }: { travail: TravailBrut; onSaved: () => Promise<void> }) {
  const [titre, setTitre] = useState(travail.title);
  const [brief, setBrief] = useState(travail.brief ?? "");
  const [livrables, setLivrables] = useState<string>(
    (Array.isArray(travail.deliverables) ? travail.deliverables : []).join("\n"));
  const [max, setMax] = useState(String(travail.max_score ?? 100));
  const [semaine, setSemaine] = useState(String(travail.week_index));
  const [envoi, setEnvoi] = useState(false);
  const [ok, setOk] = useState(false);

  async function enregistrer() {
    setEnvoi(true); setOk(false);
    try {
      await adminFetch(`/api/admin/academy/group-works/${travail.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: titre, brief, max_score: Number(max), week_index: Number(semaine),
          deliverables: livrables.split("\n").map(l => l.trim()).filter(Boolean),
        }),
      });
      setOk(true);
      await onSaved();
    } finally { setEnvoi(false); }
  }

  return (
    <section className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0">
          GW{travail.gw_index}
        </span>
        <input value={titre} onChange={e => setTitre(e.target.value)}
          className="flex-1 min-w-0 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium" />
      </div>
      <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={4}
        placeholder="Énoncé du travail…"
        className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm resize-y" />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Livrables — un par ligne
        </p>
        <textarea value={livrables} onChange={e => setLivrables(e.target.value)} rows={4}
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm resize-y font-mono text-[13px]" />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">
          Semaine d'ouverture
          <input type="number" min={1} value={semaine} onChange={e => setSemaine(e.target.value)}
            className="block mt-1 w-24 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-sm" />
        </label>
        <label className="text-xs text-muted-foreground">
          Note maximale
          <input type="number" min={1} value={max} onChange={e => setMax(e.target.value)}
            className="block mt-1 w-24 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-sm" />
        </label>
        <Button size="sm" className="gap-1.5 ml-auto" onClick={enregistrer} disabled={envoi}>
          {envoi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : ok ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          Enregistrer
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Changer la semaine décale l'échéance des étudiants dont la fenêtre n'est pas encore
        écoulée — une fenêtre déjà passée n'est jamais recalculée.
      </p>
    </section>
  );
}

/**
 * Forum des promotions : le formateur écrit à toute une cohorte.
 *
 * Une « annonce » est notifiée par email à tous les étudiants concernés, un message
 * ordinaire non. La distinction est délibérée : un forum qui prévient à chaque message
 * finit en dossier spam, et un forum qui ne prévient jamais n'est pas lu.
 */
function ForumPromotions() {
  const [cohortes, setCohortes] = useState<any[]>([]);
  const [choisie, setChoisie] = useState<string>("");
  const [fil, setFil] = useState<any[]>([]);
  const [corps, setCorps] = useState("");
  const [annonce, setAnnonce] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const c = await adminFetch("/api/admin/academy/cohorts").then(r => r.json()).catch(() => []);
      const liste = Array.isArray(c) ? c : [];
      setCohortes(liste);
      if (liste.length && !choisie) setChoisie(liste[0].cohorte);
    })();
  }, []);

  const chargerFil = async (c: string) => {
    const f = await adminFetch(`/api/admin/academy/cohort-forum/${c}`).then(r => r.json()).catch(() => []);
    setFil(Array.isArray(f) ? f : []);
  };
  useEffect(() => { if (choisie) chargerFil(choisie); }, [choisie]);

  async function publier() {
    if (corps.trim().length < 2) return;
    setEnvoi(true); setMsg("");
    try {
      const res = await adminFetch(`/api/admin/academy/cohort-forum/${choisie}`, {
        method: "POST", body: JSON.stringify({ corps, annonce }),
      });
      const json = await res.json().catch(() => ({}));
      setMsg(annonce ? `Annonce publiée — ${json?.prevenus ?? 0} étudiant(s) prévenu(s) par email.` : "Message publié.");
      setCorps(""); setAnnonce(false);
      await chargerFil(choisie);
    } finally { setEnvoi(false); }
  }

  if (!cohortes.length) {
    return <p className="text-sm text-muted-foreground">Aucune promotion : il faut au moins un étudiant admis.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {cohortes.map(c => (
          <button key={c.cohorte} onClick={() => setChoisie(c.cohorte)}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
              choisie === c.cohorte ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"}`}>
            <span className="block text-sm font-semibold">Promotion {c.cohorte}</span>
            <span className="block text-[11px] text-muted-foreground">
              {c.effectif} étudiant{c.effectif > 1 ? "s" : ""} · {c.messages} message{c.messages > 1 ? "s" : ""}
            </span>
          </button>
        ))}
      </div>

      {msg && <p className="text-sm text-primary bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">{msg}</p>}

      <section className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Fil de la promotion {choisie}
          </h2>
        </div>
        <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
          {fil.length === 0 && <p className="text-sm text-muted-foreground">Aucun message.</p>}
          {fil.map(m => (
            <div key={m.id} className="flex gap-2.5">
              <span className={`w-8 h-8 rounded-full grid place-items-center text-[10px] font-bold shrink-0 ${
                m.formateur ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                {(m.auteur || "?").split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">{m.auteur}</span>
                  {m.kind === "annonce" && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">ANNONCE</span>}
                  {" · "}{new Date(m.le).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words">{m.corps}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border/40 space-y-2">
          <textarea value={corps} onChange={e => setCorps(e.target.value)} rows={3}
            placeholder={`Écrire à la promotion ${choisie}…`}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm resize-y" />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={annonce} onChange={e => setAnnonce(e.target.checked)} />
              <Megaphone className="w-3.5 h-3.5" />
              Annonce — prévenir chaque étudiant par email
            </label>
            <Button size="sm" className="ml-auto gap-1.5" onClick={publier} disabled={envoi || corps.trim().length < 2}>
              {envoi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Publier
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Retards : qui a décroché, et la remise à zéro.
 *
 * Le bouton n'est pas automatique, et c'est délibéré : retirer son admission à quelqu'un
 * est une décision qui se prend en regardant la liste, pas un effet de bord d'une tâche de
 * fond. Le serveur revérifie de toute façon le seuil — l'interface ne peut pas exclure un
 * étudiant qui n'est pas en retard.
 */
function Retardataires() {
  const [d, setD] = useState<any>(null);
  const [envoi, setEnvoi] = useState(false);
  const [msg, setMsg] = useState("");

  const charger = async () => {
    const r = await adminFetch("/api/admin/academy/late-students").then(res => res.json()).catch(() => null);
    setD(r && !r.message ? r : null);
  };
  useEffect(() => { charger(); }, []);

  async function remettreAZero() {
    const cibles = (d?.etudiants || []).filter((e: any) => e.aExclure);
    if (!confirm(
      `Remettre à zéro ${cibles.length} étudiant(s) ?\n\n` +
      `Leur admission, leur planning et leur groupe seront effacés. Leurs notes et attestations sont conservées. ` +
      `Chacun recevra un email et pourra repasser le test immédiatement.`)) return;
    setEnvoi(true); setMsg("");
    try {
      const res = await adminFetch("/api/admin/academy/late-students/reset", { method: "POST", body: JSON.stringify({}) });
      const json = await res.json().catch(() => ({}));
      setMsg(json?.message || "Fait.");
      await charger();
    } finally { setEnvoi(false); }
  }

  if (!d) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const etudiants: any[] = d.etudiants || [];
  const aExclure = etudiants.filter(e => e.aExclure);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground flex-1 min-w-0">
          Un étudiant dépassant <strong>{d.seuilJours} jours de retard</strong> sur son échéance la plus
          ancienne ne peut plus terminer dans sa fenêtre de trois mois. Il repart de zéro et repasse
          le test pour rejoindre une promotion plus récente.
        </p>
        {aExclure.length > 0 && (
          <Button size="sm" variant="destructive" className="gap-1.5" onClick={remettreAZero} disabled={envoi}>
            {envoi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Remettre à zéro les {aExclure.length} retardataire{aExclure.length > 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {msg && <p className="text-sm text-primary bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">{msg}</p>}

      {aExclure.length === 0 && (
        <p className="text-sm rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-primary">
          Aucun étudiant ne dépasse le seuil. Rien à faire.
        </p>
      )}

      <section className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Étudiant</th>
                <th className="text-left font-medium px-3 py-2.5">Promotion</th>
                <th className="text-right font-medium px-3 py-2.5">Leçons</th>
                <th className="text-right font-medium px-4 py-2.5">Retard</th>
              </tr>
            </thead>
            <tbody>
              {etudiants.map(e => (
                <tr key={e.id} className={`border-t border-border/40 ${e.aExclure ? "bg-destructive/5" : ""}`}>
                  <td className="px-4 py-2.5">
                    <span className="block font-medium">{e.nom}</span>
                    <span className="block text-[11px] text-muted-foreground">{e.email}</span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{e.cohorte}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{e.leconsFaites}/{e.leconsTotal}</td>
                  <td className="px-4 py-2.5 text-right">
                    {e.joursDeRetard === 0
                      ? <span className="text-xs text-muted-foreground">à jour</span>
                      : <span className={`text-xs font-semibold inline-flex items-center gap-1 ${
                          e.aExclure ? "text-destructive" : "text-amber-600"}`}>
                          <Clock className="w-3 h-3" />{e.joursDeRetard} j
                        </span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
