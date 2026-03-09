import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Download, Search, Users, UserX, UserCheck, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type Filter = "all" | "active" | "unsubscribed";

export default function AdminSubscribers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: subs, isLoading } = useQuery({
    queryKey: ["admin-subs", filter],
    queryFn: async () => {
      const params = filter !== "all" ? `?filter=${filter}` : "";
      const r = await adminFetch(`/api/admin/subscribers${params}`);
      return r.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await adminFetch(`/api/admin/subscribers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-subs"] }); toast({ title: "Mis à jour" }); },
  });

  const bulk = useMutation({
    mutationFn: async (action: string) => {
      await adminFetch("/api/admin/subscribers/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selected), action }) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-subs"] }); setSelected(new Set()); toast({ title: "Action effectuée" }); },
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await adminFetch(`/api/admin/subscribers/${id}`, { method: "DELETE" }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-subs"] }); toast({ title: "Supprimé" }); },
  });

  const exportCSV = async () => {
    const r = await adminFetch("/api/admin/subscribers/export");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "subscribers.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export CSV téléchargé" });
  };

  const filtered = (subs || []).filter((s: any) =>
    !search || s.email?.toLowerCase().includes(search.toLowerCase()) || s.name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: number) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const toggleAll = () => { selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map((s: any) => s.id))); };

  const activeCount = (subs || []).filter((s: any) => s.status === "active").length;
  const totalCount = (subs || []).length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: `Tous (${totalCount})` },
    { key: "active", label: `Actifs (${activeCount})` },
    { key: "unsubscribed", label: "Désabonnés" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Abonnés Newsletter</h1>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Exporter CSV</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card p-4 rounded-xl border border-border/50 text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{totalCount}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 text-center">
          <UserCheck className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Actifs</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 text-center">
          <UserX className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-orange-600">{totalCount - activeCount}</p>
          <p className="text-xs text-muted-foreground">Désabonnés</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => { setFilter(f.key); setSelected(new Set()); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="text-sm font-medium text-primary">{selected.size} sélectionné(s)</span>
          <div className="flex gap-1 ml-auto">
            <Button size="sm" variant="outline" onClick={() => bulk.mutate("activate")}><UserCheck className="w-3 h-3 mr-1" /> Activer</Button>
            <Button size="sm" variant="outline" onClick={() => bulk.mutate("unsubscribe")}><UserX className="w-3 h-3 mr-1" /> Désabonner</Button>
            <Button size="sm" variant="destructive" onClick={() => { if (confirm("Supprimer la sélection ?")) bulk.mutate("delete"); }}><Trash2 className="w-3 h-3 mr-1" /> Supprimer</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun abonné</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                <th className="p-3 w-10"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" /></th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Source</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Inscrit le</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: any) => (
                <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="p-3"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded" /></td>
                  <td className="p-3">
                    <span className="font-medium">{s.email}</span>
                    {s.name && <span className="text-xs text-muted-foreground ml-2">({s.name})</span>}
                  </td>
                  <td className="p-3"><span className="text-xs px-2 py-0.5 bg-muted rounded-full">{s.source}</span></td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"}`}>
                      {s.status === "active" ? "Actif" : "Désabonné"}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{s.created_at ? format(new Date(s.created_at), "d MMM yyyy", { locale: fr }) : ""}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-1 justify-end">
                      {s.status === "active" ? (
                        <Button variant="ghost" size="sm" className="text-orange-600 h-7 text-xs" onClick={() => updateStatus.mutate({ id: s.id, status: "unsubscribed" })}>Désabonner</Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-emerald-600 h-7 text-xs" onClick={() => updateStatus.mutate({ id: s.id, status: "active" })}>Réactiver</Button>
                      )}
                      <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => { if (confirm("Supprimer ?")) del.mutate(s.id); }}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
