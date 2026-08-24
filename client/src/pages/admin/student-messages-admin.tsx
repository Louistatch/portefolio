import { useEffect, useState } from "react";
import {
  Loader2, Mail, Send, Trash2, Plus, CheckCircle2, AlertCircle, Clock, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin";
import { useToast } from "@/hooks/use-toast";

/**
 * Écrire à un étudiant, depuis l'administration.
 *
 * L'écriture et l'envoi sont deux gestes distincts, et c'est délibéré. Un message porte le nom
 * de Louis, annonce souvent une décision, et ne se rattrape pas une fois parti. On l'écrit, on
 * le laisse reposer, on le relit, puis on l'envoie — d'un bouton qui ne fait que cela.
 */

type Message = {
  id: number;
  student_id: number;
  subject: string;
  body: string;
  status: "draft" | "sent" | "failed";
  error: string | null;
  created_at: string;
  sent_at: string | null;
  students?: { id: number; full_name: string; email: string; email_verified?: boolean };
};

type Etudiant = { id: number; full_name: string; email: string };

export default function StudentMessagesAdmin() {
  const { toast } = useToast();
  const [chargement, setChargement] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [edition, setEdition] = useState<Partial<Message> | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [envoiDe, setEnvoiDe] = useState<number | null>(null);

  async function recharger() {
    const [m, e] = await Promise.all([
      adminFetch("/api/admin/academy/messages").then(r => r.json()).catch(() => []),
      adminFetch("/api/admin/academy/students").then(r => r.json()).catch(() => []),
    ]);
    setMessages(Array.isArray(m) ? m : []);
    setEtudiants(Array.isArray(e) ? e : []);
  }

  useEffect(() => { (async () => { await recharger(); setChargement(false); })(); }, []);

  async function enregistrer() {
    if (!edition?.student_id || !edition.subject?.trim() || !edition.body?.trim()) {
      toast({ title: "Destinataire, objet et message sont requis.", variant: "destructive" });
      return;
    }
    setEnCours(true);
    try {
      const res = await adminFetch("/api/admin/academy/messages", {
        method: "POST",
        body: JSON.stringify({
          id: edition.id, student_id: edition.student_id,
          subject: edition.subject, body: edition.body,
        }),
      });
      // Vérifier la réponse, et non supposer : un enregistrement refusé qui afficherait
      // « brouillon enregistré » ferait croire à un travail sauvegardé qui n'existe pas.
      const data = await res.json();
      if (!res.ok) { toast({ title: data?.message || "Enregistrement impossible", variant: "destructive" }); return; }
      toast({ title: "Brouillon enregistré" });
      setEdition(null);
      await recharger();
    } finally { setEnCours(false); }
  }

  async function envoyer(m: Message) {
    if (!confirm(`Envoyer ce message à ${m.students?.full_name} (${m.students?.email}) ?\n\nUn message envoyé ne peut pas être repris.`)) return;
    setEnvoiDe(m.id);
    try {
      const res = await adminFetch(`/api/admin/academy/messages/${m.id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Envoi impossible", description: data?.message, variant: "destructive" }); }
      else { toast({ title: `Message envoyé à ${m.students?.full_name}` }); }
      await recharger();
    } finally { setEnvoiDe(null); }
  }

  async function supprimer(m: Message) {
    if (!confirm("Supprimer ce brouillon ?")) return;
    const res = await adminFetch(`/api/admin/academy/messages/${m.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast({ title: data?.message || "Suppression impossible", variant: "destructive" }); return; }
    await recharger();
  }

  if (chargement) {
    return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const badge = (s: Message["status"]) =>
    s === "sent" ? { texte: "envoyé", classe: "bg-primary/10 text-primary", Icone: CheckCircle2 }
    : s === "failed" ? { texte: "échec", classe: "bg-destructive/10 text-destructive", Icone: AlertCircle }
    : { texte: "brouillon", classe: "bg-muted text-muted-foreground", Icone: Clock };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" /> Messages aux étudiants
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Un message individuel s'écrit, se relit, puis s'envoie. Il part de contact@louisfarm.com.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setEdition({ subject: "", body: "" })}>
          <Plus className="w-4 h-4" /> Nouveau message
        </Button>
      </div>

      {edition && (
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{edition.id ? "Modifier le brouillon" : "Nouveau message"}</h2>
            <button onClick={() => setEdition(null)} aria-label="Fermer"
              className="w-8 h-8 rounded-lg hover:bg-muted grid place-items-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Destinataire</label>
            <select value={edition.student_id ?? ""}
              onChange={e => setEdition({ ...edition, student_id: Number(e.target.value) })}
              className="w-full mt-1 h-10 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">Choisir un étudiant…</option>
              {etudiants.map(e => (
                <option key={e.id} value={e.id}>{e.full_name} — {e.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Objet</label>
            <input value={edition.subject ?? ""}
              onChange={e => setEdition({ ...edition, subject: e.target.value })}
              className="w-full mt-1 h-10 rounded-xl border border-border bg-background px-3 text-sm" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Message</label>
            <textarea value={edition.body ?? ""} rows={16}
              onChange={e => setEdition({ ...edition, body: e.target.value })}
              className="w-full mt-1 rounded-xl border border-border bg-background p-3 text-sm font-mono leading-relaxed" />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Une ligne vide sépare deux paragraphes. **gras** met en gras. Une ligne
              commençant par « - » devient une puce. Le bonjour et la signature sont ajoutés
              automatiquement.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={enregistrer} disabled={enCours} className="gap-2">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Enregistrer le brouillon
            </Button>
            <Button variant="outline" onClick={() => setEdition(null)}>Annuler</Button>
          </div>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Mail className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Aucun message</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            Écrivez à un étudiant pour expliquer une décision, un changement, un retard.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(m => {
            const b = badge(m.status);
            return (
              <div key={m.id} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${b.classe}`}>
                        <b.Icone className="w-3 h-3" /> {b.texte}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {m.students?.full_name} — {m.students?.email}
                      </span>
                    </div>
                    <p className="font-semibold mt-2 leading-snug">{m.subject}</p>
                    <p className="text-[13px] text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">
                      {m.body}
                    </p>
                    {m.status === "failed" && m.error && (
                      <p className="text-xs text-destructive mt-2">Échec : {m.error}</p>
                    )}
                    {m.sent_at && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Envoyé le {new Date(m.sent_at).toLocaleString("fr-FR")}
                      </p>
                    )}
                  </div>

                  {m.status !== "sent" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline"
                        onClick={() => setEdition({ ...m })}>Modifier</Button>
                      <Button size="sm" className="gap-1.5" disabled={envoiDe === m.id}
                        onClick={() => envoyer(m)}>
                        {envoiDe === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Envoyer
                      </Button>
                      <Button size="sm" variant="ghost" aria-label="Supprimer"
                        onClick={() => supprimer(m)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
