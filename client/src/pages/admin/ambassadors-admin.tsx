import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import {
  Loader2, Megaphone, Users, Wallet, Clock, CheckCircle2, AlertCircle, Send,
  Link2, Copy, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import { PROGRAMS } from "@shared/programs";
import { useToast } from "@/hooks/use-toast";

type Ambassadeur = {
  id: number; full_name: string; email: string; ambassador_code: string; ambassador_since: string;
  nbFilleuls: number; totalGagne: number; totalPaye: number; enAttente: number;
  /** L'inscription directe puis un lien par parcours, construits par le serveur. */
  liens: { programId: string | null; titre: string; url: string }[];
};

type Commission = {
  id: number; ambassadeur: string; filleul: string; amount: number; devise: string;
  status: "en_attente" | "payee"; created_at: string; paid_at: string | null;
};

/**
 * Suivi du programme ambassadeur, côté administration.
 *
 * Le versement n'est jamais automatisé — comme le reste de l'argent qui sort sur ce site
 * (attestations, group work), c'est Louis qui fait le virement Mobile Money puis vient
 * cocher « payée » ici. Cette page ne fait que calculer QUI est dû et COMBIEN, correctement,
 * ce que personne ne veut refaire à la main.
 */
export default function AmbassadorsAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filtre, setFiltre] = useState<"en_attente" | "toutes">("en_attente");
  // Les liens d'un seul ambassadeur à la fois : la liste resterait illisible tous dépliés.
  const [liensOuverts, setLiensOuverts] = useState<number | null>(null);
  const [copie, setCopie] = useState<string | null>(null);

  function copier(url: string, cle: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopie(cle);
      setTimeout(() => setCopie(c => (c === cle ? null : c)), 2000);
    }).catch(() => toast({ title: "Copie impossible — sélectionnez le lien à la main.", variant: "destructive" }));
  }

  const { data: ambassadeurs, isLoading } = useQuery<Ambassadeur[]>({
    queryKey: ["ambassadors"],
    queryFn: async () => (await adminFetch("/api/admin/academy/ambassadors")).json(),
  });
  const { data: commissions, isLoading: commissionsEnCours } = useQuery<Commission[]>({
    queryKey: ["ambassador-commissions", filtre],
    queryFn: async () => {
      const suffixe = filtre === "en_attente" ? "?status=en_attente" : "";
      return (await adminFetch("/api/admin/academy/ambassador-commissions" + suffixe)).json();
    },
  });

  /**
   * Diffusion du programme à la promotion vérifiée.
   *
   * Déclenchée à la main, jamais automatiquement : c'est une annonce. La clé de
   * déduplication côté serveur fait qu'une relance n'écrit qu'aux comptes créés depuis la
   * dernière — d'où le libellé du retour, qui distingue les deux nombres.
   */
  const diffuser = useMutation({
    mutationFn: async () => {
      const res = await adminFetch("/api/admin/academy/ambassador/notify", { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "Diffusion impossible");
      return res.json() as Promise<{ envoyes: number; ignores: number }>;
    },
    onSuccess: r => toast({
      title: r.envoyes === 0 ? "Personne de nouveau à informer" : `${r.envoyes} e-mail${r.envoyes > 1 ? "s" : ""} envoyé${r.envoyes > 1 ? "s" : ""}`,
      description: r.ignores > 0
        ? `${r.ignores} apprenant${r.ignores > 1 ? "s" : ""} avai${r.ignores > 1 ? "ent" : "t"} déjà reçu le message.`
        : undefined,
    }),
    onError: (e: any) => toast({ title: e.message || "Erreur", variant: "destructive" }),
  });

  const payer = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminFetch(`/api/admin/academy/ambassador-commissions/${id}/pay`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "Erreur");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Commission marquée payée" });
      qc.invalidateQueries({ queryKey: ["ambassador-commissions"] });
      qc.invalidateQueries({ queryKey: ["ambassadors"] });
    },
    onError: (e: any) => toast({ title: e.message || "Erreur", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const totalEnAttente = (ambassadeurs || []).reduce((a, s) => a + s.enAttente, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" /> Programme ambassadeur
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            20 % du prix de l'attestation par filleul, créditée automatiquement au paiement. Le versement, lui, reste manuel — cochez « payée » une fois le virement fait.
          </p>
        </div>
        <Button className="gap-2 shrink-0" disabled={diffuser.isPending}
          onClick={() => {
            if (confirm(
              "Envoyer l'e-mail de présentation du programme à tous les apprenants vérifiés ?\n\n"
              + "Chacun reçoit un message personnalisé : ce que le programme rapporte, et ce qu'il lui reste "
              + "à faire pour y entrer.\n\n"
              + "Les ambassadeurs en poste, les adresses non confirmées et les désabonnés sont exclus. "
              + "Personne ne le reçoit deux fois — vous pouvez relancer après une vague d'inscriptions.",
            )) diffuser.mutate();
          }}>
          {diffuser.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
            : <><Send className="w-4 h-4" /> Informer les apprenants</>}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <Users className="w-4 h-4 text-primary mb-1.5" />
          <p className="text-2xl font-bold">{ambassadeurs?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Ambassadeurs</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <Wallet className="w-4 h-4 text-amber-700 dark:text-amber-400 mb-1.5" />
          <p className="text-2xl font-bold">{totalEnAttente.toLocaleString("fr-FR")} F</p>
          <p className="text-xs text-muted-foreground">En attente de versement</p>
        </div>
      </div>

      {/* Ambassadeurs */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/40 text-xs text-muted-foreground">
          {ambassadeurs?.length || 0} ambassadeur{(ambassadeurs?.length || 0) > 1 ? "s" : ""}
        </div>
        <div className="divide-y divide-border/30">
          {(ambassadeurs || []).map(a => (
            <div key={a.id}>
              <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{a.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.email} · code {a.ambassador_code}</p>
                </div>
                <span className="text-xs bg-muted px-2 py-1 rounded-full shrink-0">{a.nbFilleuls} filleul{a.nbFilleuls > 1 ? "s" : ""}</span>
                <span className="text-xs font-semibold text-primary shrink-0">{a.totalGagne.toLocaleString("fr-FR")} F gagnés</span>
                {a.enAttente > 0 && (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0">{a.enAttente.toLocaleString("fr-FR")} F en attente</span>
                )}
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0"
                  aria-expanded={liensOuverts === a.id}
                  onClick={() => setLiensOuverts(o => (o === a.id ? null : a.id))}>
                  <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Liens
                  {liensOuverts === a.id
                    ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                    : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
                </Button>
              </div>

              {/* ── Les liens de cet ambassadeur ──
                  L'inscription directe, puis un lien par parcours : chacun ouvre la page
                  publique des formations sur la carte du parcours visé, et le code (?ref=)
                  est mémorisé côté client jusqu'à l'inscription. C'est ici que
                  l'administration vient chercher le bon lien à transmettre — par WhatsApp,
                  par email — sans le reconstruire à la main, donc sans faute de frappe
                  dans le code. */}
              {liensOuverts === a.id && (
                <ul className="mx-4 mb-3 rounded-xl border border-border/50 bg-muted/30 divide-y divide-border/40">
                  {a.liens.map(l => {
                    const parcours = l.programId ? PROGRAMS.find(pr => pr.id === l.programId) : null;
                    const cle = `${a.id}:${l.programId ?? "inscription"}`;
                    return (
                      <li key={cle} className="flex items-center gap-2.5 px-3 py-2">
                        <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: parcours?.accent || "#64748b" }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold leading-tight">{l.titre}</p>
                          <p className="text-[11px] font-mono text-muted-foreground truncate">{l.url}</p>
                        </div>
                        <button onClick={() => copier(l.url, cle)}
                          aria-label={`Copier le lien « ${l.titre} » de ${a.full_name}`}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 min-h-9 rounded-lg border border-border/70 bg-card text-xs font-semibold hover:bg-muted transition-colors">
                          {copie === cle
                            ? <><Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Copié</>
                            : <><Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copier</>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
          {!ambassadeurs?.length && <div className="px-4 py-10 text-center text-sm text-muted-foreground">Aucun ambassadeur pour l'instant.</div>}
        </div>
      </div>

      {/* Commissions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Commissions</h2>
          <div className="flex gap-1.5">
            {([["en_attente", "En attente"], ["toutes", "Toutes"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFiltre(k)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filtre === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          {commissionsEnCours ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <div className="divide-y divide-border/30">
              {(commissions || []).map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${c.status === "payee" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
                    {c.status === "payee" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {c.status === "payee" ? "payée" : "en attente"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate"><span className="font-medium">{c.ambassadeur}</span> — filleul : {c.filleul}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString("fr-FR")}{c.paid_at ? ` · payée le ${new Date(c.paid_at).toLocaleDateString("fr-FR")}` : ""}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{c.amount.toLocaleString("fr-FR")} {c.devise}</span>
                  {c.status !== "payee" && (
                    <Button size="sm" className="shrink-0" disabled={payer.isPending} onClick={() => payer.mutate(c.id)}>
                      Marquer payée
                    </Button>
                  )}
                </div>
              ))}
              {!commissions?.length && (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Aucune commission {filtre === "en_attente" ? "en attente" : "enregistrée"}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
