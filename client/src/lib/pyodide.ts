/**
 * Exécution de Python dans le navigateur, à la demande.
 *
 * ── Pourquoi à la demande, et jamais autrement ──
 *
 * Pyodide pèse 11,5 Mo — 8,2 Mo de WebAssembly, 2,3 Mo de bibliothèque standard, 1 Mo de
 * colle JavaScript — avant le moindre paquet. Le site entier en pèse 1,9 Mo. Le charger au
 * démarrage multiplierait par six le poids d'une page pour servir les huit cellules de code
 * d'un seul cours sur quarante-cinq leçons.
 *
 * Rien ici ne part donc avant un clic explicite de l'étudiant. Ce fichier ne contient que
 * la logique de chargement — quelques kilo-octets, sans dépendance : le script Pyodide
 * n'est ajouté au document qu'au premier appel de `demarrerPython`, et les paquets ne
 * sont chargés que si le code les importe réellement.
 *
 * ── Ce que ceci ne fait PAS : noter ──
 *
 * Ce qui tourne dans le navigateur de l'étudiant est modifiable par l'étudiant. N'importe
 * qui peut ouvrir les outils de développement et se déclarer reçu. Les certificats de
 * LouisFarm sont censés tenir devant une ONG ou une banque : une note calculée ici ne
 * vaudrait rien.
 *
 * L'exécution est donc une BOUCLE DE RETOUR — « mon code tourne, voici ce qu'il affiche » —
 * et rien d'autre. La note reste calculée par api/, sur la valeur que l'étudiant saisit dans
 * l'exercice, comparée à une clé qui ne quitte jamais le serveur. Aucun point n'est attribué
 * ici, et aucune fonction de ce fichier ne doit jamais en attribuer.
 */

/** Version épinglée : une mise à jour silencieuse du CDN changerait les sorties affichées. */
const VERSION = "0.28.3";
const RACINE = `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`;

/** Poids annoncé à l'étudiant avant qu'il ne déclenche le téléchargement. */
export const POIDS_ANNONCE = "environ 11 Mo";

export interface Sortie {
  /** Ce que le code a affiché — stdout et stderr mêlés, dans l'ordre. */
  texte: string;
  /** Vrai si Python a levé une exception. La cellule compte quand même comme exécutée. */
  erreur: boolean;
}

type Pyodide = {
  loadPackage: (noms: string[]) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (o: { batched: (s: string) => void }) => void;
  setStderr: (o: { batched: (s: string) => void }) => void;
};

declare global {
  interface Window { loadPyodide?: (o: { indexURL: string }) => Promise<Pyodide>; }
}

/**
 * Une seule instance pour tout l'onglet, et une seule tentative de chargement en vol.
 *
 * Sans cette mémoïsation, deux clics rapides sur deux cellules téléchargeraient onze
 * mégaoctets deux fois — sur une connexion facturée à la donnée, ce n'est pas un détail.
 */
let instance: Promise<Pyodide> | null = null;

/** Paquets déjà chargés dans l'instance : `loadPackage` est rejouable mais pas gratuit. */
const paquetsCharges = new Set<string>();

function chargerScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const deja = document.querySelector<HTMLScriptElement>(`script[data-pyodide]`);
    if (deja) { resolve(); return; }
    const s = document.createElement("script");
    s.src = url;
    s.dataset.pyodide = VERSION;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Le téléchargement de Python a échoué."));
    document.head.appendChild(s);
  });
}

/**
 * Prépare l'interpréteur. Le premier appel télécharge ; les suivants sont immédiats.
 *
 * En cas d'échec, l'instance mémoïsée est effacée pour qu'un nouveau clic puisse réessayer :
 * garder une promesse rejetée condamnerait l'étudiant à recharger la page.
 */
export async function demarrerPython(): Promise<Pyodide> {
  if (instance) return instance;
  instance = (async () => {
    await chargerScript(`${RACINE}pyodide.js`);
    if (!window.loadPyodide) throw new Error("Python n'a pas pu être initialisé.");
    return window.loadPyodide({ indexURL: RACINE });
  })();
  try {
    return await instance;
  } catch (e) {
    instance = null;
    throw e;
  }
}

/**
 * Paquets à charger pour un extrait, déduits de ses imports.
 *
 * Déduire plutôt que déclarer est un choix : les leçons déjà en base ne portent aucune
 * métadonnée de paquets, et une migration de contenu pour une information que le code
 * contient déjà serait du travail sans gain. Une cellule peut toujours forcer la liste si
 * un jour un import indirect échappe à cette lecture.
 *
 * Seuls les paquets réellement présents dans la distribution Pyodide sont retenus : demander
 * un paquet inconnu fait échouer `loadPackage`, et donc toute la cellule.
 */
const CONNUS = new Set([
  "numpy", "pandas", "matplotlib", "scipy", "scikit-learn", "sympy",
  "statsmodels", "networkx", "pillow", "openpyxl", "regex", "pytz",
]);

const ALIAS: Record<string, string> = { sklearn: "scikit-learn", PIL: "pillow", np: "numpy", pd: "pandas" };

export function paquetsRequis(code: string, declares?: string[]): string[] {
  if (declares?.length) return declares.filter(p => CONNUS.has(p));
  const trouves = new Set<string>();
  const imports = Array.from(code.matchAll(/^\s*(?:import|from)\s+([A-Za-z_][A-Za-z0-9_]*)/gm));
  for (const m of imports) {
    const nom = ALIAS[m[1]] ?? m[1];
    if (CONNUS.has(nom)) trouves.add(nom);
  }
  return Array.from(trouves);
}

/**
 * Exécute un extrait et renvoie ce qu'il a affiché.
 *
 * Une exception Python n'est pas une panne : c'est un résultat pédagogique. Elle est rendue
 * dans `texte`, avec `erreur: true`, et l'appelant compte la cellule comme exécutée. Seul un
 * échec d'infrastructure — téléchargement impossible, paquet introuvable — remonte en
 * exception, pour que la salle de cours puisse basculer sur la sortie enregistrée.
 */
export async function executerPython(code: string, declares?: string[]): Promise<Sortie> {
  const py = await demarrerPython();

  const requis = paquetsRequis(code, declares).filter(p => !paquetsCharges.has(p));
  if (requis.length) {
    await py.loadPackage(requis);
    for (const p of requis) paquetsCharges.add(p);
  }

  const lignes: string[] = [];
  py.setStdout({ batched: s => lignes.push(s) });
  py.setStderr({ batched: s => lignes.push(s) });

  try {
    const valeur = await py.runPythonAsync(code);
    // Un extrait qui se termine par une expression — `df.describe()` — n'affiche rien de
    // lui-même hors d'un notebook. On rend cette valeur, comme le ferait Jupyter.
    if (valeur !== undefined && valeur !== null && lignes.length === 0) {
      lignes.push(String(valeur));
    }
    return { texte: lignes.join("\n"), erreur: false };
  } catch (e: any) {
    const message = String(e?.message ?? e);
    return { texte: [...lignes, message].join("\n").trim(), erreur: true };
  }
}
