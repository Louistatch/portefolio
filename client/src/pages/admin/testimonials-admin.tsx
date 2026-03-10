import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Edit2, Loader2, Star, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Testimonial {
  id: number; name: string; title: string; organization: string; content: string;
  photo_url?: string; rating: number; is_visible: boolean; created_at: string;
}

export default function AdminTestimonials() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", title: "", organization: "", content: "", photo_url: "", rating: 5, is_visible: true });

  const { data: testimonials, isLoading } = useQuery<Testimonial[]>({
    queryKey: ["admin-testimonials"],
    queryFn: async () => { const r = await adminFetch("/api/admin/testimonials"); return r.json(); },
  });

  const save = useMutation({
    mutationFn: async () => {
      const url = editing ? `/api/admin/testimonials/${editing.id}` : "/api/admin/testimonials";
      const method = editing ? "PUT" : "POST";
      const r = await adminFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      cancel();
      toast({ title: editing ? "Mis à jour" : "Créé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await adminFetch(`/api/admin/testimonials/${id}`, { method: "DELETE" }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-testimonials"] }); toast({ title: "Supprimé" }); },
  });

  const toggle = useMutation({
    mutationFn: async (t: Testimonial) => {
      await adminFetch(`/api/admin/testimonials/${t.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...t, is_visible: !t.is_visible }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-testimonials"] }),
  });

  const startEdit = (t: Testimonial) => { setEditing(t); setForm({ name: t.name, title: t.title, organization: t.organization, content: t.content, photo_url: t.photo_url || "", rating: t.rating, is_visible: t.is_visible }); setCreating(false); };
  const startCreate = () => { setCreating(true); setEditing(null); setForm({ name: "", title: "", organization: "", content: "", photo_url: "", rating: 5, is_visible: true }); };
  const cancel = () => { setCreating(false); setEditing(null); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Témoignages</h1>
        {!creating && !editing && <Button onClick={startCreate}><Plus className="w-4 h-4 mr-2" /> Ajouter</Button>}
      </div>

      {(creating || editing) && (
        <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4">{editing ? "Modifier" : "Nouveau témoignage"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div><Label>Titre/Poste</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
            <div><Label>Organisation</Label><Input value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} className="mt-1" /></div>
            <div><Label>Photo URL</Label><Input value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} className="mt-1" placeholder="https://..." /></div>
            <div className="md:col-span-2"><Label>Témoignage</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="mt-1 min-h-[100px]" /></div>
            <div>
              <Label>Note ({form.rating}/5)</Label>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setForm({ ...form, rating: n })} className="p-1">
                    <Star className={`w-5 h-5 ${n <= form.rating ? "text-amber-400 fill-amber-400" : "text-border"}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name || !form.content}>
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} {editing ? "Sauvegarder" : "Créer"}
            </Button>
            <Button variant="outline" onClick={cancel}>Annuler</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {(testimonials || []).map(t => (
            <div key={t.id} className={`bg-card p-6 rounded-2xl border transition-all ${t.is_visible ? "border-border/50" : "border-border/50 opacity-60"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {t.photo_url ? (
                    <img src={t.photo_url} alt={t.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">{t.name.charAt(0)}</div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{t.name}</span>
                      <span className="text-xs text-muted-foreground">— {t.title}, {t.organization}</span>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {[1,2,3,4,5].map(n => <Star key={n} className={`w-3 h-3 ${n <= t.rating ? "text-amber-400 fill-amber-400" : "text-border"}`} />)}
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{t.content}"</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => toggle.mutate(t)} title={t.is_visible ? "Masquer" : "Afficher"}>
                    {t.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(t)}><Edit2 className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Supprimer ?")) del.mutate(t.id); }}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          ))}
          {(testimonials || []).length === 0 && (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
              <p className="text-muted-foreground mb-4">Aucun témoignage</p>
              {!creating && <Button onClick={startCreate}><Plus className="w-4 h-4 mr-2" /> Ajouter un témoignage</Button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
