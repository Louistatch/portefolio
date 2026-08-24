import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  Users, Loader2, Lock, Clock, CheckCircle2, Send, AlertCircle, Link2,
  Plus, X, Mail, Calendar, Trophy, FileText, MessageSquare, Download,
  Paperclip, Upload, Star, Pin,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn, getStudent } from "@/lib/student";
import {
  GROUP_WORK_STATUS_LABEL, PEER_REVIEW_CRITERIA, PEER_REVIEW_MAX_PER_CRITERION,
  type GroupWorkStatus,
} from "@shared/groupwork";

/**
 * Travaux de groupe — la partie collective du cursus.
 *
 * Quatre choses vivent ici, et elles vivent ensemble parce que l'étudiant se les pose
 * ensemble : avec qui je travaille, ce qu'on attend de nous, où en est notre rendu, et où
 * on se parle. Éclater ça en quatre pages aurait obligé à faire des allers-retours pour
 * écrire à un coéquipier en lisant l'énoncé.
 */

type Membre = { studentId: number; nom: string; email: string | null; role: string };
type Fichier = { url: string; nom: string } | null;
type Travail = {
  id: number; index: number; titre: string; enonce: string | null;
  livrables: string[]; maxScore: number; semaine: number;
  enonceUrl: string | null; modeleUrl: string | null;
  grille: { cle: string; libelle: string; points: number }[];
  ouvertureLe: string | null; echeanceLe: string | null;
  statut: GroupWorkStatus; note: number | null; feedback: string | null;
  notesParCritere: Record<string, number> | null;
  rendu: { le: string; parMoi: boolean; par: string | null; contenu: any; rapport: Fichier; archive: Fichier } | null;
};

const jour = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";
const jourCourt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—";
const dateHeure = (d?: string | null) =>
  d ? new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

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
  const [forum, setForum] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const charger = async () => {
    const d = await studentFetch("/api/academy/group-work").then(r => r.json()).catch(() => null);
    setData(d);
    if (d?.groupe) {
      const f = await studentFetch("/api/academy/group-forum").then(r => r.json()).catch(() => null);
      setForum(f && !f.message ? f : null);
    }
  };

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => { await charger(); setLoading(false); })();
  }, []);

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!data || data.actif === false) {
    return (
      <Vide titre="Les travaux de groupe ne sont pas encore ouverts."
        detail="Revenez un peu plus tard, ou écrivez-nous si cela persiste." icone={Users} />
    );
  }

  if (data.admis === false) {
    return (
      <Vide titre="Réussissez d'abord le test d'admission." icone={Lock}
        detail="Les travaux de groupe s'ouvrent ensuite, avec votre équipe."
        action={<Button className="mt-4" onClick={() => navigate("/academy/dashboard")}>Retour à mon espace</Button>} />
    );
  }

  const travaux: Travail[] = data.travaux || [];
  const corriges = travaux.filter(t => t.statut === "completed").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SEO title="Travaux de groupe — DataMEAL Academy" description="Les évaluations collectives du cursus MEAL." />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-teal-700 p-6 sm:p-8 text-white">
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/10" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-white/15 px-2.5 py-1 rounded-full">
            <Users className="w-3.5 h-3.5" /> Évaluation collective
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-3">Travaux de groupe</h1>
          <p className="text-white/85 text-sm mt-2 max-w-2xl">
            Trois projets collectifs jalonnent votre parcours — semaines 4, 8 et 12. Un seul
            rendu par groupe, une note partagée par tous ses membres.
          </p>
          <div className="flex items-center gap-2 mt-4 text-sm">
            <Trophy className="w-4 h-4" />
            <span className="font-semibold">{corriges}/{travaux.length}</span>
            <span className="text-white/80">corrigé{corriges > 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      <MonGroupe groupe={data.groupe} moiId={moi?.id} />

      <div className="space-y-4">
        {travaux.map(t => (
          <CarteTravail key={t.id} travail={t} groupe={data.groupe} moiId={moi?.id} onRendu={charger} />
        ))}
      </div>

      {data.groupe && <Forum forum={forum} onPoste={charger} />}
    </div>
  );
}

function Vide({ titre, detail, icone: Icone, action }:
  { titre: string; detail: string; icone: any; action?: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto">
      <SEO title="Travaux de groupe — DataMEAL Academy" description="Les évaluations collectives du cursus." />
      <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
        <Icone className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium">{titre}</p>
        <p className="text-sm text-muted-foreground mt-1">{detail}</p>
        {action}
      </div>
    </div>
  );
}

function MonGroupe({ groupe, moiId }: { groupe: any; moiId?: number }) {
  if (!groupe) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border/60 p-5 flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-muted grid place-items-center shrink-0">
          <Users className="w-5 h-5 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm">Votre groupe n'est pas encore constitué</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Les équipes sont formées par tirage au sort, trois par groupe. Vous recevrez un
            email dès que la vôtre sera prête.
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

function CarteTravail({ travail, groupe, moiId, onRendu }:
  { travail: Travail; groupe: any; moiId?: number; onRendu: () => Promise<void> }) {
  const [ouvert, setOuvert] = useState(false);
  const [pairsOuvert, setPairsOuvert] = useState(false);
  const t = travail;
  const ton = TON[t.statut] ?? TON.locked;
  const Icone = ton.icone;
  const verrouille = t.statut === "locked";
  const deposable = t.statut === "available" || t.statut === "missed" || t.statut === "submitted";
  // L'évaluation des pairs n'a de sens qu'une fois le travail rendu : avant, personne n'a
  // encore de contribution à juger.
  const pairsPossible = t.statut === "submitted" || t.statut === "completed";

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

      <div className="px-4 sm:px-5 py-4 space-y-4">
        {/* Les documents sont accessibles même verrouillé : lire l'énoncé à l'avance n'a
            jamais nui à personne, et c'est ce qui permet à un groupe de s'organiser. */}
        {(t.enonceUrl || t.modeleUrl) && (
          <div className="flex flex-wrap gap-2">
            {t.enonceUrl && <Document url={t.enonceUrl} libelle="Énoncé du projet (PDF)" />}
            {t.modeleUrl && <Document url={t.modeleUrl} libelle="Modèle de rapport (DOCX)" />}
          </div>
        )}

        {verrouille ? (
          <p className="text-sm text-muted-foreground">
            Le dépôt s'ouvrira le {jour(t.ouvertureLe)}. D'ici là, lisez l'énoncé et
            répartissez-vous le travail avec votre groupe.
          </p>
        ) : (
          <>
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

            {t.rendu && <RenduDepose rendu={t.rendu} />}

            {t.statut === "completed" && <Correction travail={t} />}

            {deposable && groupe && (
              ouvert
                ? <Formulaire travail={t} onFini={async () => { setOuvert(false); await onRendu(); }} onAnnuler={() => setOuvert(false)} />
                : <Button size="sm" variant={t.rendu ? "outline" : "default"} className="gap-1.5" onClick={() => setOuvert(true)}>
                    <Send className="w-3.5 h-3.5" /> {t.rendu ? "Modifier le rendu" : "Déposer le rendu du groupe"}
                  </Button>
            )}

            {pairsPossible && groupe && (
              <div className="pt-1">
                <button onClick={() => setPairsOuvert(v => !v)}
                  className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" />
                  {pairsOuvert ? "Masquer" : "Évaluer mes coéquipiers"}
                </button>
                {pairsOuvert && <EvaluationPairs travailId={t.id} moiId={moiId} />}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Document({ url, libelle }: { url: string; libelle: string }) {
  return (
    <a href={url} download
      className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted px-3 py-2 text-xs font-medium transition-colors">
      <Download className="w-3.5 h-3.5 text-primary shrink-0" />
      {libelle}
    </a>
  );
}

function RenduDepose({ rendu }: { rendu: NonNullable<Travail["rendu"]> }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/40 p-3.5">
      <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        Rendu le {jour(rendu.le)}{rendu.par ? ` par ${rendu.parMoi ? "vous" : rendu.par}` : ""}
      </p>
      {rendu.contenu?.summary && <p className="text-sm whitespace-pre-wrap">{rendu.contenu.summary}</p>}
      <div className="flex flex-wrap gap-2 mt-2.5">
        {rendu.rapport && <Document url={rendu.rapport.url} libelle={rendu.rapport.nom || "Rapport"} />}
        {rendu.archive && <Document url={rendu.archive.url} libelle={rendu.archive.nom || "Archive"} />}
      </div>
      {Array.isArray(rendu.contenu?.links) && rendu.contenu.links.length > 0 && (
        <ul className="mt-2 space-y-1">
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
    </div>
  );
}

/** La note, détaillée par critère quand le formateur a rempli sa grille. Un total nu
 *  n'apprend rien ; le détail dit où le groupe a perdu ses points. */
function Correction({ travail: t }: { travail: Travail }) {
  return (
    <div className="rounded-xl bg-primary/5 border border-primary/20 p-3.5">
      <p className="text-sm font-semibold text-primary">Note du groupe : {t.note}/{t.maxScore}</p>
      {t.notesParCritere && t.grille?.length > 0 && (
        <table className="w-full mt-2.5 text-xs">
          <tbody>
            {t.grille.map(c => (
              <tr key={c.cle} className="border-t border-primary/10">
                <td className="py-1.5 pr-3">{c.libelle}</td>
                <td className="py-1.5 text-right font-mono font-semibold whitespace-nowrap">
                  {t.notesParCritere?.[c.cle] ?? 0}/{c.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {t.feedback && <p className="text-sm text-muted-foreground mt-2.5 whitespace-pre-wrap">{t.feedback}</p>}
    </div>
  );
}

/**
 * Évaluation par les pairs — je note mes coéquipiers, et je vois ce que j'ai reçu.
 *
 * Ce que j'ai reçu est ANONYME : la moyenne et le détail des critères, sans dire qui a mis
 * quoi. Nommer les évaluateurs transformerait un outil de régulation en règlement de
 * comptes, et personne ne mettrait plus jamais autre chose que 3 partout.
 */
function EvaluationPairs({ travailId, moiId }: { travailId: number; moiId?: number }) {
  const [d, setD] = useState<any>(null);
  const [cible, setCible] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<string, number>>({});
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = async () => {
    const r = await studentFetch(`/api/academy/group-work/${travailId}/peer-review`)
      .then(res => res.json()).catch(() => null);
    setD(r && !r.message ? r : null);
  };
  useEffect(() => { charger(); }, [travailId]);

  function ouvrir(m: any) {
    setCible(m.studentId);
    setNotes(m.notes || Object.fromEntries(PEER_REVIEW_CRITERIA.map(c => [c.cle, PEER_REVIEW_MAX_PER_CRITERION])));
    setCommentaire("");
  }

  async function envoyer() {
    setEnvoi(true);
    try {
      await studentFetch(`/api/academy/group-work/${travailId}/peer-review`, {
        method: "POST",
        body: JSON.stringify({ membre: cible, notes, commentaire }),
      });
      setCible(null);
      await charger();
    } finally { setEnvoi(false); }
  }

  if (!d) return <p className="text-xs text-muted-foreground mt-2">Chargement…</p>;

  const recues: any[] = d.recues || [];
  const moyenne = recues.length
    ? Math.round(recues.reduce((n, r) => n + (r.total ?? 0), 0) / recues.length)
    : null;

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-3.5 space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Mes coéquipiers
        </p>
        <div className="space-y-1.5">
          {(d.aEvaluer || []).map((m: any) => (
            <div key={m.studentId} className="flex items-center gap-2 text-sm">
              <span className="truncate flex-1">{m.nom}</span>
              {m.dejaFait
                ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">évalué</span>
                : <span className="text-[10px] text-muted-foreground shrink-0">à évaluer</span>}
              <button onClick={() => ouvrir(m)}
                className="text-xs text-muted-foreground hover:text-primary shrink-0">
                {m.dejaFait ? "Modifier" : "Évaluer"}
              </button>
            </div>
          ))}
          {(d.aEvaluer || []).length === 0 && (
            <p className="text-xs text-muted-foreground">Vous êtes seul dans ce groupe pour l'instant.</p>
          )}
        </div>
      </div>

      {cible && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2.5">
          {PEER_REVIEW_CRITERIA.map(c => (
            <div key={c.cle}>
              <p className="text-xs mb-1">{c.libelle}</p>
              <div className="flex gap-1.5">
                {Array.from({ length: PEER_REVIEW_MAX_PER_CRITERION + 1 }, (_, n) => (
                  <button key={n} onClick={() => setNotes(p => ({ ...p, [c.cle]: n }))}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      notes[c.cle] === n ? "bg-primary text-white" : "bg-background border border-border/60 hover:border-primary/40"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <input value={commentaire} onChange={e => setCommentaire(e.target.value)}
            placeholder="Commentaire (facultatif)"
            className="w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-sm" />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={envoyer} disabled={envoi} className="gap-1.5">
              {envoi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Enregistrer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCible(null)} disabled={envoi}>Annuler</Button>
          </div>
        </div>
      )}

      {recues.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Évaluations reçues (anonymes)
          </p>
          <p className="text-sm">
            <span className="font-semibold text-primary">{moyenne}</span>
            <span className="text-muted-foreground">/{PEER_REVIEW_CRITERIA.length * PEER_REVIEW_MAX_PER_CRITERION} en moyenne sur {recues.length} évaluation{recues.length > 1 ? "s" : ""}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Formulaire de dépôt. Le rapport PDF est obligatoire — c'est lui qu'on corrige ; l'archive
 * ZIP et les liens l'accompagnent (tableurs, cartes, code, formulaire en ligne).
 */
function Formulaire({ travail, onFini, onAnnuler }:
  { travail: Travail; onFini: () => Promise<void>; onAnnuler: () => void }) {
  const contenu = travail.rendu?.contenu;
  const [resume, setResume] = useState<string>(contenu?.summary ?? "");
  const [contributions, setContributions] = useState<string>(contenu?.contributions ?? "");
  const [liens, setLiens] = useState<{ label: string; url: string }[]>(
    Array.isArray(contenu?.links) && contenu.links.length ? contenu.links : [{ label: "", url: "" }]);
  const [rapport, setRapport] = useState<Fichier>(travail.rendu?.rapport ?? null);
  const [archive, setArchive] = useState<Fichier>(travail.rendu?.archive ?? null);
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
          resume, contributions, rapport, archive,
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
      <div className="grid sm:grid-cols-2 gap-2.5">
        <ChampFichier libelle="Rapport du groupe (PDF)" accept=".pdf" obligatoire
          fichier={rapport} onFichier={setRapport} />
        <ChampFichier libelle="Fichiers de travail (ZIP)" accept=".zip,.xlsx,.csv,.docx"
          fichier={archive} onFichier={setArchive} />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Ce que votre groupe a produit
        </label>
        <textarea value={resume} onChange={e => setResume(e.target.value)} rows={4}
          placeholder="Décrivez votre production, vos choix méthodologiques et ce qui reste en suspens…"
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <p className="text-[11px] text-muted-foreground mt-1">{resume.trim().length}/30 caractères minimum</p>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Liens complémentaires
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
        <Button size="sm" onClick={envoyer} disabled={envoi || resume.trim().length < 30 || !rapport} className="gap-1.5">
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

/** Un champ de téléversement. Le fichier part vers le stockage dès sa sélection : le
 *  dépôt du rendu ne devient alors qu'un enregistrement, ce qui évite qu'un envoi de
 *  30 Mo échoue en même temps que la soumission et emporte tout. */
function ChampFichier({ libelle, accept, fichier, onFichier, obligatoire }: {
  libelle: string; accept: string; fichier: Fichier;
  onFichier: (f: Fichier) => void; obligatoire?: boolean;
}) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErreur(""); setEnvoi(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await studentFetch("/api/academy/group-work/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(json?.message || "Envoi impossible."); return; }
      onFichier({ url: json.url, nom: json.nom });
    } finally { setEnvoi(false); }
  }

  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        {libelle}{obligatoire && <span className="text-destructive"> *</span>}
      </label>
      {fichier ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2">
          <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs truncate flex-1">{fichier.nom}</span>
          <button onClick={() => onFichier(null)} aria-label="Retirer le fichier"
            className="w-6 h-6 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-destructive shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-background px-3 py-2 cursor-pointer hover:border-primary/40 transition-colors">
          {envoi ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                 : <Upload className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
          <span className="text-xs text-muted-foreground truncate">
            {envoi ? "Envoi en cours…" : "Choisir un fichier"}
          </span>
          <input type="file" accept={accept} className="hidden" onChange={choisir} disabled={envoi} />
        </label>
      )}
      {erreur && <p className="text-[11px] text-destructive mt-1">{erreur}</p>}
    </div>
  );
}

/**
 * Forum du groupe — un seul fil pour les trois projets, parce que l'équipe, elle, ne change
 * pas. Les documents déposés à la constitution du groupe restent épinglés en tête.
 */
function Forum({ forum, onPoste }: { forum: any; onPoste: () => Promise<void> }) {
  const [corps, setCorps] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function publier() {
    if (corps.trim().length < 2) return;
    setEnvoi(true);
    try {
      await studentFetch("/api/academy/group-forum", { method: "POST", body: JSON.stringify({ corps }) });
      setCorps("");
      await onPoste();
    } finally { setEnvoi(false); }
  }

  const messages: any[] = forum?.messages || [];
  const ressources: any[] = forum?.ressources || [];

  return (
    <section className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <div className="px-5 py-3 bg-muted/30 border-b border-border/40">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" /> Forum du groupe
        </h2>
      </div>

      {ressources.length > 0 && (
        <div className="px-4 sm:px-5 py-3 border-b border-border/40 bg-primary/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Documents du parcours
          </p>
          <div className="flex flex-wrap gap-2">
            {ressources.map(r => (
              <Document key={r.id} url={r.fichier} libelle={r.fichierNom || "Document"} />
            ))}
          </div>
        </div>
      )}

      <div className="px-4 sm:px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun message pour l'instant. Lancez la conversation — c'est ici que votre groupe
            s'organise, et tout reste consultable jusqu'à la fin du parcours.
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} className="flex gap-2.5">
            <span className={`w-8 h-8 rounded-full grid place-items-center text-[10px] font-bold shrink-0 ${
              m.parMoi ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
              {initiales(m.auteur)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{m.parMoi ? "Vous" : m.auteur}</span>
                {" · "}{dateHeure(m.le)}
              </p>
              <p className="text-sm whitespace-pre-wrap break-words">{m.corps}</p>
              {m.fichier && (
                <a href={m.fichier} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1.5 mt-1">
                  <Paperclip className="w-3 h-3 shrink-0" />{m.fichierNom || "Pièce jointe"}
                </a>
              )}
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <textarea value={corps} onChange={e => setCorps(e.target.value)} rows={2}
            placeholder="Écrire à votre groupe…"
            className="flex-1 min-w-0 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <Button size="sm" onClick={publier} disabled={envoi || corps.trim().length < 2}
            className="shrink-0 self-end gap-1.5">
            {envoi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Publier
          </Button>
        </div>
      </div>
    </section>
  );
}
