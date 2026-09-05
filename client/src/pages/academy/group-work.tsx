import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  Users, Loader2, Lock, Clock, CheckCircle2, Send, AlertCircle, Link2,
  Plus, X, Mail, Trophy, FileText, MessageSquare, Download,
  Paperclip, Upload, Pin, Shuffle, Calendar, BarChart3, PencilLine, Sparkles, BookOpen,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn, getStudent } from "@/lib/student";
import {
  GROUP_WORK_STATUS_LABEL, PEER_REVIEW_CRITERIA, PEER_REVIEW_MAX_PER_CRITERION,
  PEER_REVIEW_MAX_TOTAL, type GroupWorkStatus,
} from "@shared/groupwork";

/**
 * Travaux de groupe — reprise fidèle du modèle de référence.
 *
 * L'ordre des blocs n'est pas décoratif, c'est celui dans lequel un étudiant se pose ses
 * questions : avec qui je travaille (le tableau du groupe, en tête), ce qu'on attend de moi
 * (les consignes), ce qu'on a rendu (déposant, date, fichiers), puis les retours — ceux des
 * coéquipiers, puis celui du formateur.
 *
 * Point important : LES ÉQUIPES CHANGENT À CHAQUE TRAVAIL. Chaque carte porte donc son
 * propre groupe et son propre forum ; il n'y a pas de « mon équipe » valable pour le cursus.
 */

type Membre = { studentId: number; nom: string; email: string | null; role: string };
type Fichier = { url: string; nom: string } | null;
type Groupe = { id: number; nom: string; cohorte: string; membres: Membre[] };
type Travail = {
  id: number; index: number; titre: string; enonce: string | null;
  livrables: string[]; maxScore: number; semaine: number;
  enonceUrl: string | null; modeleUrl: string | null;
  grille: { cle: string; libelle: string; points: number }[];
  ouvertureLe: string | null; echeanceLe: string | null;
  groupe: Groupe | null; groupeLe: string | null;
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
// L'heure exacte de l'échéance, en UTC explicite : le fuseau réel de chaque étudiant n'est
// pas connu côté serveur, et afficher une heure locale non précisée aurait fait croire à
// une heure de Lomé alors que c'est l'instant UTC brut stocké en base.
const heureUTC = (d?: string | null) =>
  d ? `${new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} (UTC)` : "";

/** Progression de la fenêtre de dépôt d'un travail — entre son ouverture et son échéance. */
function fenetreDeDepot(t: Travail) {
  if (!t.ouvertureLe || !t.echeanceLe) return null;
  const debut = new Date(t.ouvertureLe).getTime();
  const fin = new Date(t.echeanceLe).getTime();
  const maintenant = Date.now();
  const total = Math.max(1, fin - debut);
  const pct = Math.round((Math.min(total, Math.max(0, maintenant - debut)) / total) * 100);
  return {
    pct,
    enRetard: maintenant > fin,
    joursRestants: Math.max(0, Math.ceil((fin - maintenant) / 86400000)),
  };
}

const TON: Record<GroupWorkStatus, { badge: string; icone: any }> = {
  locked:    { badge: "bg-muted text-muted-foreground", icone: Lock },
  available: { badge: "bg-primary/15 text-primary", icone: Send },
  submitted: { badge: "bg-blue-500/15 text-blue-600", icone: Clock },
  completed: { badge: "bg-primary text-white", icone: CheckCircle2 },
  missed:    { badge: "bg-amber-500/15 text-amber-600", icone: AlertCircle },
};

const initiales = (nom?: string | null) =>
  (nom || "").split(" ").filter(Boolean).map(m => m[0]).slice(0, 2).join("").toUpperCase() || "ET";

export default function AcademyGroupWork() {
  const [, navigate] = useLocation();
  const moi = getStudent();
  const [data, setData] = useState<any>(null);
  const [cohorte, setCohorte] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Le travail affiché en détail sous la grille — vue « maître-détail » plutôt que trois
  // fiches complètes empilées : on scanne la grille d'un coup d'œil, puis on ouvre celle
  // qui compte. Sans sélection explicite, on ouvre celle qui attend une action.
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const charger = async () => {
    const [d, promo] = await Promise.all([
      studentFetch("/api/academy/group-work").then(r => r.json()).catch(() => null),
      studentFetch("/api/academy/cohort-forum").then(r => r.json()).catch(() => null),
    ]);
    setData(d);
    setCohorte(promo && promo.actif !== false ? promo : null);
  };

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => { await charger(); setLoading(false); })();
  }, []);

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!data || data.actif === false) {
    return <Vide icone={Users} titre="Les travaux de groupe ne sont pas encore ouverts."
      detail="Revenez un peu plus tard, ou écrivez-nous si cela persiste." />;
  }
  if (data.admis === false) {
    return <Vide icone={Lock} titre="Réussissez d'abord le test d'admission."
      detail="Les travaux de groupe s'ouvrent ensuite, avec votre équipe."
      action={<Button className="mt-4" onClick={() => navigate("/academy/dashboard")}>Retour à mon espace</Button>} />;
  }

  const travaux: Travail[] = data.travaux || [];
  const corriges = travaux.filter(t => t.statut === "completed").length;

  const actionnable = travaux.find(t => t.statut === "available" || t.statut === "missed");
  const dernierTraite = [...travaux].reverse().find(t => t.statut === "submitted" || t.statut === "completed");
  const selected = travaux.find(t => t.id === selectedId) || actionnable || dernierTraite || travaux[0];
  const joursRestants = actionnable?.echeanceLe
    ? Math.max(0, Math.ceil((new Date(actionnable.echeanceLe).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SEO title="Travaux de groupe — LouisFarm Learning" description="Les évaluations collectives du cursus." />

      {/* ───── En-tête minimal : un dashboard s'ouvre sur des chiffres, pas une bannière ───── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="titre-affichage text-2xl sm:text-[28px] font-semibold">Travaux de groupe</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Trois projets collectifs jalonnent votre parcours. Une équipe différente est tirée
            au sort pour chacun, une semaine avant son ouverture.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold bg-primary/10 text-primary px-3.5 py-2 rounded-full shrink-0">
          <Trophy className="w-4 h-4" /> {corriges}/{travaux.length} corrigé{corriges > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3"><CheckCircle2 className="w-[18px] h-[18px]" /></div>
          <p className="text-2xl font-bold chiffres-tabulaires">{corriges} / {travaux.length}</p>
          <p className="text-xs text-muted-foreground mt-1.5">Travaux corrigés</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3"><Clock className="w-[18px] h-[18px]" /></div>
          <p className="text-2xl font-bold chiffres-tabulaires">{joursRestants != null ? joursRestants : "—"}</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {actionnable ? `jour${(joursRestants ?? 0) > 1 ? "s" : ""} avant l'échéance de « ${actionnable.titre} »` : "Aucune échéance en attente"}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3"><Users className="w-[18px] h-[18px]" /></div>
          <p className="text-2xl font-bold chiffres-tabulaires">{selected?.groupe?.membres.length ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1.5 truncate">Coéquipiers sur « {selected?.titre} »</p>
        </div>
      </div>

      {/* ───── Grille des travaux : vue d'ensemble, cliquable ───── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {travaux.map(t => (
          <CarteResume key={t.id} travail={t} actif={t.id === selected?.id} onSelect={() => setSelectedId(t.id)} />
        ))}
      </div>

      {/* ───── Détail du travail sélectionné ───── */}
      {selected && (
        <CarteTravail key={selected.id} travail={selected} moiId={moi?.id} consignes={data.consignes} onChange={charger} />
      )}

      {cohorte && <ForumPromotion promo={cohorte} onPoste={charger} />}
    </div>
  );
}

/**
 * Carte de résumé d'un travail, dans la grille du haut.
 *
 * Elle ne porte aucune action propre : cliquer ouvre le détail complet plus bas (équipe,
 * consignes, dépôt, évaluations), qui reste la seule fiche interactive. Dupliquer le
 * formulaire de dépôt ici aurait forcé à choisir laquelle des deux copies fait foi.
 */
function CarteResume({ travail: t, actif, onSelect }: { travail: Travail; actif: boolean; onSelect: () => void }) {
  const ton = TON[t.statut] ?? TON.locked;
  const Icone = ton.icone;
  const pct = t.statut === "completed" && t.note != null ? Math.round((t.note / t.maxScore) * 100)
    : t.statut === "submitted" ? 100 : 0;
  const couleurBarre = t.statut === "completed" ? "bg-primary" : t.statut === "submitted" ? "bg-blue-500" : "bg-transparent";

  return (
    <button onClick={onSelect}
      className={`text-left bg-card rounded-2xl border overflow-hidden transition-colors pressable ${
        actif ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50 hover:border-primary/30"}`}>
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40">
        <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${ton.badge}`}>
          <Icone className="w-[18px] h-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{t.titre}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            Semaine {t.semaine} · {t.statut === "locked" ? `s'ouvre le ${jourCourt(t.ouvertureLe)}` : `avant le ${jourCourt(t.echeanceLe)}`}
          </p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${ton.badge}`}>
          {t.statut === "completed" && t.note != null ? `${t.note}/${t.maxScore}` : GROUP_WORK_STATUS_LABEL[t.statut]}
        </span>
      </div>
      <div className="px-4 py-3.5 space-y-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          {t.groupe ? (
            <>
              <span className="flex items-center -space-x-2 shrink-0">
                {t.groupe.membres.slice(0, 4).map(m => (
                  <span key={m.studentId} className="w-6 h-6 rounded-full bg-emerald-100 text-primary grid place-items-center text-[9px] font-bold border-2 border-card">
                    {initiales(m.nom)}
                  </span>
                ))}
              </span>
              <span className="truncate">{t.groupe.nom}</span>
            </>
          ) : (
            <><Shuffle className="w-3.5 h-3.5 shrink-0" /> équipe pas encore tirée au sort</>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${couleurBarre}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </button>
  );
}

function Vide({ titre, detail, icone: Icone, action }:
  { titre: string; detail: string; icone: any; action?: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto">
      <SEO title="Travaux de groupe — LouisFarm Learning" description="Les évaluations collectives du cursus." />
      <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
        <Icone className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium">{titre}</p>
        <p className="text-sm text-muted-foreground mt-1">{detail}</p>
        {action}
      </div>
    </div>
  );
}

/** Un bloc de la fiche, avec son intitulé — la trame du modèle de référence. */
function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold mb-1.5">{titre}</p>
      {children}
    </div>
  );
}

/**
 * L'échéance, en priorité visuelle — la carte que l'œil doit trouver en premier.
 *
 * Trois états, jamais la même carte : verrouillé (aucune échéance n'existe encore, donc
 * aucune ne s'affiche), ouvert (la seule vraie échéance, sa date ET son heure, jamais une
 * date d'ouverture), corrigé (l'échéance est de l'histoire ancienne, la note prime).
 */
function CarteEcheance({ t }: { t: Travail }) {
  if (t.statut === "locked") {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-5 flex items-center gap-3">
        <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium">Le dépôt n'est pas encore ouvert</p>
          <p className="text-sm text-muted-foreground mt-0.5">Ouverture le {jour(t.ouvertureLe)}.</p>
        </div>
      </div>
    );
  }

  if (t.statut === "completed") {
    return (
      <div className="rounded-2xl p-5 sm:p-6 text-white" style={{ background: "linear-gradient(135deg, #085e41, #043823)" }}>
        <div className="flex items-center gap-2 text-white/70 text-[11px] font-semibold uppercase tracking-wide">
          <CheckCircle2 className="w-4 h-4" /> Travail corrigé
        </div>
        <p className="titre-affichage text-2xl sm:text-3xl font-semibold mt-2">{t.note}/{t.maxScore}</p>
        <p className="text-sm text-white/80 mt-1">Rendu déposé le {jour(t.rendu?.le)}</p>
      </div>
    );
  }

  const fenetre = fenetreDeDepot(t);
  return (
    <div className="rounded-2xl p-5 sm:p-6 text-white" style={{ background: "linear-gradient(135deg, #085e41, #043823)" }}>
      <div className="flex items-center gap-2 text-white/70 text-[11px] font-semibold uppercase tracking-wide">
        <Calendar className="w-4 h-4" /> Date limite de soumission
      </div>
      <p className="titre-affichage text-2xl sm:text-3xl font-semibold mt-2">{jour(t.echeanceLe)}</p>
      <p className="text-sm text-white/80 mt-1">{heureUTC(t.echeanceLe)}</p>
      {fenetre && (
        <>
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden mt-4">
            <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${fenetre.pct}%` }} />
          </div>
          <p className="text-xs text-white/80 mt-1.5 chiffres-tabulaires">
            {fenetre.enRetard ? "Échéance dépassée" : `${fenetre.joursRestants} jour${fenetre.joursRestants > 1 ? "s" : ""} restant${fenetre.joursRestants > 1 ? "s" : ""}`}
          </p>
        </>
      )}
      <div className="flex items-start gap-2 bg-white/10 rounded-xl px-3 py-2.5 mt-4">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="text-xs text-white/90">Après cette date, aucune modification ni dépôt ne sera accepté.</p>
      </div>
    </div>
  );
}

/**
 * Le calendrier du travail, en ligne du temps — mais fait des seuls jalons RÉELS
 * (formation de l'équipe, ouverture, dépôt, échéance ou correction). Rien n'est inventé :
 * pas de plan de travail au jour le jour, que rien dans le modèle de données ne porte.
 */
function PlanningTravail({ t }: { t: Travail }) {
  const maintenant = Date.now();
  type Etape = { label: string; date: string | null; fait: boolean; alerte?: boolean };
  const etapes: Etape[] = [];
  if (t.groupeLe) etapes.push({ label: "Équipe tirée au sort", date: t.groupeLe, fait: !!t.groupe });
  if (t.ouvertureLe) etapes.push({ label: "Ouverture du dépôt", date: t.ouvertureLe, fait: maintenant >= new Date(t.ouvertureLe).getTime() });
  if (t.rendu) {
    etapes.push({
      label: t.rendu.parMoi ? "Rendu déposé par vous" : `Rendu déposé par ${t.rendu.par || "un membre"}`,
      date: t.rendu.le, fait: true,
    });
  }
  if (t.echeanceLe) {
    etapes.push({
      label: t.statut === "completed" ? "Correction reçue" : "Soumission finale",
      date: t.statut === "completed" ? (t.rendu?.le ?? t.echeanceLe) : t.echeanceLe,
      fait: t.statut === "completed",
      // Rouge seulement une fois le dépôt réellement ouvert : une échéance verrouillée,
      // loin devant, n'a rien d'une urgence — la marquer en rouge l'aurait fait paraître
      // comme telle.
      alerte: t.statut === "available" || t.statut === "missed",
    });
  }
  if (!etapes.length) return null;

  return (
    <div className="rounded-xl border border-border/60 p-4">
      <p className="text-sm font-semibold mb-3">Calendrier de ce travail</p>
      <ol className="space-y-3">
        {etapes.map((e, i) => (
          <li key={i} className="flex items-start gap-2.5">
            {e.fait
              ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              : e.alerte
                ? <span className="w-2.5 h-2.5 rounded-full bg-destructive shrink-0 mt-1 ml-[3px]" />
                : <span className="w-2.5 h-2.5 rounded-full border-2 border-muted-foreground/40 shrink-0 mt-1 ml-[3px]" />}
            <div className="min-w-0">
              <p className={`text-sm ${e.alerte && !e.fait ? "text-destructive font-medium" : ""}`}>{e.label}</p>
              <p className="text-xs text-muted-foreground">{jourCourt(e.date)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const COULEURS_GRILLE = [
  { tint: "bg-emerald-500/10", text: "text-emerald-600", icone: BarChart3 },
  { tint: "bg-blue-500/10", text: "text-blue-600", icone: PencilLine },
  { tint: "bg-purple-500/10", text: "text-purple-600", icone: Sparkles },
  { tint: "bg-amber-500/10", text: "text-amber-600", icone: FileText },
];

/** La grille de notation, visible AVANT le dépôt : un étudiant devrait savoir sur quoi il
 *  est jugé avant de rendre, pas seulement le découvrir dans sa correction. */
function GrilleNotation({ grille, maxScore }: { grille: { cle: string; libelle: string; points: number }[]; maxScore: number }) {
  if (!grille.length) return null;
  return (
    <div>
      <p className="text-sm font-semibold mb-2.5">Grille de notation ({maxScore} points)</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {grille.map((c, i) => {
          const s = COULEURS_GRILLE[i % COULEURS_GRILLE.length];
          const Icone = s.icone;
          return (
            <div key={c.cle} className="rounded-xl border border-border/50 p-3.5">
              <div className={`w-8 h-8 rounded-lg ${s.tint} ${s.text} grid place-items-center mb-2`}>
                <Icone className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold chiffres-tabulaires">{c.points} pts</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{c.libelle}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CarteTravail({ travail: t, moiId, consignes, onChange }:
  { travail: Travail; moiId?: number; consignes: any; onChange: () => Promise<void> }) {
  const [depot, setDepot] = useState(false);
  const [forum, setForum] = useState<any>(null);
  const ton = TON[t.statut] ?? TON.locked;
  const Icone = ton.icone;
  const verrouille = t.statut === "locked";
  const deposable = t.statut === "available" || t.statut === "missed" || t.statut === "submitted";
  const rendu = t.rendu;

  const chargerForum = async () => {
    if (!t.groupe) return;
    const f = await studentFetch(`/api/academy/group-forum/${t.id}`).then(r => r.json()).catch(() => null);
    setForum(f && !f.message ? f : null);
  };
  useEffect(() => { chargerForum(); }, [t.groupe?.id]);

  return (
    <section className={`bg-card rounded-2xl border overflow-hidden ${
      t.statut === "available" || t.statut === "missed" ? "border-primary/40" : "border-border/50"}`}>

      {/* ── En-tête ── */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-border/40">
        <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${ton.badge}`}>
          <Icone className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="titre-affichage font-semibold text-lg truncate">{t.titre}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            Semaine {t.semaine}{t.groupe ? ` · ${t.groupe.nom} · promotion ${t.groupe.cohorte}` : ""}
          </p>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full shrink-0 ${ton.badge}`}>
          {t.statut === "completed" && t.note != null
            ? `${t.note}/${t.maxScore}`
            : GROUP_WORK_STATUS_LABEL[t.statut]}
        </span>
      </div>

      <div className="px-4 sm:px-5 py-4 space-y-5">

        {/* ── L'échéance, priorité visuelle ── */}
        <CarteEcheance t={t} />

        {/* ── 1. Le groupe, en tête, comme dans le modèle ── */}
        <TableauGroupe groupe={t.groupe} groupeLe={t.groupeLe} moiId={moiId} rendu={t.rendu} />

        {/* ── Le calendrier de ce travail ── */}
        <PlanningTravail t={t} />

        {/* ── La grille de notation, avant le dépôt : on sait sur quoi on est jugé ── */}
        {t.statut !== "completed" && <GrilleNotation grille={t.grille} maxScore={t.maxScore} />}

        {/* ── 2. Les documents ── */}
        {(t.enonceUrl || t.modeleUrl) && (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {t.enonceUrl && <Document url={t.enonceUrl} libelle="Énoncé et grille de notation (PDF)" />}
            {t.modeleUrl && <Document url={t.modeleUrl} libelle="Modèle de rapport (DOCX)" />}
          </div>
        )}

        {/* ── 3. Les consignes de rendu, en deux cartes ── */}
        {consignes && t.statut !== "completed" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { bloc: consignes.avant, tint: "bg-blue-500/10", text: "text-blue-600", icone: BookOpen },
              { bloc: consignes.pret, tint: "bg-amber-500/10", text: "text-amber-600", icone: Send },
            ].map(({ bloc, tint, text, icone: IconeBloc }) => (
              <div key={bloc.titre} className="rounded-xl border border-border/50 p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`w-7 h-7 rounded-lg ${tint} ${text} grid place-items-center shrink-0`}>
                    <IconeBloc className="w-3.5 h-3.5" />
                  </span>
                  <p className="text-sm font-semibold">{bloc.titre}</p>
                </div>
                <ul className="space-y-1.5">
                  {bloc.points.map((pt: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-[7px] shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* ── Rédiger à plusieurs, avant le dépôt ──
            Le dépôt reste un PDF, inchangé : ce qui change, c'est la manière de RÉDIGER ce
            PDF. Un Google Doc partagé permet au groupe d'écrire ensemble, en même temps,
            au lieu de s'échanger des versions par email. La structure recommandée reprend
            les intitulés de LA GRILLE DE CE TRAVAIL — pas un plan générique — pour que le
            document réponde exactement à ce qui sera noté, correction humaine ou automatique. */}
        {t.grille?.length > 0 && t.statut !== "completed" && (
          <div className="rounded-xl border border-border/60 bg-primary/[0.03] p-4 space-y-2.5">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Rédiger le rapport à plusieurs, dans Google Docs
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                Un membre du groupe crée un Google Doc et le partage avec les autres en mode{" "}
                <strong className="text-foreground">Éditeur</strong> (bouton Partager, en collant les
                adresses email de l'équipe) : vous rédigez alors ensemble, en même temps.
              </li>
              <li>
                Structurez le document avec un titre par critère de la grille de notation, dans cet ordre :
                <ul className="mt-1.5 space-y-1 ml-1">
                  {t.grille.map((c: any) => (
                    <li key={c.cle} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-primary mt-[7px] shrink-0" />
                      <span>{c.libelle} <span className="text-xs">({c.points} pts)</span></span>
                    </li>
                  ))}
                </ul>
              </li>
              <li>
                Une fois le rapport terminé : dans Google Docs, <strong className="text-foreground">
                Fichier → Télécharger → Document PDF</strong>, puis déposez ce PDF ci-dessous comme
                rapport du groupe — c'est ce fichier, et lui seul, qui est ensuite corrigé.
              </li>
            </ol>
          </div>
        )}

        {verrouille ? null : (
          <>
            {/* ── 4. Le rendu : déposant, date, fichiers ── */}
            {rendu ? (
              <div className="space-y-3">
                <Bloc titre="Déposé par :">
                  <p className="text-sm text-muted-foreground">{rendu.parMoi ? "Vous" : rendu.par || "—"}</p>
                </Bloc>
                <Bloc titre="Date de dépôt :">
                  <p className="text-sm text-muted-foreground">{jour(rendu.le)}</p>
                </Bloc>
                <Bloc titre="Fichiers déposés :">
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {rendu.rapport && <Document url={rendu.rapport.url} libelle={rendu.rapport.nom || "Rapport"} sombre />}
                    {rendu.archive && <Document url={rendu.archive.url} libelle={rendu.archive.nom || "Archive"} sombre />}
                    {!rendu.rapport && !rendu.archive && <span className="text-sm text-muted-foreground">—</span>}
                  </div>
                </Bloc>
                {rendu.contenu?.summary && (
                  <Bloc titre="Description du rendu :">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rendu.contenu.summary}</p>
                  </Bloc>
                )}
                {Array.isArray(rendu.contenu?.links) && rendu.contenu.links.length > 0 && (
                  <Bloc titre="Liens complémentaires :">
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
                  </Bloc>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun rendu déposé pour l'instant.
                {t.statut === "missed" && " L'échéance est passée — le dépôt reste possible jusqu'à la fin de votre période d'admission."}
              </p>
            )}

            {deposable && t.groupe && (
              depot
                ? <Formulaire travail={t} onFini={async () => { setDepot(false); await onChange(); }} onAnnuler={() => setDepot(false)} />
                : <Button size="sm" variant={rendu ? "outline" : "default"} className="gap-1.5" onClick={() => setDepot(true)}>
                    <Send className="w-3.5 h-3.5" /> {rendu ? "Modifier le rendu" : "Déposer le rendu du groupe"}
                  </Button>
            )}

            {/* ── 5. Évaluations reçues des coéquipiers ── */}
            {(t.statut === "submitted" || t.statut === "completed") && t.groupe && (
              <EvaluationPairs travailId={t.id} moiId={moiId} />
            )}

            {/* ── 6. Évaluation du formateur ── */}
            {t.statut === "completed" && <EvaluationFormateur travail={t} />}
          </>
        )}

        {/* ── 7. Le fil du groupe ── */}
        {t.groupe && <ForumGroupe travailId={t.id} forum={forum} onPoste={chargerForum} />}
      </div>
    </section>
  );
}

/**
 * L'équipe, en cartes plutôt qu'en tableau : un coéquipier se reconnaît d'un coup d'œil à
 * son avatar, et la carte de celui qui a déposé le rendu du groupe porte une mention
 * dédiée — utile pour savoir sans demander à qui écrire en cas de question sur le dépôt.
 */
function TableauGroupe({ groupe, groupeLe, moiId, rendu }:
  { groupe: Groupe | null; groupeLe: string | null; moiId?: number; rendu?: Travail["rendu"] }) {
  if (!groupe) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-4 flex items-start gap-3">
        <Shuffle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">L'équipe de ce travail n'est pas encore tirée au sort</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Elle le sera {groupeLe ? `le ${jour(groupeLe)}` : "une semaine avant l'ouverture du dépôt"}.
            Vous recevrez un email avec la composition de votre équipe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="px-3.5 py-2.5 bg-muted/40 border-b border-border/40">
        <p className="text-sm font-semibold">{groupe.nom} · promotion {groupe.cohorte}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2.5 p-3">
        {groupe.membres.map(m => {
          const cestVous = m.studentId === moiId;
          const aDepose = !!rendu && (cestVous ? rendu.parMoi : m.nom === rendu.par);
          return (
            <div key={m.studentId} className="flex items-center gap-2.5 rounded-xl border border-border/50 p-2.5">
              <span className="w-9 h-9 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold shrink-0">
                {initiales(m.nom)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {m.nom}{cestVous && <span className="text-muted-foreground font-normal"> · vous</span>}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{m.email || "—"}</p>
                {aDepose && <p className="text-[10px] font-semibold text-primary mt-0.5">A déposé le rendu</p>}
              </div>
              {m.email && !cestVous && (
                <a href={`mailto:${m.email}`} aria-label={`Écrire à ${m.nom}`}
                  className="w-8 h-8 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-primary shrink-0">
                  <Mail className="w-4 h-4" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Une carte de document téléchargeable : icône, nom, extension, action — plutôt qu'un
 *  simple lien texte perdu dans une ligne de pastilles. */
function Document({ url, libelle, sombre }: { url: string; libelle: string; sombre?: boolean }) {
  const ext = libelle.match(/\(([A-Z]+)\)\s*$/)?.[1] ?? null;
  const nom = ext ? libelle.replace(/\s*\([A-Z]+\)\s*$/, "") : libelle;
  return (
    <a href={url} download target="_blank" rel="noopener noreferrer"
      className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-colors ${
        sombre
          ? "bg-slate-800 text-white hover:bg-slate-700"
          : "border border-border/60 bg-card hover:border-primary/40"}`}>
      <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${sombre ? "bg-white/10" : "bg-primary/10 text-primary"}`}>
        <FileText className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium truncate">{nom}</span>
        {ext && <span className={`block text-[11px] ${sombre ? "text-white/60" : "text-muted-foreground"}`}>{ext}</span>}
      </span>
      <Download className={`w-4 h-4 shrink-0 ${sombre ? "text-white/70" : "text-muted-foreground group-hover:text-primary"}`} />
    </a>
  );
}

/**
 * « Évaluations reçues des membres du groupe » — une colonne par coéquipier, comme le
 * modèle. Chacun voit ce qu'il a REÇU, ligne par ligne, mais pas qui a mis quoi : nommer
 * les évaluateurs transformerait l'exercice en règlement de comptes, et plus personne ne
 * mettrait autre chose que le maximum.
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
        method: "POST", body: JSON.stringify({ membre: cible, notes, commentaire }),
      });
      setCible(null);
      await charger();
    } finally { setEnvoi(false); }
  }

  if (!d) return null;
  const aEvaluer: any[] = d.aEvaluer || [];
  const recues: any[] = d.recues || [];

  return (
    <div className="space-y-3">
      <Bloc titre="Évaluations reçues des membres du groupe">
        {recues.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune évaluation reçue pour l'instant.</p>
        ) : (
          <div className="rounded-xl border border-border/60 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3.5 py-2">Critère</th>
                  {recues.map((_, i) => (
                    <th key={i} className="text-center font-medium px-3 py-2 whitespace-nowrap">
                      Coéquipier {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PEER_REVIEW_CRITERIA.map(c => (
                  <tr key={c.cle} className="border-t border-border/40">
                    <td className="px-3.5 py-2.5">{c.libelle}</td>
                    {recues.map((r, i) => (
                      <td key={i} className="px-3 py-2.5 text-center font-semibold">{r.scores?.[c.cle] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-border/60 bg-muted/20 font-semibold">
                  <td className="px-3.5 py-2.5">Total</td>
                  {recues.map((r, i) => (
                    <td key={i} className="px-3 py-2.5 text-center">{r.total ?? 0}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Sur {PEER_REVIEW_MAX_TOTAL} points. Les évaluations reçues sont anonymes.
        </p>
      </Bloc>

      {aEvaluer.length > 0 && (
        <Bloc titre="Évaluer mes coéquipiers">
          <div className="space-y-1.5">
            {aEvaluer.map((m: any) => (
              <div key={m.studentId} className="flex items-center gap-2 text-sm">
                <span className="truncate flex-1">{m.nom}</span>
                {m.dejaFait
                  ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">évalué</span>
                  : <span className="text-[10px] text-muted-foreground shrink-0">à évaluer</span>}
                <button onClick={() => ouvrir(m)} className="text-xs text-muted-foreground hover:text-primary shrink-0">
                  {m.dejaFait ? "Modifier" : "Évaluer"}
                </button>
              </div>
            ))}
          </div>

          {cible && (
            <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2.5">
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
        </Bloc>
      )}
    </div>
  );
}

/** « Évaluation du formateur » — critères et points obtenus, comme le modèle. */
function EvaluationFormateur({ travail: t }: { travail: Travail }) {
  return (
    <Bloc titre="Évaluation du formateur">
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-3.5 py-2">Critère</th>
              <th className="text-right font-medium px-3.5 py-2 whitespace-nowrap">Points obtenus</th>
            </tr>
          </thead>
          <tbody>
            {(t.grille || []).map(c => (
              <tr key={c.cle} className="border-t border-border/40">
                <td className="px-3.5 py-2.5">{c.libelle}</td>
                <td className="px-3.5 py-2.5 text-right font-semibold whitespace-nowrap">
                  {t.notesParCritere?.[c.cle] ?? "—"}<span className="text-muted-foreground font-normal"> / {c.points}</span>
                </td>
              </tr>
            ))}
            <tr className="border-t border-border/60 bg-primary/5 font-bold">
              <td className="px-3.5 py-2.5">Total</td>
              <td className="px-3.5 py-2.5 text-right text-primary whitespace-nowrap">{t.note} / {t.maxScore}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {t.feedback && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{t.feedback}</p>}
    </Bloc>
  );
}

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
        body: JSON.stringify({ resume, contributions, rapport, archive, liens: liens.filter(l => l.url.trim()) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(json?.message || "Le dépôt a échoué."); return; }
      await onFini();
    } finally { setEnvoi(false); }
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold flex items-center gap-2"><Upload className="w-4 h-4 text-primary" /> Soumission du projet</p>
        {travail.echeanceLe && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-destructive/10 text-destructive whitespace-nowrap">
            Date limite : {jour(travail.echeanceLe)} à {heureUTC(travail.echeanceLe)}
          </span>
        )}
      </div>

      <ChampFichier travailId={travail.id} libelle="Rapport du groupe" accept=".pdf" obligatoire dropzone
        fichier={rapport} onFichier={setRapport} />
      <ChampFichier travailId={travail.id} libelle="Fichiers annexes (ZIP, facultatif)" accept=".zip,.xlsx,.csv,.docx"
        fichier={archive} onFichier={setArchive} />

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
              <input value={l.label} onChange={e => majLien(i, "label", e.target.value)} placeholder="Formulaire Kobo"
                className="w-36 sm:w-44 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" />
              <input value={l.url} onChange={e => majLien(i, "url", e.target.value)} placeholder="https://…" inputMode="url"
                className="flex-1 min-w-0 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" />
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
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm resize-y" />
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
      <p className="text-[11px] text-muted-foreground">
        Ce dépôt vaut pour tous les membres du groupe et remplace le précédent tant que la
        correction n'a pas eu lieu.
      </p>
    </div>
  );
}

/** Le fichier part vers le stockage dès sa sélection : le dépôt n'est plus alors qu'un
 *  enregistrement, ce qui évite qu'un envoi de 30 Mo échoue en emportant la soumission. */
/**
 * Le champ de dépôt d'un fichier — en compact (archive annexe) ou en grande dropzone
 * glisser-déposer (rapport principal, la « zone de soumission » qui doit sauter aux yeux).
 * Les deux formes partagent le même envoi : le fichier part vers le stockage dès sa
 * sélection, glissée ou choisie — le dépôt final n'est plus alors qu'un enregistrement, ce
 * qui évite qu'un envoi de 30 Mo échoue en emportant la soumission.
 */
function ChampFichier({ travailId, libelle, accept, fichier, onFichier, obligatoire, dropzone }: {
  travailId: number; libelle: string; accept: string; fichier: Fichier;
  onFichier: (f: Fichier) => void; obligatoire?: boolean; dropzone?: boolean;
}) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [survole, setSurvole] = useState(false);

  async function envoyerFichier(f: File) {
    setErreur(""); setEnvoi(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await studentFetch(`/api/academy/group-work/${travailId}/upload`, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(json?.message || "Envoi impossible."); return; }
      onFichier({ url: json.url, nom: json.nom });
    } finally { setEnvoi(false); }
  }

  function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) envoyerFichier(f);
  }

  function deposer(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault(); setSurvole(false);
    const f = e.dataTransfer.files?.[0];
    if (f) envoyerFichier(f);
  }

  if (!dropzone) {
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

  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        {libelle}{obligatoire && <span className="text-destructive"> *</span>}
      </label>
      {fichier ? (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-background px-4 py-4">
          <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
            <FileText className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium truncate">{fichier.nom}</span>
            <span className="block text-xs text-primary">Projet soumis avec succès</span>
          </span>
          <button onClick={() => onFichier(null)} aria-label="Retirer le fichier"
            className="w-8 h-8 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-destructive shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          onDragOver={e => { e.preventDefault(); setSurvole(true); }}
          onDragLeave={() => setSurvole(false)}
          onDrop={deposer}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center cursor-pointer transition-colors ${
            survole ? "border-primary bg-primary/5" : "border-border/60 bg-background hover:border-primary/40"}`}>
          {envoi ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Téléversement en cours…</span>
              <div className="w-40 h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                <div className="h-full w-2/3 bg-primary rounded-full animate-pulse" />
              </div>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm">Déposez votre rapport final au format PDF</span>
              <span className="pointer-events-none inline-flex items-center gap-1.5 h-8 px-3 mt-1 rounded-lg border border-border/60 bg-card text-xs font-medium">
                Choisir un fichier
              </span>
              <span className="text-[11px] text-muted-foreground mt-1">Format accepté : PDF uniquement · Taille max. : 50 Mo</span>
            </>
          )}
          <input type="file" accept={accept} className="hidden" onChange={choisir} disabled={envoi} />
        </label>
      )}
      {erreur && (
        <p className="text-xs text-destructive mt-1.5 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{erreur}
        </p>
      )}
    </div>
  );
}

/** Le fil du groupe de CE travail. Il naît et meurt avec l'équipe : les coéquipiers du
 *  travail suivant ne sont pas les mêmes, et n'ont pas à lire cette conversation. */
function ForumGroupe({ travailId, forum, onPoste }:
  { travailId: number; forum: any; onPoste: () => Promise<void> }) {
  const [corps, setCorps] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function publier() {
    if (corps.trim().length < 2) return;
    setEnvoi(true);
    try {
      await studentFetch(`/api/academy/group-forum/${travailId}`, {
        method: "POST", body: JSON.stringify({ corps }),
      });
      setCorps("");
      await onPoste();
    } finally { setEnvoi(false); }
  }

  const messages: any[] = forum?.messages || [];
  const ressources: any[] = forum?.ressources || [];

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="px-3.5 py-2 bg-muted/40 border-b border-border/40">
        <p className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-primary" /> Échanges du groupe
        </p>
      </div>

      {ressources.length > 0 && (
        <div className="px-3.5 py-2.5 border-b border-border/40 bg-primary/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Documents
          </p>
          <div className="flex flex-wrap gap-2">
            {ressources.map(r => <Document key={r.id} url={r.fichier} libelle={r.fichierNom || "Document"} />)}
          </div>
        </div>
      )}

      <div className="p-3.5 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun message. C'est ici que votre groupe s'organise pour ce travail.
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} className="flex gap-2.5">
            <span className={`w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold shrink-0 ${
              m.parMoi ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
              {initiales(m.auteur)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{m.parMoi ? "Vous" : m.auteur}</span>
                {" · "}{dateHeure(m.le)}
              </p>
              <p className="text-sm whitespace-pre-wrap break-words">{m.corps}</p>
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <textarea value={corps} onChange={e => setCorps(e.target.value)} rows={2}
            placeholder="Écrire à votre groupe…"
            className="flex-1 min-w-0 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm resize-y" />
          <Button size="sm" onClick={publier} disabled={envoi || corps.trim().length < 2}
            className="shrink-0 self-end gap-1.5">
            {envoi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Publier
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Forum de la promotion — le formateur et tous les étudiants d'une même cohorte.
 * Il ne bouge pas d'un travail à l'autre : c'est le seul endroit stable du dispositif.
 */
function ForumPromotion({ promo, onPoste }: { promo: any; onPoste: () => Promise<void> }) {
  const [corps, setCorps] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function publier() {
    if (corps.trim().length < 2) return;
    setEnvoi(true);
    try {
      await studentFetch("/api/academy/cohort-forum", { method: "POST", body: JSON.stringify({ corps }) });
      setCorps("");
      await onPoste();
    } finally { setEnvoi(false); }
  }

  const annonces: any[] = promo.annonces || [];
  const messages: any[] = promo.messages || [];

  return (
    <section className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border/40">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" /> Forum de la promotion
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Promotion {promo.cohorte}{promo.effectif ? ` · ${promo.effectif} étudiants` : ""}
        </span>
      </div>

      {annonces.length > 0 && (
        <div className="px-4 sm:px-5 py-3 border-b border-border/40 bg-primary/[0.03] space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Annonces du formateur
          </p>
          {annonces.map(a => (
            <div key={a.id}>
              <p className="text-[11px] text-muted-foreground">{a.auteur} · {dateHeure(a.le)}</p>
              <p className="text-sm whitespace-pre-wrap break-words">{a.corps}</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 sm:px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun message dans la promotion. C'est l'endroit pour les questions qui intéressent
            tout le monde — le formateur y répond.
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} className="flex gap-2.5">
            <span className={`w-8 h-8 rounded-full grid place-items-center text-[10px] font-bold shrink-0 ${
              m.formateur ? "bg-primary text-white" : m.parMoi ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {initiales(m.auteur)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{m.parMoi ? "Vous" : m.auteur}</span>
                {m.formateur && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">FORMATEUR</span>}
                {" · "}{dateHeure(m.le)}
              </p>
              <p className="text-sm whitespace-pre-wrap break-words">{m.corps}</p>
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <textarea value={corps} onChange={e => setCorps(e.target.value)} rows={2}
            placeholder="Poser une question à la promotion…"
            className="flex-1 min-w-0 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm resize-y" />
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
