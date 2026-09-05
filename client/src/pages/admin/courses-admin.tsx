import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  BookOpen, Plus, Loader2, ArrowLeft, Pencil, Trash2, ChevronUp, ChevronDown,
  AlertTriangle, GripVertical, ListChecks, Type, MessageSquareQuote,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PROGRAMS } from "@shared/programs";

/**
 * Auteur de cours — administration.
 *
 * Jusqu'ici, ajouter un cours demandait d'écrire du TypeScript (shared/<code>.ts), de le
 * projeter en SQL et de déployer. Cette page ouvre la même chose depuis l'administration —
 * un COURS de plus sur un PARCOURS EXISTANT — sans remplacer ce chemin : créer un nouveau
 * PARCOURS (prix, test d'admission, couleur) reste une décision de produit, pas un contenu,
 * et donc un changement de code.
 *
 * La garantie ne change pas non plus : le serveur refuse une leçon dont la correction ne
 * rend pas 100 % avec sa propre clé, ou dont un exercice n'a pas d'explication. Cette page
 * ne fait qu'afficher ce refus — elle ne l'assouplit jamais.
 */

type Cours = {
  id: number; code: string; title: string; description: string; tools: string[]; level: string;
  total_lessons: number; order_index: number; is_published: boolean; programId: string | null;
};

type CelluleMd = { type: "md"; content: string };
type CelluleCallout = { type: "callout"; title: string; variant: "info" | "success" | "tip" | "warning"; content: string };
type CelluleExercise = {
  type: "exercise"; id: string; kind: "choice" | "number" | "text";
  title: string; prompt: string; opts?: string[]; answer: any; accept?: string; tolerance?: number;
  unit?: string; hint?: string; explain: string;
  // Exercice paramétré (kind "number" uniquement) : `answer` est alors ignoré, la réponse
  // se calcule côté serveur par `formule` à partir d'un tirage de ces paramètres.
  parametres?: { nom: string; min: number; max: number; decimales?: number }[];
  formule?: string;
};
type Cellule = CelluleMd | CelluleCallout | CelluleExercise;

type Lecon = { id: number; course_id: number; title: string; points: number; order_index: number; content: { cells: Cellule[] } };

const NIVEAUX = ["debutant", "intermediaire", "avance"];
const VARIANTES = [
  { v: "info", label: "Information" }, { v: "success", label: "Réussite" },
  { v: "tip", label: "Astuce" }, { v: "warning", label: "Avertissement" },
];

function programme(codeOuId: string | null) {
  return PROGRAMS.find(p => p.id === codeOuId);
}

// ══════════════ Page ══════════════

export default function AdminCourses() {
  const [coursOuvert, setCoursOuvert] = useState<number | null>(null);
  const [dialogueCours, setDialogueCours] = useState<Cours | "nouveau" | null>(null);

  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: cours, isLoading } = useQuery<Cours[]>({
    queryKey: ["admin-courses"],
    queryFn: async () => (await adminFetch("/api/admin/academy/courses")).json(),
  });

  const supprimerCours = useMutation({
    mutationFn: async (id: number) => {
      const r = await adminFetch(`/api/admin/academy/courses/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || "Suppression impossible.");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-courses"] }); toast({ title: "Cours supprimé" }); },
    onError: (e: any) => toast({ title: "Suppression refusée", description: e?.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const actif = coursOuvert ? (cours || []).find(c => c.id === coursOuvert) : null;
  if (actif) {
    return (
      <VueCours
        cours={actif}
        onRetour={() => setCoursOuvert(null)}
        onEditerCours={() => setDialogueCours(actif)}
        dialogueCours={dialogueCours}
        onFermerDialogue={() => setDialogueCours(null)}
      />
    );
  }

  const groupes = new Map<string, Cours[]>();
  for (const c of cours || []) {
    const cle = c.programId || "—";
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle)!.push(c);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><BookOpen className="w-6 h-6" /> Cours</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Un cours s'ajoute toujours à un parcours existant. Créer un nouveau parcours reste un changement de code.
          </p>
        </div>
        <Button onClick={() => setDialogueCours("nouveau")}><Plus className="w-4 h-4 mr-2" />Nouveau cours</Button>
      </div>

      {!cours?.length && (
        <div className="text-center py-16 text-muted-foreground">Aucun cours pour l'instant.</div>
      )}

      {Array.from(groupes.entries()).map(([progId, liste]) => {
        const p = programme(progId);
        return (
          <div key={progId} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: p?.accent }}>
              {p?.title || "Parcours inconnu"}
            </h2>
            <div className="grid gap-3">
              {liste.sort((a, b) => a.order_index - b.order_index).map(c => (
                <div key={c.id} className="border border-border rounded-lg p-4 flex items-center justify-between gap-4 hover:border-primary/40 transition-colors">
                  <button className="text-left flex-1 min-w-0" onClick={() => setCoursOuvert(c.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                      <span className="font-medium truncate">{c.title}</span>
                      {!c.is_published && <Badge variant="outline">Brouillon</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{c.total_lessons} leçon(s)</p>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setDialogueCours(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      if (confirm(`Supprimer « ${c.title} » ? Cette action est irréversible.`)) supprimerCours.mutate(c.id);
                    }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {dialogueCours && (
        <DialogueCours
          initial={dialogueCours === "nouveau" ? null : dialogueCours}
          onClose={() => setDialogueCours(null)}
        />
      )}
    </div>
  );
}

// ══════════════ Dialogue : créer / éditer un cours ══════════════

function DialogueCours({ initial, onClose }: { initial: Cours | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    code: initial?.code || "", title: initial?.title || "", description: initial?.description || "",
    tools: (initial?.tools || []).join(", "), level: initial?.level || "debutant",
    is_published: initial?.is_published ?? false,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim(), title: form.title.trim(), description: form.description.trim(),
        tools: form.tools.split(",").map(s => s.trim()).filter(Boolean), level: form.level,
        is_published: form.is_published,
      };
      const url = initial ? `/api/admin/academy/courses/${initial.id}` : "/api/admin/academy/courses";
      const r = await adminFetch(url, { method: initial ? "PUT" : "POST", body: JSON.stringify(payload) });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.message || "Enregistrement impossible.");
      return json;
    },
    onSuccess: (json: any) => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      if (json?.avertissementRythme) {
        toast({ title: "Cours enregistré — à surveiller", description: json.avertissementRythme });
      } else {
        toast({ title: initial ? "Cours modifié" : "Cours créé" });
      }
      onClose();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Modifier le cours" : "Nouveau cours"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Code</Label>
            <Input value={form.code} disabled={!!initial}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="COOP-03" />
            <p className="text-xs text-muted-foreground mt-1">
              Le préfixe (avant le tiret) décide du parcours — {PROGRAMS.map(p => p.prefix).join(", ")}
              {initial && " — ne se change plus après création."}
            </p>
          </div>
          <div>
            <Label>Titre</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Outils (séparés par des virgules)</Label>
              <Input value={form.tools} onChange={e => setForm({ ...form, tools: e.target.value })} placeholder="Excel, Python" />
            </div>
            <div>
              <Label>Niveau</Label>
              <Select value={form.level} onValueChange={v => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{NIVEAUX.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between border border-border rounded-md p-3">
            <div>
              <p className="text-sm font-medium">Publié</p>
              <p className="text-xs text-muted-foreground">Visible et accessible aux étudiants admis à ce parcours.</p>
            </div>
            <Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.code.trim() || !form.title.trim()}>
            {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════ Vue d'un cours : ses leçons ══════════════

function VueCours({ cours, onRetour, onEditerCours, dialogueCours, onFermerDialogue }: {
  cours: Cours; onRetour: () => void; onEditerCours: () => void;
  dialogueCours: Cours | "nouveau" | null; onFermerDialogue: () => void;
}) {
  const [leconOuverte, setLeconOuverte] = useState<Lecon | "nouvelle" | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: lecons, isLoading } = useQuery<Lecon[]>({
    queryKey: ["admin-course-lessons", cours.id],
    queryFn: async () => (await adminFetch(`/api/admin/academy/courses/${cours.id}/lessons`)).json(),
  });

  const supprimerLecon = useMutation({
    mutationFn: async (id: number) => {
      const r = await adminFetch(`/api/admin/academy/lessons/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || "Suppression impossible.");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-course-lessons", cours.id] });
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Leçon supprimée" });
    },
    onError: (e: any) => toast({ title: "Suppression refusée", description: e?.message, variant: "destructive" }),
  });

  const p = programme(cours.programId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={onRetour}><ArrowLeft className="w-4 h-4 mr-2" />Tous les cours</Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: p?.accent }}>{p?.title}</p>
          <h1 className="text-2xl font-semibold mt-1">{cours.title}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">{cours.code}</p>
          {!cours.is_published && <Badge variant="outline" className="mt-2">Brouillon — invisible des étudiants</Badge>}
        </div>
        <Button variant="outline" onClick={onEditerCours}><Pencil className="w-4 h-4 mr-2" />Modifier le cours</Button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Leçons ({lecons?.length ?? 0})</h2>
        <Button onClick={() => setLeconOuverte("nouvelle")}><Plus className="w-4 h-4 mr-2" />Nouvelle leçon</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !lecons?.length ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          Aucune leçon. Un cours sans leçon n'est pas publiable utilement.
        </div>
      ) : (
        <div className="grid gap-2">
          {lecons.sort((a, b) => a.order_index - b.order_index).map(l => {
            const nbExercices = (l.content?.cells || []).filter(c => c.type === "exercise").length;
            return (
              <div key={l.id} className="border border-border rounded-lg p-4 flex items-center justify-between gap-4">
                <button className="text-left flex-1 min-w-0" onClick={() => setLeconOuverte(l)}>
                  <span className="text-xs text-muted-foreground mr-2">#{l.order_index}</span>
                  <span className="font-medium">{l.title}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {l.content?.cells?.length ?? 0} cellule(s) · {nbExercices} exercice(s) noté(s) · {l.points} points
                  </p>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => setLeconOuverte(l)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => {
                    if (confirm(`Supprimer la leçon « ${l.title} » ?`)) supprimerLecon.mutate(l.id);
                  }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {leconOuverte && (
        <EditeurLecon
          coursId={cours.id}
          initial={leconOuverte === "nouvelle" ? null : leconOuverte}
          onClose={() => setLeconOuverte(null)}
        />
      )}

      {dialogueCours && <DialogueCours initial={dialogueCours === "nouveau" ? null : dialogueCours} onClose={onFermerDialogue} />}
    </div>
  );
}

// ══════════════ Éditeur de leçon ══════════════

function celluleVide(type: Cellule["type"]): Cellule {
  if (type === "md") return { type: "md", content: "" };
  if (type === "callout") return { type: "callout", title: "", variant: "info", content: "" };
  return { type: "exercise", id: "", kind: "text", title: "", prompt: "", answer: "", accept: "", explain: "" };
}

function EditeurLecon({ coursId, initial, onClose }: { coursId: number; initial: Lecon | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [titre, setTitre] = useState(initial?.title || "");
  const [points, setPoints] = useState(initial?.points ?? 100);
  // `accept` vit en base comme un tableau ; le champ de saisie manipule une chaîne. Sans
  // cette conversion à l'ouverture, une leçon déjà publiée avec des variantes acceptées
  // (COOP-01 en a) réapparaissait recollée sans espaces après les virgules.
  const [cellules, setCellules] = useState<Cellule[]>(
    (initial?.content?.cells || []).map(c =>
      c.type === "exercise" && Array.isArray((c as any).accept)
        ? { ...c, accept: (c as any).accept.join(", ") }
        : c
    )
  );
  const [erreurs, setErreurs] = useState<string[]>([]);

  const majCellule = (i: number, c: Cellule) => setCellules(cs => cs.map((x, j) => j === i ? c : x));
  const supprimerCellule = (i: number) => setCellules(cs => cs.filter((_, j) => j !== i));
  const deplacer = (i: number, delta: number) => setCellules(cs => {
    const j = i + delta;
    if (j < 0 || j >= cs.length) return cs;
    const copie = [...cs];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    return copie;
  });
  const ajouter = (type: Cellule["type"]) => setCellules(cs => [...cs, celluleVide(type)]);

  const save = useMutation({
    mutationFn: async () => {
      // `accept` est saisi comme une liste séparée par des virgules ; le serveur attend un
      // tableau. `answer` d'un exercice numérique doit être un nombre, pas le texte du champ.
      const cellulesEnvoyees = cellules.map(c => {
        if (c.type !== "exercise") return c;
        // Paramétré : pas de réponse statique à envoyer, le serveur la calcule à chaque
        // tirage. L'envoyer quand même enverrait `NaN` (le champ answer est vide côté UI).
        if (c.parametres?.length) { const { answer, accept, ...reste } = c; return reste; }
        const accept = (c.accept || "").split(",").map(s => s.trim()).filter(Boolean);
        const answer = c.kind === "number" ? Number(c.answer) : c.kind === "choice" ? Number(c.answer) : c.answer;
        return { ...c, answer, accept: accept.length ? accept : undefined };
      });
      const payload = { title: titre.trim(), points, cellules: cellulesEnvoyees };
      const url = initial
        ? `/api/admin/academy/lessons/${initial.id}`
        : `/api/admin/academy/courses/${coursId}/lessons`;
      const r = await adminFetch(url, { method: initial ? "PUT" : "POST", body: JSON.stringify(payload) });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) { setErreurs(json?.erreurs || [json?.message || "Enregistrement impossible."]); throw new Error(json?.message); }
      return json;
    },
    onSuccess: (json: any) => {
      setErreurs([]);
      qc.invalidateQueries({ queryKey: ["admin-course-lessons", coursId] });
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      if (json?.avertissementRythme) toast({ title: "Leçon enregistrée — à surveiller", description: json.avertissementRythme });
      else toast({ title: initial ? "Leçon modifiée" : "Leçon créée" });
      onClose();
    },
    onError: () => { /* les erreurs de validation sont déjà affichées dans le panneau */ },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Modifier la leçon" : "Nouvelle leçon"}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_120px] gap-4">
            <div>
              <Label>Titre de la leçon</Label>
              <Input value={titre} onChange={e => setTitre(e.target.value)} />
            </div>
            <div>
              <Label>Points</Label>
              <Input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} />
            </div>
          </div>

          {erreurs.length > 0 && (
            <div className="border border-destructive/40 bg-destructive/5 rounded-md p-3 space-y-1">
              <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> La leçon n'a pas pu être enregistrée
              </p>
              <ul className="text-sm text-destructive/90 list-disc list-inside">
                {erreurs.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {cellules.map((c, i) => (
              <div key={i} className="border border-border rounded-lg p-3 relative group">
                <div className="absolute -left-1 top-3 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="capitalize">
                    {c.type === "md" ? "Texte" : c.type === "callout" ? "Encadré" : "Exercice"}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deplacer(i, -1)} disabled={i === 0}><ChevronUp className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deplacer(i, 1)} disabled={i === cellules.length - 1}><ChevronDown className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => supprimerCellule(i)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                </div>
                <EditeurCellule cellule={c} onChange={nc => majCellule(i, nc)} />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => ajouter("md")}><Type className="w-4 h-4 mr-2" />Texte</Button>
            <Button variant="outline" size="sm" onClick={() => ajouter("callout")}><MessageSquareQuote className="w-4 h-4 mr-2" />Encadré</Button>
            <Button variant="outline" size="sm" onClick={() => ajouter("exercise")}><ListChecks className="w-4 h-4 mr-2" />Exercice</Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !titre.trim() || !cellules.length}>
            {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditeurCellule({ cellule, onChange }: { cellule: Cellule; onChange: (c: Cellule) => void }) {
  if (cellule.type === "md") {
    return (
      <Textarea rows={4} value={cellule.content} placeholder="## Titre\n\nTexte en markdown…"
        onChange={e => onChange({ ...cellule, content: e.target.value })} />
    );
  }

  if (cellule.type === "callout") {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_160px] gap-2">
          <Input placeholder="Titre de l'encadré" value={cellule.title}
            onChange={e => onChange({ ...cellule, title: e.target.value })} />
          <Select value={cellule.variant} onValueChange={v => onChange({ ...cellule, variant: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{VARIANTES.map(v => <SelectItem key={v.v} value={v.v}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Textarea rows={3} placeholder="Contenu…" value={cellule.content}
          onChange={e => onChange({ ...cellule, content: e.target.value })} />
      </div>
    );
  }

  // Exercice
  const opts = cellule.opts || [];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_140px_160px] gap-2">
        <Input placeholder="Identifiant unique (ex. s1e3)" value={cellule.id}
          onChange={e => onChange({ ...cellule, id: e.target.value.trim() })} />
        <Select value={cellule.kind} onValueChange={v => onChange({ ...cellule, kind: v as any, answer: "" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="choice">Choix multiple</SelectItem>
            <SelectItem value="number">Réponse numérique</SelectItem>
            <SelectItem value="text">Réponse texte</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Titre court" value={cellule.title} onChange={e => onChange({ ...cellule, title: e.target.value })} />
      </div>
      <Textarea rows={2} placeholder="Énoncé de la question" value={cellule.prompt}
        onChange={e => onChange({ ...cellule, prompt: e.target.value })} />

      {cellule.kind === "choice" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Options — cochez la bonne réponse</Label>
          {opts.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" checked={Number(cellule.answer) === i} onChange={() => onChange({ ...cellule, answer: i })} />
              <Input value={o} onChange={e => onChange({ ...cellule, opts: opts.map((x, j) => j === i ? e.target.value : x) })} />
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                onClick={() => onChange({ ...cellule, opts: opts.filter((_, j) => j !== i), answer: Number(cellule.answer) === i ? "" : cellule.answer })}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => onChange({ ...cellule, opts: [...opts, ""] })}>
            <Plus className="w-3.5 h-3.5 mr-1" />Option
          </Button>
        </div>
      )}

      {cellule.kind === "number" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 py-0.5">
            <Switch checked={!!cellule.parametres?.length} onCheckedChange={v => onChange({
              ...cellule,
              parametres: v ? [{ nom: "X", min: 0, max: 100 }] : undefined,
              formule: v ? (cellule.formule || "") : undefined,
              answer: v ? "" : cellule.answer,
            })} />
            <Label className="text-xs text-muted-foreground m-0">
              Paramétré — valeurs tirées au hasard à chaque tentative
            </Label>
          </div>

          {cellule.parametres?.length ? (
            <EditeurParametres cellule={cellule} onChange={onChange} />
          ) : (
            <Input type="number" placeholder="Réponse attendue" value={cellule.answer}
              onChange={e => onChange({ ...cellule, answer: e.target.value })} />
          )}

          <div className="grid grid-cols-2 gap-2">
            <Input type="number"
              placeholder={cellule.parametres?.length ? "Tolérance (obligatoire)" : "Tolérance (optionnel)"}
              value={cellule.tolerance ?? ""}
              onChange={e => onChange({ ...cellule, tolerance: e.target.value ? Number(e.target.value) : undefined })} />
            <Input placeholder="Unité (optionnel)" value={cellule.unit ?? ""}
              onChange={e => onChange({ ...cellule, unit: e.target.value })} />
          </div>
        </div>
      )}

      {cellule.kind === "text" && (
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Réponse attendue" value={cellule.answer}
            onChange={e => onChange({ ...cellule, answer: e.target.value })} />
          <Input placeholder="Variantes acceptées, séparées par des virgules" value={cellule.accept ?? ""}
            onChange={e => onChange({ ...cellule, accept: e.target.value })} />
        </div>
      )}

      <Input placeholder="Indice affiché avant la réponse (optionnel)" value={cellule.hint ?? ""}
        onChange={e => onChange({ ...cellule, hint: e.target.value })} />
      <Textarea rows={2} placeholder="Explication de la correction (obligatoire)" value={cellule.explain}
        onChange={e => onChange({ ...cellule, explain: e.target.value })} />
    </div>
  );
}

/**
 * Paramètres et formule d'un exercice paramétré.
 *
 * `{{nom}}` dans l'énoncé, l'indice ou l'explication sera remplacé par la valeur tirée —
 * chaque étudiant (et chaque nouvelle tentative) reçoit un tirage différent, la réponse
 * n'est donc jamais mémorisable, seule la méthode l'est.
 */
function EditeurParametres({ cellule, onChange }: { cellule: CelluleExercise; onChange: (c: Cellule) => void }) {
  const parametres = cellule.parametres || [];
  const majParametre = (i: number, patch: Partial<{ nom: string; min: number; max: number; decimales: number }>) =>
    onChange({ ...cellule, parametres: parametres.map((p, j) => j === i ? { ...p, ...patch } : p) });

  return (
    <div className="space-y-2 border border-dashed border-border rounded-md p-2.5">
      <Label className="text-xs text-muted-foreground">
        Paramètres — référencez-les dans l'énoncé par <code className="font-mono">{"{{nom}}"}</code>
      </Label>
      {parametres.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_90px_auto] gap-1.5 items-center">
          <Input placeholder="nom" value={p.nom} onChange={e => majParametre(i, { nom: e.target.value.trim() })} />
          <Input type="number" placeholder="min" value={p.min}
            onChange={e => majParametre(i, { min: Number(e.target.value) })} />
          <Input type="number" placeholder="max" value={p.max}
            onChange={e => majParametre(i, { max: Number(e.target.value) })} />
          <Input type="number" placeholder="décimales" value={p.decimales ?? 0}
            onChange={e => majParametre(i, { decimales: Number(e.target.value) })} />
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0"
            onClick={() => onChange({ ...cellule, parametres: parametres.filter((_, j) => j !== i) })}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline"
        onClick={() => onChange({ ...cellule, parametres: [...parametres, { nom: "", min: 0, max: 100 }] })}>
        <Plus className="w-3.5 h-3.5 mr-1" />Paramètre
      </Button>
      <Textarea rows={2} placeholder="Formule, par exemple : EAD * PD * LGD" value={cellule.formule || ""}
        onChange={e => onChange({ ...cellule, formule: e.target.value })} />
    </div>
  );
}
