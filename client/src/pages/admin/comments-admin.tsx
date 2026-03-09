import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, CheckCircle2, XCircle, Clock, Search, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type Filter = "all" | "pending" | "approved" | "rejected";

export default function AdminComments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: comments, isLoading } = useQuery({
    queryKey: ["admin-comments", filter],
    queryFn: async () => {
      const params = filter !== "all" ? `?filter=${filter}` : "";
      const r = await adminFetch(`/api/admin/comments${params}`);
      return r.json();
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await adminFetch(`/api/admin/comments/${id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-comments"] }); toast({ title: "Statut mis à jour" }); },
  });

  const bulk = useMutation({
    mutationFn: async (action: string) => {
      await adminFetch("/api/admin/comments/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selected), action }) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-comments"] }); setSelected(new Set()); toast({ title: "Action effectuée" }); },
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await adminFetch(`/api/admin/comments/${id}`, { method: "DELETE" }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-comments"] }); toast({ title: "Supprimé" }); },
  });

  const filtered = (comments || []).filter((c: any) =>
    !search || c.author_name?.toLowerCase().includes(search.toLowerCase()) || c.content?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: number) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const toggleAll = () => { selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map((c: any) => c.id))); };

  const pendingCount = (comments || []).filter((c: any) => c.status === "pending").length;

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusLabel = (status: string) => {
    if (status === "approved") return "Approuvé";
    if (status === "rejected") return "Rejeté";
    return "En attente";
  };

  const statusClass = (status: string) => {
    if (status === "approved") return "bg-emerald-500/10 text-emerald-600";
    if (status === "rejected") return "bg-red-500/10 text-red-600";
    return "bg-amber-500/10 text-amber-600";
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "pending", label: `En attente${pendingCount ? ` (${pendingCount})` : ""}` },
    { key: "approved", label: "Approuvés" },
    { key: "rejected", label: "Rejetés" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Modération Commentaires</h1>
        {pendingCount > 0 && (
          <span className="text-sm px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full font-medium">{pendingCount} en attente</span>
        )}
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
            <Button size="sm" variant="outline" onClick={() => bulk.mutate("approve")}><CheckCircle2 className="w-3 h-3 mr-1" /> Approuver</Button>
            <Button size="sm" variant="outline" onClick={() => bulk.mutate("reject")}><XCircle className="w-3 h-3 mr-1" /> Rejeter</Button>
            <Button size="sm" variant="destructive" onClick={() => { if (confirm("Supprimer la sélection ?")) bulk.mutate("delete"); }}><Trash2 className="w-3 h-3 mr-1" /> Supprimer</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun commentaire</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select all */}
          <div className="flex items-center gap-3 px-4 py-2">
            <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
            <span className="text-xs text-muted-foreground">Tout sélectionner</span>
          </div>

          {filtered.map((c: any) => (
            <div key={c.id} className={`bg-card rounded-2xl border p-5 transition-all ${c.status === "pending" ? "border-amber-500/30" : "border-border/50"}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-bold text-sm">{c.author_name}</span>
                    <span className="text-xs text-muted-foreground">sur</span>
                    <span className="text-xs text-primary font-medium truncate">{c.posts?.title || `Post #${c.post_id}`}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${statusClass(c.status)}`}>
                      {statusIcon(c.status)} {statusLabel(c.status)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">{c.created_at ? format(new Date(c.created_at), "d MMM yyyy HH:mm", { locale: fr }) : ""}</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{c.content}</p>
                  <div className="flex gap-2">
                    {c.status !== "approved" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setStatus.mutate({ id: c.id, status: "approved" })}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Approuver
                      </Button>
                    )}
                    {c.status !== "rejected" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => setStatus.mutate({ id: c.id, status: "rejected" })}>
                        <XCircle className="w-3 h-3 mr-1" /> Rejeter
                      </Button>
                    )}
                    {c.status !== "pending" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStatus.mutate({ id: c.id, status: "pending" })}>
                        <Clock className="w-3 h-3 mr-1" /> En attente
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive h-7 text-xs ml-auto" onClick={() => { if (confirm("Supprimer ?")) del.mutate(c.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
