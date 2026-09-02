import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Search, Send, ArrowLeft, CheckCircle2, AlertCircle,
  Loader2, BookOpen, ExternalLink,
} from "lucide-react";
import { studentFetch } from "@/lib/student";

/**
 * Le panneau d'aide : les quatre niveaux, dans l'ordre.
 *
 *   1. le diagnostic — affiché à l'ouverture, sans qu'on ait rien demandé
 *   2. la recherche  — quand la question ne correspond à aucun blocage en cours
 *   3. l'action      — le bouton qui règle le problème au lieu de l'expliquer
 *   4. le ticket     — quand rien n'a répondu
 *
 * Chargé paresseusement par aide-flottante.tsx : rien de ce fichier n'atteint le navigateur
 * avant qu'on ait cliqué sur le bouton.
 */

type Action =
  | { genre: "agir"; id: string; libelle: string }
  | { genre: "aller"; libelle: string; vers: string };

type Constat = {
  code: string;
  bloquant: boolean;
  titre: string;
  explication: string;
  action?: Action;
  article?: string;
};

type Article = { slug: string; titre: string; resume: string; famille: string; extrait?: string };

type Vue =
  | { nom: "accueil" }
  | { nom: "reponse"; constat: Constat | null; articles: Article[]; niveau: number }
  | { nom: "ticket" }
  | { nom: "envoye" };

export default function PanneauAide({ page, onFermer }: { page: string; onFermer: () => void }) {
  const [vue, setVue] = useState<Vue>({ nom: "accueil" });
  const [constats, setConstats] = useState<Constat[] | null>(null);
  const [erreurContexte, setErreurContexte] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [messageAction, setMessageAction] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);

  // Le diagnostic part à l'ouverture du panneau, et à ce moment-là seulement.
  useEffect(() => {
    let vivant = true;
    studentFetch("/api/support/contexte")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (vivant) setConstats(d.constats || []); })
      .catch(() => {
        // Un diagnostic indisponible ne doit pas fermer la porte : la recherche et le
        // formulaire, eux, fonctionnent toujours. On le dit, et on continue.
        if (vivant) { setConstats([]); setErreurContexte("Votre dossier n'a pas pu être lu."); }
      });
    champ.current?.focus();
    return () => { vivant = false; };
  }, []);

  const principal = constats?.find((c) => c.bloquant) ?? null;

  async function demander(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || enCours) return;
    setEnCours(true);
    try {
      const r = await studentFetch("/api/support/question", {
        method: "POST",
        body: JSON.stringify({ question: q, page }),
      });
      const d = await r.json();
      setVue({ nom: "reponse", constat: d.constat ?? null, articles: d.articles ?? [], niveau: d.niveau });
    } catch {
      setVue({ nom: "reponse", constat: null, articles: [], niveau: 4 });
    } finally {
      setEnCours(false);
    }
  }

  async function agir(id: string) {
    setEnCours(true);
    setMessageAction(null);
    try {
      const r = await studentFetch("/api/support/action", {
        method: "POST", body: JSON.stringify({ id }),
      });
      const d = await r.json();
      setMessageAction(d.message || "C'est fait.");
    } catch {
      setMessageAction("L'envoi a échoué. Réessayez dans un instant.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex max-h-[inherit] flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {vue.nom !== "accueil" && (
            <button
              type="button"
              onClick={() => setVue({ nom: "accueil" })}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Revenir"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {vue.nom === "ticket" ? "Écrire à l'équipe"
              : vue.nom === "envoye" ? "Demande enregistrée"
              : "Aide"}
          </h2>
        </div>
        <Link
          href="/aide"
          onClick={onFermer}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Centre d'aide <ExternalLink className="h-3 w-3" />
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {vue.nom === "accueil" && (
          <>
            {constats === null ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : principal ? (
              <BlocConstat constat={principal} onAgir={agir} enCours={enCours} message={messageAction} onFermer={onFermer} />
            ) : (
              <p className="mb-4 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  {erreurContexte
                    ? `${erreurContexte} Posez votre question ci-dessous, elle sera traitée normalement.`
                    : "Rien ne bloque votre parcours. Posez votre question ci-dessous."}
                </span>
              </p>
            )}

            <form onSubmit={demander} className="mt-4">
              <label htmlFor="question-aide" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Votre question
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="question-aide"
                    ref={champ}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Pourquoi ma leçon est verrouillée ?"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={enCours || !question.trim()}
                  className="flex items-center justify-center rounded-lg bg-primary px-3 text-white transition hover:brightness-110 disabled:opacity-40"
                  aria-label="Envoyer la question"
                >
                  {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </form>

            {constats && constats.length > 1 && (
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Aussi sur votre dossier
                </p>
                <ul className="space-y-2">
                  {constats.filter((c) => c !== principal).map((c) => (
                    <li key={c.code} className="text-sm text-slate-600 dark:text-slate-300">
                      {c.titre}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {vue.nom === "reponse" && (
          <>
            {vue.constat ? (
              <BlocConstat constat={vue.constat} onAgir={agir} enCours={enCours} message={messageAction} onFermer={onFermer} />
            ) : vue.articles.length ? (
              <>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {vue.articles.length === 1 ? "Un article répond" : `${vue.articles.length} articles répondent`}
                </p>
                <ul className="space-y-2">
                  {vue.articles.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/aide/${a.slug}`}
                        onClick={onFermer}
                        className="block rounded-lg border border-slate-200 p-3 transition hover:border-primary hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        <span className="flex items-start gap-2">
                          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>
                            <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{a.titre}</span>
                            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{a.resume}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Aucun article ne répond à cette question — et c'est noté : les recherches restées
                sans réponse sont ce qui décide des prochains articles. En attendant, écrivez-nous.
              </p>
            )}

            <button
              type="button"
              onClick={() => setVue({ nom: "ticket" })}
              className="mt-5 w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-600 dark:text-slate-200"
            >
              Cela ne répond pas — écrire à l'équipe
            </button>
          </>
        )}

        {vue.nom === "ticket" && (
          <FormulaireTicket
            page={page}
            sujetInitial={question}
            onEnvoye={() => setVue({ nom: "envoye" })}
          />
        )}

        {vue.nom === "envoye" && (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">
              Votre demande est enregistrée.
            </p>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              L'état de votre dossier y est joint : vous n'aurez pas à réexpliquer où vous en êtes.
              La réponse arrivera par courriel et restera dans votre espace.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Un constat, avec son bouton quand il y en a un. */
function BlocConstat({
  constat, onAgir, enCours, message, onFermer,
}: {
  constat: Constat;
  onAgir: (id: string) => void;
  enCours: boolean;
  message: string | null;
  onFermer: () => void;
}) {
  // Sorti de l'objet avant le rendu : `constat.action?.genre === "agir"` ne suffit pas à
  // convaincre TypeScript, dans le JSX qui suit, que `action` est encore de ce genre-là.
  const action = constat.action;
  return (
    <div className={`rounded-lg border p-3 ${constat.bloquant
      ? "border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/30"
      : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"}`}>
      <p className="flex items-start gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {constat.bloquant && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
        <span>{constat.titre}</span>
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {constat.explication}
      </p>

      {action?.genre === "agir" && (
        <button
          type="button"
          onClick={() => onAgir(action.id)}
          disabled={enCours || !!message}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {enCours && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {action.libelle}
        </button>
      )}

      {action?.genre === "aller" && (
        <Link
          href={action.vers}
          onClick={onFermer}
          className="mt-3 inline-block rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
        >
          {action.libelle}
        </Link>
      )}

      {message && (
        <p className="mt-2.5 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>
      )}

      {constat.article && (
        <Link
          href={`/aide/${constat.article}`}
          onClick={onFermer}
          className="mt-3 block text-xs text-primary hover:underline"
        >
          En savoir plus
        </Link>
      )}
    </div>
  );
}

function FormulaireTicket({
  page, sujetInitial, onEnvoye,
}: { page: string; sujetInitial: string; onEnvoye: () => void }) {
  const [sujet, setSujet] = useState(sujetInitial.slice(0, 200));
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!sujet.trim() || !message.trim() || enCours) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await studentFetch("/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({ sujet: sujet.trim(), message: message.trim(), page }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.message || "Envoi impossible");
      }
      onEnvoye();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={envoyer} className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        L'état de votre dossier sera joint automatiquement — inutile de le décrire.
      </p>
      <div>
        <label htmlFor="sujet-aide" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          Sujet
        </label>
        <input
          id="sujet-aide"
          value={sujet}
          onChange={(e) => setSujet(e.target.value)}
          maxLength={200}
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <div>
        <label htmlFor="message-aide" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          Votre message
        </label>
        <textarea
          id="message-aide"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={5000}
          required
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      {erreur && <p className="text-sm text-red-600 dark:text-red-400">{erreur}</p>}
      <button
        type="submit"
        disabled={enCours || !sujet.trim() || !message.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40"
      >
        {enCours && <Loader2 className="h-4 w-4 animate-spin" />}
        Envoyer
      </button>
    </form>
  );
}
