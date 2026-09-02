import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import {
  Inbox, BookOpen, BarChart3, Loader2, Send, CheckCircle2,
  MessageSquare, Search, AlertTriangle, Plus, Trash2,
} from "lucide-react";

/**
 * Le back-office du support.
 *
 * Trois onglets, et le troisième est celui qui compte à long terme : « Questions sans
 * réponse » est la liste de travail qui fait vivre la base de connaissances. Sans elle, le
 * centre d'aide répondrait indéfiniment aux questions qu'on a imaginées plutôt qu'à celles
 * qu'on nous pose.
 *
 * Le dossier de l'étudiant est joint à chaque demande, tel qu'il était AU MOMENT où la
 * question a été posée. Relu trois jours plus tard, le dossier aura bougé et la demande
 * deviendrait incompréhensible.
 */

type Ticket = {
  id: number; student_id: number | null; nom: string; email: string;
  sujet: string; statut: string; priorite: string; page: string;
  constat: string | null; created_at: string; updated_at: string; first_reply_at: string | null;
};
type Message = { id: number; auteur: string; corps: string; email_envoye: boolean; created_at: string };
type TicketComplet = Ticket & { contexte: any; messages: Message[] };
type Article = {
  id: number; slug: string; titre: string; resume: string; contenu: string;
  famille: string; audience: string; publie: boolean; ordre: number; utile: number; inutile: number;
};

const STATUTS: Record<string, { libelle: string; classe: string }> = {
  ouvert:     { libelle: "Ouverte",   classe: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  en_attente: { libelle: "Répondu",   classe: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" },
  resolu:     { libelle: "Résolue",   classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
};

const FAMILLES = ["inscription", "admission", "lecons", "groupes", "seances", "certificats"];

function quand(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
       + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await adminFetch(url, init);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `Erreur ${r.status}`);
  return r.json();
}

export default function SupportAdmin() {
  const [onglet, setOnglet] = useState<"demandes" | "articles" | "mesures">("demandes");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les demandes que le centre d'aide n'a pas su traiter seul, et de quoi lui apprendre à le faire.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        {([
          ["demandes", "Demandes", Inbox],
          ["articles", "Articles", BookOpen],
          ["mesures", "Mesures", BarChart3],
        ] as const).map(([id, label, Icone]) => (
          <button
            key={id}
            onClick={() => setOnglet(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              onglet === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icone className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {onglet === "demandes" && <Demandes />}
      {onglet === "articles" && <Articles />}
      {onglet === "mesures" && <Mesures />}
    </div>
  );
}

// ── Les demandes ────────────────────────────────────────────────────────────

function Demandes() {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState("");
  const [ouvert, setOuvert] = useState<number | null>(null);

  const liste = useQuery({
    queryKey: ["support-tickets", filtre],
    // Le paramètre est toujours présent, vide compris : le serveur ignore un statut vide, et
    // une adresse dont le chemin s'arrête à un littéral reste lisible par verify:routes.
    queryFn: () => json<Ticket[]>(`/api/admin/support/tickets?statut=${encodeURIComponent(filtre)}`),
  });

  const detail = useQuery({
    queryKey: ["support-ticket", ouvert],
    queryFn: () => json<TicketComplet>(`/api/admin/support/tickets/${ouvert}`),
    enabled: ouvert != null,
  });

  const repondre = useMutation({
    mutationFn: (v: { message: string; resoudre: boolean }) =>
      json(`/api/admin/support/tickets/${ouvert}/messages`, {
        method: "POST", body: JSON.stringify(v),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-ticket", ouvert] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      qc.invalidateQueries({ queryKey: ["admin-badges"] });
    },
  });

  const [reponse, setReponse] = useState("");

  if (liste.isLoading) return <Chargement />;
  if (liste.isError) return <Echec message="Les demandes n'ont pas pu être chargées." onReessayer={() => liste.refetch()} />;

  const tickets = liste.data || [];

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div>
        <div className="mb-3 flex gap-1">
          {[["", "Toutes"], ["ouvert", "Ouvertes"], ["en_attente", "Répondues"], ["resolu", "Résolues"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFiltre(v)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filtre === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {tickets.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucune demande. C'est bon signe : les quatre niveaux du centre d'aide répondent
            avant d'en arriver là.
          </p>
        ) : (
          <ul className="space-y-2">
            {tickets.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => { setOuvert(t.id); setReponse(""); }}
                  className={`w-full rounded-xl border p-3 text-left transition hover:border-primary ${
                    ouvert === t.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.sujet}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUTS[t.statut]?.classe || ""}`}>
                      {STATUTS[t.statut]?.libelle || t.statut}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {t.nom || t.email} · {quand(t.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {ouvert == null ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Choisissez une demande. L'état du dossier de l'étudiant y est joint — vous n'aurez
            pas à le chercher.
          </p>
        ) : detail.isLoading ? (
          <Chargement />
        ) : detail.isError || !detail.data ? (
          <Echec message="Cette demande n'a pas pu être chargée." onReessayer={() => detail.refetch()} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border p-4">
              <h2 className="font-semibold">{detail.data.sujet}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {detail.data.nom} · {detail.data.email}
                {detail.data.page && <> · depuis <code className="text-xs">{detail.data.page}</code></>}
              </p>
            </div>

            <Contexte contexte={detail.data.contexte} constat={detail.data.constat} />

            <ul className="space-y-3">
              {detail.data.messages.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-xl border p-3 ${m.auteur === "admin" ? "border-primary/40 bg-primary/5" : ""}`}
                >
                  <p className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {m.auteur === "admin" ? "Vous" : detail.data!.nom || "L'étudiant"} · {quand(m.created_at)}
                    {m.auteur === "admin" && (
                      <span className={m.email_envoye ? "text-emerald-600" : "text-amber-600"}>
                        {m.email_envoye ? "· courriel envoyé" : "· courriel non parti"}
                      </span>
                    )}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{m.corps}</p>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border p-4">
              <textarea
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                rows={5}
                placeholder="Votre réponse. Elle part par courriel et reste dans l'espace de l'étudiant."
                className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              {repondre.isError && (
                <p className="mt-2 text-sm text-red-600">
                  {repondre.error instanceof Error ? repondre.error.message : "Envoi impossible"}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => repondre.mutate({ message: reponse, resoudre: false })}
                  disabled={!reponse.trim() || repondre.isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
                >
                  {repondre.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Répondre
                </button>
                <button
                  onClick={() => repondre.mutate({ message: reponse, resoudre: true })}
                  disabled={!reponse.trim() || repondre.isPending}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition hover:border-primary disabled:opacity-40"
                >
                  <CheckCircle2 className="h-4 w-4" /> Répondre et clore
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** L'état du dossier au moment de la demande. */
function Contexte({ contexte, constat }: { contexte: any; constat: string | null }) {
  const constats: any[] = Array.isArray(contexte?.constats) ? contexte.constats : [];
  if (!constats.length && !constat) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-muted/40 p-4 dark:border-slate-700">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Ce que la plateforme voyait alors
      </p>
      <ul className="space-y-1.5 text-sm">
        {constats.map((c: any) => (
          <li key={c.code} className="flex items-start gap-2">
            {c.bloquant
              ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              : <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />}
            <span className={c.bloquant ? "font-medium" : "text-muted-foreground"}>{c.titre}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-xs text-muted-foreground">
        Parcours : {contexte?.parcours || "—"}
        {contexte?.adresseValidee === false && " · adresse non validée"}
        {contexte?.admis === false && " · pas encore admis"}
        {typeof contexte?.travauxRestants === "number" && ` · ${contexte.travauxRestants} travail(x) restant(s)`}
      </p>
    </div>
  );
}

// ── Les articles ────────────────────────────────────────────────────────────

const ARTICLE_VIDE: Partial<Article> = {
  slug: "", titre: "", resume: "", contenu: "",
  famille: "inscription", audience: "public", publie: true, ordre: 0,
};

function Articles() {
  const qc = useQueryClient();
  const [edite, setEdite] = useState<Partial<Article> | null>(null);

  const liste = useQuery({
    queryKey: ["support-articles"],
    queryFn: () => json<Article[]>("/api/admin/support/articles"),
  });

  const sauver = useMutation({
    mutationFn: (a: Partial<Article>) =>
      json("/api/admin/support/articles", { method: "POST", body: JSON.stringify(a) }),
    onSuccess: () => { setEdite(null); qc.invalidateQueries({ queryKey: ["support-articles"] }); },
  });

  const supprimer = useMutation({
    mutationFn: (slug: string) =>
      json(`/api/admin/support/articles/${slug}`, { method: "DELETE" }),
    onSuccess: () => { setEdite(null); qc.invalidateQueries({ queryKey: ["support-articles"] }); },
  });

  if (liste.isLoading) return <Chargement />;
  if (liste.isError) return <Echec message="Les articles n'ont pas pu être chargés." onReessayer={() => liste.refetch()} />;

  if (edite) {
    return (
      <div className="max-w-2xl space-y-4 rounded-xl border p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ label="Titre" value={edite.titre || ""} onChange={(v) => setEdite({ ...edite, titre: v })} />
          <Champ
            label="Identifiant dans l'adresse"
            value={edite.slug || ""}
            onChange={(v) => setEdite({ ...edite, slug: v })}
            aide="Accentué ou non, il est normalisé à l'enregistrement."
          />
        </div>
        <Champ
          label="Résumé"
          value={edite.resume || ""}
          onChange={(v) => setEdite({ ...edite, resume: v })}
          aide="Une phrase. C'est ce qui s'affiche dans les résultats de recherche."
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Contenu</label>
          <textarea
            value={edite.contenu || ""}
            onChange={(e) => setEdite({ ...edite, contenu: e.target.value })}
            rows={12}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Un paragraphe par ligne. Écrivez avec les mots de l'étudiant qui cherche, pas ceux
            du code : un article qui dit « les autres membres du groupe » ne sort pas sur
            « coéquipier ».
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Famille" value={edite.famille || ""} options={FAMILLES.map(f => [f, f])}
            onChange={(v) => setEdite({ ...edite, famille: v })} />
          <Select label="Visible par" value={edite.audience || "public"}
            options={[["public", "Tout le monde"], ["etudiant", "Étudiants inscrits"], ["admis", "Étudiants admis"]]}
            onChange={(v) => setEdite({ ...edite, audience: v })} />
          <Select label="État" value={edite.publie === false ? "non" : "oui"}
            options={[["oui", "Publié"], ["non", "Brouillon"]]}
            onChange={(v) => setEdite({ ...edite, publie: v === "oui" })} />
        </div>

        {sauver.isError && (
          <p className="text-sm text-red-600">
            {sauver.error instanceof Error ? sauver.error.message : "Enregistrement impossible"}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => sauver.mutate(edite)}
            disabled={sauver.isPending || !edite.titre?.trim() || !edite.slug?.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
          >
            {sauver.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </button>
          <button onClick={() => setEdite(null)} className="rounded-lg border px-4 py-2 text-sm">
            Annuler
          </button>
          {edite.id != null && (
            <button
              onClick={() => { if (confirm("Supprimer cet article ?")) supprimer.mutate(edite.slug!); }}
              className="ml-auto flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setEdite({ ...ARTICLE_VIDE })}
        className="mb-4 flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110"
      >
        <Plus className="h-4 w-4" /> Nouvel article
      </button>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Titre</th>
              <th className="px-3 py-2 font-semibold">Famille</th>
              <th className="px-3 py-2 font-semibold">Visible par</th>
              <th className="px-3 py-2 text-right font-semibold">A répondu</th>
            </tr>
          </thead>
          <tbody>
            {(liste.data || []).map((a) => (
              <tr key={a.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/40" onClick={() => setEdite(a)}>
                <td className="px-3 py-2">
                  <span className="font-medium">{a.titre}</span>
                  {!a.publie && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px]">brouillon</span>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{a.famille}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {a.audience === "public" ? "Tout le monde" : a.audience === "etudiant" ? "Inscrits" : "Admis"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {a.utile + a.inutile === 0
                    ? <span className="text-muted-foreground">—</span>
                    : <span className={a.inutile > a.utile ? "text-amber-600" : ""}>{a.utile} / {a.utile + a.inutile}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Les mesures ─────────────────────────────────────────────────────────────

function Mesures() {
  const m = useQuery({
    queryKey: ["support-mesures"],
    queryFn: () => json<any>("/api/admin/support/mesures?jours=30"),
  });

  if (m.isLoading) return <Chargement />;
  if (m.isError) return <Echec message="Les mesures n'ont pas pu être chargées." onReessayer={() => m.refetch()} />;
  const d = m.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Tuile valeur={String(d.questions)} label="questions posées" note="30 derniers jours" />
        <Tuile
          valeur={d.partAutonome == null ? "—" : `${d.partAutonome} %`}
          label="résolues sans intervention"
          note={d.partAutonome == null ? "aucune question encore" : "niveaux 1 à 3"}
        />
        <Tuile valeur={String(d.tickets.ouverts)} label="demandes ouvertes" note={`${d.tickets.total} au total`} />
        <Tuile
          valeur={d.tickets.delaiMedianHeures == null ? "—" : `${d.tickets.delaiMedianHeures} h`}
          label="délai de première réponse"
          note="médiane"
        />
      </div>

      <section>
        <h2 className="flex items-center gap-2 font-semibold">
          <Search className="h-4 w-4 text-primary" /> Questions restées sans réponse
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre liste de travail. Chaque ligne est un article à écrire — c'est ce que les
          étudiants ont cherché sans rien trouver.
        </p>
        {d.sansReponse.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucune recherche infructueuse sur la période.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border">
            {d.sansReponse.map((s: any) => (
              <li key={s.terme} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm">« {s.terme} »</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {s.nombre} fois · {quand(s.dernier)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {d.articles.length > 0 && (
        <section>
          <h2 className="font-semibold">Articles jugés insuffisants</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Classés par écart entre « non » et « oui » — les premiers sont à réécrire.
          </p>
          <ul className="mt-3 divide-y rounded-xl border">
            {d.articles.map((a: any) => (
              <li key={a.slug} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm">{a.titre}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {a.utile} oui · {a.inutile} non
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ── Petits éléments partagés ────────────────────────────────────────────────

function Chargement() {
  return (
    <div className="flex h-40 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function Echec({ message, onReessayer }: { message: string; onReessayer: () => void }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm dark:border-amber-700/60 dark:bg-amber-950/30">
      <p className="font-medium">{message}</p>
      <button onClick={onReessayer} className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-medium">
        Réessayer
      </button>
    </div>
  );
}

function Tuile({ valeur, label, note }: { valeur: string; label: string; note: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-2xl font-semibold tabular-nums">{valeur}</p>
      <p className="mt-0.5 text-sm">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function Champ({ label, value, onChange, aide }: {
  label: string; value: string; onChange: (v: string) => void; aide?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      {aide && <p className="mt-1 text-xs text-muted-foreground">{aide}</p>}
    </div>
  );
}

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: [string, string][]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
