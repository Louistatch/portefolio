import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Video, Plus, Loader2, Calendar, Radio, Users, Trash2, X,
  Play, Square, Copy, ExternalLink, CheckCircle2, MessageCircle, AlertCircle,
  Images, Upload, ArrowLeft, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

/**
 * Les trois formats de rencontre.
 *
 * Le type n'était qu'un réglage enfoui dans le formulaire ; il devient le point d'entrée.
 * Choisir « Webinaire » ou « Tutorat » avant d'écrire le titre aide à cadrer la séance, et
 * évite de planifier une réunion à trente personnes là où un accompagnement suffisait.
 *
 * `cle` est stockée telle quelle dans academy_meetings.kind, colonne texte libre.
 */
const TYPES = [
  {
    cle: "webinar", label: "Webinaire", court: "Webinaire",
    desc: "Vous présentez, les étudiants suivent et posent leurs questions par écrit.",
    icone: Radio, teinte: "bg-primary/10 text-primary", bordure: "hover:border-primary/50",
  },
  {
    cle: "meeting", label: "Réunion interactive", court: "Interactive",
    desc: "Tout le monde peut prendre la parole. Pour les ateliers et les échanges.",
    icone: Users, teinte: "bg-violet-500/10 text-violet-600", bordure: "hover:border-violet-500/50",
  },
  {
    cle: "tutorat", label: "Tutorat", court: "Tutorat",
    desc: "Accompagnement en petit groupe, pour débloquer une difficulté précise.",
    icone: MessageCircle, teinte: "bg-blue-500/10 text-blue-600", bordure: "hover:border-blue-500/50",
  },
];

const typeDe = (kind: string) => TYPES.find(t => t.cle === kind) ?? TYPES[1];

/** Illustration de l'état vide. Dessinée en SVG plutôt qu'importée en image : elle suit le
 *  thème clair ou sombre, ne pèse rien et ne dépend d'aucun fichier à déployer. */
function IllustrationVide() {
  return (
    <svg viewBox="0 0 320 150" className="w-full max-w-[300px] h-auto mx-auto" role="img"
      aria-label="Illustration d'une rencontre en ligne">
      <circle cx="42" cy="30" r="9" className="fill-primary/15" />
      <circle cx="286" cy="120" r="13" className="fill-violet-500/10" />
      <circle cx="298" cy="40" r="6" className="fill-blue-500/15" />
      {/* Écran principal */}
      <rect x="96" y="30" width="128" height="82" rx="10" className="fill-card stroke-border" strokeWidth="1.5" />
      <circle cx="160" cy="62" r="15" className="fill-primary/20" />
      <path d="M160 72c-11 0-19 6-21 14h42c-2-8-10-14-21-14z" className="fill-primary/20" />
      <rect x="132" y="96" width="56" height="5" rx="2.5" className="fill-muted" />
      {/* Vignettes latérales */}
      <rect x="30" y="58" width="52" height="40" rx="8" className="fill-card stroke-border" strokeWidth="1.5" />
      <circle cx="56" cy="72" r="7" className="fill-violet-500/25" />
      <path d="M56 77c-5 0-9 3-10 7h20c-1-4-5-7-10-7z" className="fill-violet-500/25" />
      <rect x="238" y="58" width="52" height="40" rx="8" className="fill-card stroke-border" strokeWidth="1.5" />
      <circle cx="264" cy="72" r="7" className="fill-blue-500/25" />
      <path d="M264 77c-5 0-9 3-10 7h20c-1-4-5-7-10-7z" className="fill-blue-500/25" />
      {/* Liens entre les participants */}
      <path d="M84 78h10M226 78h10" className="stroke-border" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" />
      {/* Barre d'outils */}
      <rect x="128" y="122" width="64" height="18" rx="9" className="fill-primary" />
      <circle cx="146" cy="131" r="3.5" className="fill-primary-foreground" />
      <circle cx="160" cy="131" r="3.5" className="fill-primary-foreground/70" />
      <circle cx="174" cy="131" r="3.5" className="fill-primary-foreground/70" />
    </svg>
  );
}


type Diapo = { url: string; titre: string };

/**
 * Envoi du support de séance.
 *
 * Les fichiers sont envoyés un par un plutôt qu'en lot : le point d'entrée d'envoi accepte un
 * fichier à la fois, et une erreur sur la troisième image ne doit pas faire perdre les deux
 * premières. Chaque diapositive déjà envoyée reste acquise.
 */
function EnvoiDiapositives({ valeur, onChange }: { valeur: Diapo[]; onChange: (d: Diapo[]) => void }) {
  const champ = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(0);
  const [total, setTotal] = useState(0);
  const [erreur, setErreur] = useState("");

  async function envoyer(e: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(e.target.files || []);
    if (!fichiers.length) return;
    setErreur(""); setTotal(fichiers.length); setEnCours(0);

    const ajoutees: Diapo[] = [];
    for (let i = 0; i < fichiers.length; i++) {
      setEnCours(i + 1);
      const fd = new FormData();
      fd.append("file", fichiers[i]);
      try {
        const r = await adminFetch("/api/admin/upload/image", { method: "POST", body: fd });
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || "Envoi refusé");
        const d = await r.json();
        // Le nom du fichier fait un titre par défaut correct, sans son extension.
        ajoutees.push({ url: d.url, titre: fichiers[i].name.replace(/\.[^.]+$/, "").slice(0, 120) });
      } catch (err: any) {
        setErreur(`« ${fichiers[i].name} » n'a pas pu être envoyée : ${err?.message || "erreur"}`);
        break;
      }
    }
    if (ajoutees.length) onChange([...valeur, ...ajoutees]);
    setTotal(0); setEnCours(0);
    if (champ.current) champ.current.value = "";
  }

  const deplacer = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= valeur.length) return;
    const copie = [...valeur];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    onChange(copie);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        Support de séance <span className="text-muted-foreground font-normal">— facultatif</span>
      </label>
      <input ref={champ} type="file" accept="image/*" multiple className="hidden" onChange={envoyer} />

      {valeur.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-2">
          {valeur.map((d, i) => (
            <div key={`${d.url}-${i}`} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-[4/3]">
              <img src={d.url} alt={d.titre} className="w-full h-full object-cover" />
              <span className="absolute top-1 left-1 w-5 h-5 rounded bg-black/65 text-white text-[10px] font-bold grid place-items-center">
                {i + 1}
              </span>
              <div className="absolute inset-x-0 bottom-0 flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-black/65">
                <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0}
                  aria-label="Déplacer avant" className="flex-1 py-1 text-white disabled:opacity-30 hover:bg-white/15">
                  <ArrowLeft className="w-3 h-3 mx-auto" />
                </button>
                <button type="button" onClick={() => onChange(valeur.filter((_, k) => k !== i))}
                  aria-label="Retirer" className="flex-1 py-1 text-red-300 hover:bg-white/15">
                  <Trash2 className="w-3 h-3 mx-auto" />
                </button>
                <button type="button" onClick={() => deplacer(i, 1)} disabled={i === valeur.length - 1}
                  aria-label="Déplacer après" className="flex-1 py-1 text-white disabled:opacity-30 hover:bg-white/15">
                  <ArrowRight className="w-3 h-3 mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={() => champ.current?.click()} disabled={total > 0}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-60">
        {total > 0
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi {enCours}/{total}…</>
          : <><Upload className="w-4 h-4" /> {valeur.length ? "Ajouter des diapositives" : "Envoyer des diapositives (images)"}</>}
      </button>

      {erreur && <p className="text-xs text-destructive mt-1.5 flex items-start gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />{erreur}
      </p>}
      <p className="text-[11px] text-muted-foreground mt-1.5">
        {valeur.length > 0
          ? `${valeur.length} diapositive${valeur.length > 1 ? "s" : ""} · projetées dans cet ordre pendant la séance.`
          : "Exportez vos diapositives en images. Elles seront projetées dans la salle, et vous les ferez défiler pour tous."}
      </p>
    </div>
  );
}

export default function AdminMeetings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const vide = { title: "", description: "", kind: "meeting", starts_at: "", duration_min: 60, slides: [] as Diapo[] };
  const [form, setForm] = useState(vide);

  const { data: meetings, isLoading } = useQuery<any[]>({
    queryKey: ["admin-meetings"],
    queryFn: async () => (await adminFetch("/api/admin/academy/meetings")).json(),
  });

  const create = useMutation({
    mutationFn: async () => {
      const r = await adminFetch("/api/admin/academy/meetings", { method: "POST", body: JSON.stringify(form) });
      // Sans ce contrôle, un refus du serveur affichait « Rencontre planifiée » et fermait
      // le formulaire : la saisie était perdue et rien n'avait été créé.
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || "Création impossible.");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-meetings"] });
      toast({ title: "Rencontre planifiée", description: "Les étudiants admis ont été notifiés." });
      setShowForm(false);
      setForm(vide);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      adminFetch(`/api/admin/academy/meetings/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-meetings"] }); },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => adminFetch(`/api/admin/academy/meetings/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-meetings"] }); toast({ title: "Supprimée" }); },
  });

  const ouvrir = (kind: string) => { setForm({ ...vide, kind }); setShowForm(true); };

  if (isLoading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const now = Date.now();
  const aVenir = (meetings || []).filter(m =>
    new Date(m.starts_at).getTime() > now - 6 * 3600e3 && m.status !== "ended" && m.status !== "cancelled");
  const passees = (meetings || []).filter(m => !aVenir.includes(m));

  // Une date dans le passé ne notifie personne utilement : on la bloque à la saisie.
  const maintenantLocal = new Date(now - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const dateDepassee = !!form.starts_at && new Date(form.starts_at).getTime() < now;

  return (
    <div className="space-y-6 pb-12">
      {/* ── En-tête ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3.5">
          <span className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center shrink-0">
            <Video className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Rencontres en ligne</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Planifiez webinaires, réunions et séances de tutorat pour vos étudiants
            </p>
          </div>
        </div>
        <Button onClick={() => ouvrir("meeting")} className="gap-2">
          <Plus className="w-4 h-4" /> Planifier
        </Button>
      </div>

      {aVenir.length === 0 ? (
        /* ── État vide : on ne se contente pas de constater, on propose un point de départ ── */
        <div className="bg-card rounded-2xl border border-border/50 px-5 py-10 sm:py-12">
          <IllustrationVide />
          <div className="text-center mt-6 mb-8">
            <p className="font-semibold text-lg">Aucune rencontre planifiée</p>
            <p className="text-sm text-muted-foreground mt-1">
              Choisissez un format. Vous pourrez y joindre vos diapositives dans la foulée.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {TYPES.map(t => (
              <button key={t.cle} onClick={() => ouvrir(t.cle)}
                className={`text-left p-4 rounded-2xl border border-border/60 bg-background transition-colors ${t.bordure} hover:bg-muted/40 group`}>
                <span className={`w-11 h-11 rounded-xl grid place-items-center mb-3 ${t.teinte}`}>
                  <t.icone className="w-5 h-5" />
                </span>
                <p className="font-semibold text-sm">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.desc}</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-3">
                  <Plus className="w-3 h-3" /> Créer
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            À venir <span className="font-normal">({aVenir.length})</span>
          </h2>
          <div className="grid gap-3">
            {aVenir.map(m => (
              <CarteRencontre key={m.id} m={m}
                onStatus={(s: string) => setStatus.mutate({ id: m.id, status: s })}
                onDelete={() => { if (confirm(`Supprimer « ${m.title} » ?`)) remove.mutate(m.id); }}
                toast={toast} />
            ))}
          </div>
        </section>
      )}

      {passees.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Passées et terminées <span className="font-normal">({passees.length})</span>
          </h2>
          <div className="grid gap-3">
            {passees.map(m => (
              <CarteRencontre key={m.id} m={m}
                onStatus={(s: string) => setStatus.mutate({ id: m.id, status: s })}
                onDelete={() => { if (confirm(`Supprimer « ${m.title} » ?`)) remove.mutate(m.id); }}
                toast={toast} past />
            ))}
          </div>
        </section>
      )}

      {/* ── Formulaire ── */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-background rounded-3xl border border-border/50 shadow-2xl p-6"
            style={{ animation: "popIn .25s cubic-bezier(.16,1,.3,1)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Planifier une rencontre</h2>
              <button onClick={() => setShowForm(false)} aria-label="Fermer"
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(t => (
                    <button key={t.cle} onClick={() => setForm({ ...form, kind: t.cle })}
                      className={`p-3 rounded-xl border text-center transition-colors ${
                        form.kind === t.cle ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                      <t.icone className={`w-4 h-4 mx-auto mb-1.5 ${form.kind === t.cle ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="font-medium text-xs leading-tight">{t.court}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">{typeDe(form.kind).desc}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Titre *</label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex : Session live — Introduction à KoboCollect" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="Au programme…" />
              </div>

              <EnvoiDiapositives valeur={form.slides} onChange={(slides) => setForm({ ...form, slides })} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date et heure *</label>
                  <Input type="datetime-local" min={maintenantLocal} value={form.starts_at}
                    onChange={e => setForm({ ...form, starts_at: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Durée (min)</label>
                  <Input type="number" min={5} step={5} value={form.duration_min}
                    onChange={e => setForm({ ...form, duration_min: Number(e.target.value) })} />
                </div>
              </div>

              {dateDepassee && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Cette date est déjà passée : les étudiants seraient prévenus d'une séance terminée.
                </p>
              )}

              <Button onClick={() => create.mutate()}
                disabled={!form.title.trim() || !form.starts_at || dateDepassee || create.isPending}
                className="w-full gap-2">
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Planifier et notifier les étudiants
              </Button>
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes popIn { from { opacity:0; transform:translate(-50%,-48%) scale(.96); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }`}</style>
    </div>
  );
}

function CarteRencontre({ m, onStatus, onDelete, toast, past }: any) {
  const debut = new Date(m.starts_at);
  const t = typeDe(m.kind);
  const joinUrl = `${window.location.origin}/academy/live/${m.id}`;
  const enDirect = m.status === "live";
  const nbDiapos = Array.isArray(m.slides) ? m.slides.length : 0;
  return (
    <div className={`bg-card rounded-2xl border p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap ${
      enDirect ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50"} ${past ? "opacity-70" : ""}`}>
      <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${t.teinte}`}>
        <t.icone className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{m.title}</p>
          {enDirect && <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded animate-pulse shrink-0">● EN DIRECT</span>}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
          <Calendar className="w-3 h-3 shrink-0" />
          {format(debut, "d MMM yyyy 'à' HH:mm", { locale: fr })}
          <span>·</span>{m.duration_min} min
          <span>·</span><span>{t.court}</span>
          {m.sms_courses?.code && <><span>·</span><span className="font-mono">{m.sms_courses.code}</span></>}
          {nbDiapos > 0 && <><span>·</span><span className="inline-flex items-center gap-1"><Images className="w-3 h-3" />{nbDiapos} diapo{nbDiapos > 1 ? "s" : ""}</span></>}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Copier le lien"
          onClick={() => { navigator.clipboard.writeText(joinUrl); toast({ title: "Lien copié" }); }}>
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <a href={joinUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Ouvrir la salle">
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </a>
        {!past && (enDirect
          ? <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => onStatus("ended")}>
              <Square className="w-3.5 h-3.5" /> Terminer
            </Button>
          : <Button size="sm" className="gap-1.5 h-8" onClick={() => onStatus("live")}>
              <Play className="w-3.5 h-3.5" /> Démarrer
            </Button>)}
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" title="Supprimer" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
