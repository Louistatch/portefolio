import { lazy, Suspense, useState } from "react";
import { useLocation } from "wouter";
import { LifeBuoy, X, Loader2 } from "lucide-react";
import { isStudentLoggedIn } from "@/lib/student";

/**
 * Le bouton d'aide, présent partout dans l'espace étudiant — sauf là où il gênerait.
 *
 * ── Ce que ce fichier ne fait PAS, et c'est le point ──
 *
 * Il ne parle jamais au serveur tant que personne ne clique. Le tableau de bord étudiant
 * lance déjà neuf appels d'API en parallèle à son ouverture ; sur les données mobiles d'un
 * étudiant à Lomé, un dixième pour afficher un bouton serait payé par tout le monde et utile
 * à presque personne. Le panneau lui-même — recherche, diagnostic, formulaire — n'est même
 * pas téléchargé avant le premier clic : il arrive par lazy(), séparé du reste.
 *
 * ── Où il ne s'affiche pas ──
 *
 * Pas dans la salle en direct. La leçon a déjà été apprise avec la fenêtre de l'infolettre,
 * qui recouvrait littéralement la vidéo au bout de quarante-cinq secondes de séance : une
 * surface plein écran n'accepte rien par-dessus. Pas non plus sur les écrans de connexion,
 * où il n'y a pas encore de dossier à diagnostiquer et où le centre d'aide public suffit.
 *
 * ── Pourquoi il est monté une seule fois, dans App ──
 *
 * La salle de cours n'utilise PAS la coque de l'espace étudiant : elle est rendue dans la
 * mise en page du site. Poser le bouton dans la coque l'aurait donc fait disparaître de la
 * page où l'on passe le plus de temps. Il est monté une fois pour toute l'application, et
 * décide lui-même où il s'affiche — un seul endroit à lire pour savoir où il est.
 */
const PanneauAide = lazy(() => import("./panneau-aide"));

/** Le widget ne sort que dans l'espace étudiant : ailleurs, /aide suffit. */
const PAGES_AVEC_AIDE = /^\/academy(\/|$)/;

const PAGES_SANS_AIDE = [
  /^\/academy\/live/,        // séance en direct : surface plein écran
  /^\/academy\/login/,
  /^\/academy\/register/,
  /^\/academy\/verify/,
  /^\/academy\/forgot-password/,
  /^\/academy\/reset-password/,
];

export function AideFlottante() {
  const [location] = useLocation();
  const [ouvert, setOuvert] = useState(false);

  if (!PAGES_AVEC_AIDE.test(location)) return null;
  if (PAGES_SANS_AIDE.some((r) => r.test(location))) return null;
  if (!isStudentLoggedIn()) return null;

  return (
    <>
      {ouvert && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/30 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none"
          onClick={() => setOuvert(false)}
          aria-hidden="true"
        />
      )}

      <div className="fixed bottom-4 right-4 z-[61] flex flex-col items-end gap-3 md:bottom-6 md:right-6">
        {ouvert && (
          <div
            role="dialog"
            aria-label="Aide"
            className="w-[min(24rem,calc(100vw-2rem))] max-h-[min(34rem,calc(100vh-7rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <Suspense
              fallback={
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              }
            >
              <PanneauAide page={location} onFermer={() => setOuvert(false)} />
            </Suspense>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-label={ouvert ? "Fermer l'aide" : "Ouvrir l'aide"}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {ouvert ? <X className="h-5 w-5" /> : <LifeBuoy className="h-5 w-5" />}
        </button>
      </div>
    </>
  );
}
