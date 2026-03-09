import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Mail, MailOpen, Archive, CheckCheck, Search, Eye, EyeOff, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type Filter = "all" | "unread" | "read" | "archived";

export default function AdminMessages() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: msgs, isLoading } = useQuery({
    queryKey: ["admin-msgs", filter],
    queryFn: async () => {
      const params = filter !== "all" ? `?filter=${filter}` : "";
      const r = await adminFetch(`/api/admin/messages${params}`);
      return r.json();
    },
  });

  const markRead = useMutation({
    mutationFn: async ({ id, is_read }: { id: number; is_read: boolean }) => {
      await adminFetch(`/api/admin/messages/${id}/read`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_read }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-msgs"] }),
  });

  const archive = useMutation({
    mutationFn: async (id: number) => {
      await adminFetch(`/api/admin/messages/${id}/archive`, { method: "PUT" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-msgs"] }); toast({ title: "Archivé" }); },
  });

  const markReplied = useMutation({
    mutationFn: async (id: number) => {
      await adminFetch(`/api/admin/messages/${id}/reply`, { method: "PUT" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-msgs"] }),
  });

  const bulk = useMutation({
    mutationFn: async (action: string) => {
      await adminFetch("/api/admin/messages/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selected), action }) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-msgs"] }); setSelected(new Set()); toast({ title: "Action effectuée" }); },
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await adminFetch(`/api/admin/messages/${id}`, { method: "DELETE" }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-msgs"] }); toast({ title: "Supprimé" }); },
  });

  const filtered = (msgs || []).filter((m: any) =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()) || m.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((m: any) => m.id)));
  };

  const unreadCount = (msgs || []).filter((m: any) => !m.is_read).length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "unread", label: `Non lus${unreadCount ? ` (${unreadCount})` : ""}` },
    { key: "read", label: "Lus" },
    { key: "archived", label: "Archivés" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Messages</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} message(s)</span>
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
            <Button size="sm" variant="outline" onClick={() => bulk.mutate("read")}><Eye className="w-3 h-3 mr-1" /> Marquer lu</Button>
            <Button size="sm" variant="outline" onClick={() => bulk.mutate("unread")}><EyeOff className="w-3 h-3 mr-1" /> Non lu</Button>
            <Button size="sm" variant="outline" onClick={() => bulk.mutate("archive")}><Archive className="w-3 h-3 mr-1" /> Archiver</Button>
            <Button size="sm" variant="destructive" onClick={() => { if (confirm("Supprimer la sélection ?")) bulk.mutate("delete"); }}><Trash2 className="w-3 h-3 mr-1" /> Supprimer</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun message</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select all */}
          <div className="flex items-center gap-3 px-4 py-2">
            <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
            <span className="text-xs text-muted-foreground">Tout sélectionner</span>
          </div>

          {filtered.map((m: any) => (
            <div key={m.id} className={`bg-card rounded-2xl border transition-all ${!m.is_read ? "border-primary/30 shadow-sm" : "border-border/50"} ${expanded === m.id ? "shadow-md" : ""}`}>
              <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => { setExpanded(expanded === m.id ? null : m.id); if (!m.is_read) markRead.mutate({ id: m.id, is_read: true }); }}>
                <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} onClick={e => e.stopPropagation()} className="rounded" />
                {!m.is_read ? <div className="w-2 h-2 rounded-full bg-primary shrink-0" /> : <div className="w-2 h-2 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm truncate ${!m.is_read ? "font-bold" : "font-medium"}`}>{m.name}</span>
                    <span className="text-xs text-muted-foreground truncate">&lt;{m.email}&gt;</span>
                    {m.replied_at && <CheckCheck className="w-3 h-3 text-emerald-500 shrink-0" />}
                  </div>
                  <p className={`text-sm truncate ${!m.is_read ? "text-foreground font-medium" : "text-muted-foreground"}`}>{m.subject}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{m.created_at ? format(new Date(m.created_at), "d MMM", { locale: fr }) : ""}</span>
              </div>

              {expanded === m.id && (
                <div className="px-4 pb-4 border-t border-border/30 pt-4">
                  <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                    <span>De: {m.name} ({m.email})</span>
                    <span>·</span>
                    <span>{m.created_at ? format(new Date(m.created_at), "PPPp", { locale: fr }) : ""}</span>
                    {m.replied_at && <><span>·</span><span className="text-emerald-600">Répondu le {format(new Date(m.replied_at), "d MMM", { locale: fr })}</span></>}
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl mb-4">
                    <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => { markReplied.mutate(m.id); window.open(`mailto:${m.email}?subject=Re: ${m.subject}`, "_blank"); }}>
                      <Mail className="w-3 h-3 mr-1" /> Répondre
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => markRead.mutate({ id: m.id, is_read: !m.is_read })}>
                      {m.is_read ? <><EyeOff className="w-3 h-3 mr-1" /> Non lu</> : <><MailOpen className="w-3 h-3 mr-1" /> Lu</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => archive.mutate(m.id)}><Archive className="w-3 h-3 mr-1" /> Archiver</Button>
                    <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => { if (confirm("Supprimer ?")) del.mutate(m.id); }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
