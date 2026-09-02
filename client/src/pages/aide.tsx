import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  Search, ArrowLeft, Loader2, ThumbsUp, ThumbsDown,
  UserPlus, KeyRound, CalendarClock, Users, Video, Award,
} from "lucide-react";
import { SEO } from "@/components/seo";
import { getStudentToken } from "@/lib/student";

/**
 * Le centre d'aide, à /aide.
 *
 * Public : quelqu'un qui hésite encore à s'inscrire doit pouvoir lire comment se passe
 * l'admission sans créer de compte. Un étudiant connecté voit davantage d'articles — le
 * serveur décide seul de ce qu'il montre, à partir du jeton, et la page ne fait que
 * l'afficher : une liste filtrée côté navigateur ne filtre rien.
 *
 * Le poids compte plus qu'ailleurs. Les étudiants sont sur des données mobiles, et une page
 * d'aide lourde est une page d'aide qu'on n'ouvre pas quand on est déjà en difficulté. D'où :
 * aucune bibliothèque de rendu Markdown, pas de composant lourd, et le contenu affiché en
 * paragraphes de texte simple.
 */

type Article = { slug: string; titre: string; resume: string; famille: string; extrait?: string };
type ArticleComplet = Article & { contenu: string };

const FAMILLES: { id: string; titre: string; icone: typeof UserPlus }[] = [
  { id: "inscription", titre: "Inscription et validation", icone: UserPlus },
  { id: "admission",   titre: "Test d'admission",          icone: KeyRound },
  { id: "lecons",      titre: "Leçons et calendrier",      icone: CalendarClock },
  { id: "groupes",     titre: "Travaux de groupe",         icone: Users },
  { id: "seances",     titre: "Séances en direct",         icone: Video },
  { id: "certificats", titre: "Certificats",               icone: Award },
];

/** Le jeton s'il existe : le serveur élargit alors la liste des articles visibles. */
function entetes(): HeadersInit {
  const t = getStudentToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function CentreAide() {
  const [surArticle, params] = useRoute("/aide/:slug");
  return surArticle && params?.slug
    ? <PageArticle slug={params.slug} />
    : <PageIndex />;
}

// ── L'index ─────────────────────────────────────────────────────────────────

function PageIndex() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<Article[] | null>(null);
  const [cherche, setCherche] = useState(false);

  useEffect(() => {
    fetch("/api/support/articles", { headers: entetes() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setArticles(d.articles || []))
      .catch(() => { setArticles([]); setErreur(true); });
  }, []);

  async function chercher(e: React.FormEvent) {
    e.preventDefault();
    const terme = q.trim();
    if (!terme) { setResultats(null); return; }
    setCherche(true);
    try {
      const r = await fetch(`/api/support/articles?q=${encodeURIComponent(terme)}`, { headers: entetes() });
      const d = await r.json();
      setResultats(d.articles || []);
    } catch {
      setResultats([]);
    } finally {
      setCherche(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <SEO
        title="Centre d'aide — LouisFarm Learning"
        description="Inscription, test d'admission, rythme des leçons, travaux de groupe, séances en direct et certificats : les réponses aux questions les plus fréquentes."
      />

      <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl dark:text-slate-50">
        Centre d'aide
      </h1>
      <p className="mt-3 max-w-xl text-slate-600 dark:text-slate-300">
        Les réponses aux questions qui reviennent le plus souvent. Si la vôtre n'y est pas,
        écrivez-nous depuis la fenêtre d'aide de votre espace : l'état de votre dossier y sera
        joint automatiquement.
      </p>

      <form onSubmit={chercher} className="mt-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); if (!e.target.value.trim()) setResultats(null); }}
            placeholder="Chercher : leçon verrouillée, certificat, mot de passe…"
            aria-label="Chercher dans le centre d'aide"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          {cherche && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
        </div>
      </form>

      {resultats !== null ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            {resultats.length === 0
              ? "Aucun article ne correspond"
              : `${resultats.length} article${resultats.length > 1 ? "s" : ""}`}
          </h2>
          {resultats.length === 0 ? (
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Votre recherche est enregistrée : les questions restées sans réponse décident des
              prochains articles. En attendant, écrivez-nous depuis la fenêtre d'aide de votre
              espace, ou par courriel à{" "}
              <a href="mailto:contact@louisfarm.com" className="text-primary hover:underline">
                contact@louisfarm.com
              </a>.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {resultats.map((a) => <LigneArticle key={a.slug} article={a} />)}
            </ul>
          )}
        </section>
      ) : articles === null ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : erreur ? (
        <p className="mt-10 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
          Les articles n'ont pas pu être chargés. Réessayez dans un instant, ou écrivez à{" "}
          <a href="mailto:contact@louisfarm.com" className="underline">contact@louisfarm.com</a>.
        </p>
      ) : (
        <div className="mt-10 space-y-10">
          {FAMILLES.map((f) => {
            const dedans = articles.filter((a) => a.famille === f.id);
            if (!dedans.length) return null;
            const Icone = f.icone;
            return (
              <section key={f.id}>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  <Icone className="h-5 w-5 text-primary" />
                  {f.titre}
                </h2>
                <ul className="mt-4 space-y-3">
                  {dedans.map((a) => <LigneArticle key={a.slug} article={a} />)}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LigneArticle({ article }: { article: Article }) {
  return (
    <li>
      <Link
        href={`/aide/${article.slug}`}
        className="block rounded-xl border border-slate-200 p-4 transition hover:border-primary hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
      >
        <span className="block font-medium text-slate-900 dark:text-slate-100">{article.titre}</span>
        <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">{article.resume}</span>
      </Link>
    </li>
  );
}

// ── Un article ──────────────────────────────────────────────────────────────

function PageArticle({ slug }: { slug: string }) {
  const [article, setArticle] = useState<ArticleComplet | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [avis, setAvis] = useState<"utile" | "inutile" | null>(null);

  useEffect(() => {
    setArticle(null);
    setIntrouvable(false);
    setAvis(null);
    fetch(`/api/support/articles/${encodeURIComponent(slug)}`, { headers: entetes() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setArticle)
      .catch(() => setIntrouvable(true));
  }, [slug]);

  async function donnerAvis(utile: boolean) {
    setAvis(utile ? "utile" : "inutile");   // posé tout de suite : l'avis n'attend pas le réseau
    fetch(`/api/support/articles/${encodeURIComponent(slug)}/retour`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...entetes() },
      body: JSON.stringify({ utile }),
    }).catch(() => { /* un avis perdu ne vaut pas un message d'erreur */ });
  }

  if (introuvable) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-serif text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Cet article n'existe pas
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Il a peut-être été renommé, ou il est réservé aux étudiants inscrits.
        </p>
        <Link href="/aide" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Revenir au centre d'aide
        </Link>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-2xl px-4 py-12 md:py-16">
      <SEO title={`${article.titre} — Centre d'aide`} description={article.resume} />

      <Link href="/aide" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Centre d'aide
      </Link>

      <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        {article.titre}
      </h1>
      <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{article.resume}</p>

      <div className="mt-8 space-y-4 leading-relaxed text-slate-700 dark:text-slate-300">
        {article.contenu.split("\n").filter((l) => l.trim()).map((paragraphe, i) => (
          <p key={i}>{paragraphe}</p>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-slate-200 p-5 dark:border-slate-700">
        {avis ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {avis === "utile"
              ? "Merci — c'est noté."
              : "Merci. Les articles jugés insuffisants sont réécrits en priorité. Si vous êtes bloqué, écrivez-nous depuis la fenêtre d'aide de votre espace."}
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Cela a-t-il répondu à votre question ?
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => donnerAvis(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:border-primary hover:text-primary dark:border-slate-600"
              >
                <ThumbsUp className="h-4 w-4" /> Oui
              </button>
              <button
                type="button"
                onClick={() => donnerAvis(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:border-primary hover:text-primary dark:border-slate-600"
              >
                <ThumbsDown className="h-4 w-4" /> Non
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
