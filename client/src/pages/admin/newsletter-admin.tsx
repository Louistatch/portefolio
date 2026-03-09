import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Send, Plus, Edit2, Loader2, Mail, Users, CheckCircle2, FileText, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: number; subject: string; content: string; status: string; recipients_count: number; sent_at: string | null; created_at: string;
}

export default function AdminNewsletter() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [sendDialog, setSendDialog] = useState<Campaign | null>(null);

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["admin-campaigns"],
    queryFn: async () => { const r = await adminFetch("/api/admin/campaigns"); return r.json(); },
  });

  const { data: subStats } = useQuery({
    queryKey: ["admin-subs", "active"],
    queryFn: async () => { const r = await adminFetch("/api/admin/subscribers?filter=active"); return r.json(); },
  });

  const create = useMutation({
    mutationFn: async () => {
      const r = await adminFetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, content }) });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-campaigns"] }); setCreating(false); setSubject(""); setContent(""); toast({ title: "Campagne créée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const r = await adminFetch(`/api/admin/campaigns/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, content }) });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-campaigns"] }); setEditing(null); setSubject(""); setContent(""); toast({ title: "Campagne mise à jour" }); },
  });

  const sendCampaign = useMutation({
    mutationFn: async (id: number) => {
      const r = await adminFetch(`/api/admin/campaigns/${id}/send`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["admin-campaigns"] }); toast({ title: "Campagne envoyée", description: data.message }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await adminFetch(`/api/admin/campaigns/${id}`, { method: "DELETE" }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-campaigns"] }); toast({ title: "Supprimée" }); },
  });

  const startEdit = (c: Campaign) => { setEditing(c); setSubject(c.subject); setContent(c.content); setCreating(false); };
  const startCreate = () => { setCreating(true); setEditing(null); setSubject(""); setContent(""); };
  const cancel = () => { setCreating(false); setEditing(null); setSubject(""); setContent(""); };

  const activeSubCount = subStats?.length || 0;
  const sentCount = (campaigns || []).filter(c => c.status === "sent").length;
  const draftCount = (campaigns || []).filter(c => c.status === "draft").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Newsletter</h1>
        {!creating && !editing && <Button onClick={startCreate}><Plus className="w-4 h-4 mr-2" /> Nouvelle Campagne</Button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-4 rounded-xl border border-border/50 text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{activeSubCount}</p>
          <p className="text-xs text-muted-foreground">Abonnés actifs</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 text-center">
          <FileText className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{draftCount}</p>
          <p className="text-xs text-muted-foreground">Brouillons</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 text-center">
          <Send className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{sentCount}</p>
          <p className="text-xs text-muted-foreground">Envoyées</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 text-center">
          <Mail className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{(campaigns || []).reduce((a, c) => a + (c.recipients_count || 0), 0)}</p>
          <p className="text-xs text-muted-foreground">Emails envoyés</p>
        </div>
      </div>

      {/* Editor */}
      {(creating || editing) && (
        <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4">{editing ? "Modifier la Campagne" : "Nouvelle Campagne"}</h2>
          <div className="space-y-4">
            <div>
              <Label>Sujet</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Sujet de la newsletter..." className="mt-1" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Contenu (Markdown)</Label>
                <button onClick={() => setPreview(!preview)} className="text-xs text-primary hover:underline">{preview ? "Éditer" : "Aperçu"}</button>
              </div>
              {preview ? (
                <div className="bg-muted/30 p-4 rounded-xl border border-border/50 min-h-[200px] prose prose-sm dark:prose-invert max-w-none">
                  {content.split("\n").map((line, i) => {
                    if (line.startsWith("# ")) return <h1 key={i}>{line.slice(2)}</h1>;
                    if (line.startsWith("## ")) return <h2 key={i}>{line.slice(3)}</h2>;
                    if (line.startsWith("**") && line.endsWith("**")) return <p key={i}><strong>{line.slice(2, -2)}</strong></p>;
                    return <p key={i}>{line || "\u00A0"}</p>;
                  })}
                </div>
              ) : (
                <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Contenu de la newsletter en Markdown..." className="mt-1 min-h-[200px] font-mono text-sm" />
              )}
            </div>
            <div className="flex gap-3">
              {editing ? (
                <Button onClick={() => update.mutate()} disabled={update.isPending || !subject || !content}>
                  {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit2 className="w-4 h-4 mr-2" />} Sauvegarder
                </Button>
              ) : (
                <Button onClick={() => create.mutate()} disabled={create.isPending || !subject || !content}>
                  {create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Créer
                </Button>
              )}
              <Button variant="outline" onClick={cancel}>Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns list */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (campaigns || []).length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Aucune campagne</p>
          {!creating && <Button onClick={startCreate}><Plus className="w-4 h-4 mr-2" /> Créer une campagne</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          {(campaigns || []).map(c => (
            <div key={c.id} className={`bg-card p-6 rounded-2xl border transition-all ${c.status === "draft" ? "border-amber-500/30" : "border-border/50"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "sent" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                      {c.status === "sent" ? "Envoyée" : "Brouillon"}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.created_at ? format(new Date(c.created_at), "d MMM yyyy", { locale: fr }) : ""}</span>
                    {c.sent_at && <span className="text-xs text-emerald-600">Envoyée le {format(new Date(c.sent_at), "d MMM yyyy HH:mm", { locale: fr })}</span>}
                  </div>
                  <h3 className="text-lg font-bold mb-1">{c.subject}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.content}</p>
                  {c.status === "sent" && c.recipients_count > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {c.recipients_count} destinataire(s)</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {c.status === "draft" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEdit(c)}><Edit2 className="w-3 h-3 mr-1" /> Modifier</Button>
                      <Button size="sm" onClick={() => setSendDialog(c)} disabled={sendCampaign.isPending}>
                        <Send className="w-3 h-3 mr-1" /> Envoyer
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Supprimer ?")) del.mutate(c.id); }}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Confirmation Dialog */}
      <Dialog open={!!sendDialog} onOpenChange={(open) => { if (!open) setSendDialog(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Confirmer l'envoi
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur le point d'envoyer cette campagne à tous les abonnés actifs.
            </DialogDescription>
          </DialogHeader>

          {sendDialog && (
            <div className="space-y-4 py-2">
              {/* Campaign preview */}
              <div className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3">
                  <p className="text-primary-foreground font-semibold text-sm">{sendDialog.subject}</p>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground line-clamp-4">{sendDialog.content}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/30">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {activeSubCount} abonné{activeSubCount > 1 ? "s" : ""} actif{activeSubCount > 1 ? "s" : ""} recevront cet email
                  </p>
                  <p className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">Cette action est irréversible.</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSendDialog(null)}>Annuler</Button>
            <Button
              onClick={() => { if (sendDialog) { sendCampaign.mutate(sendDialog.id); setSendDialog(null); } }}
              disabled={sendCampaign.isPending}
              className="gap-2"
            >
              {sendCampaign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer à {activeSubCount} abonné{activeSubCount > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
