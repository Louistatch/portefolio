/**
 * Garde-fous de l'exécution Python dans le navigateur.
 *
 *   npm run verify:python
 *
 * Deux invariants, dont la violation ne produirait aucune erreur visible — et c'est
 * précisément pour ça qu'ils sont contrôlés ici.
 *
 * 1. PYODIDE N'EST JAMAIS EMBARQUÉ. Il pèse 11,5 Mo, le site 1,9 Mo. Il arrive d'un CDN, au
 *    clic. Un import statique qui le ferait entrer dans le paquet multiplierait par six le
 *    poids de chaque page du site — y compris celles des parcours qui n'ont pas une ligne de
 *    code — sans qu'aucun test ne tombe.
 *
 * 2. LE NAVIGATEUR NE NOTE RIEN. Ce qui tourne chez l'étudiant est modifiable par
 *    l'étudiant : une note calculée là serait falsifiable en trois clics, et les certificats
 *    de LouisFarm sont censés tenir devant une ONG ou une banque. La note vient d'api/, sur
 *    la valeur saisie dans l'exercice. Le module d'exécution ne doit donc parler à personne.
 *
 * 3. UN ÉCHEC N'ENFERME PAS L'ÉTUDIANT. `allCodeRan` conditionne le bouton de validation de
 *    la leçon. Si un téléchargement raté laissait la cellule non exécutée, l'étudiant ne
 *    pourrait plus terminer son cours, sans aucun recours.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";

let ko = 0;
const v = (nom, ok, detail = "") => {
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${nom}${ok ? "" : "  → " + detail}`);
};

// ── 1. Le module d'exécution ne communique avec personne ─────────────────────
const module = readFileSync("client/src/lib/pyodide.ts", "utf8");

v("le module n'appelle aucune API du site",
  !/\bfetch\s*\(|studentFetch|adminFetch|XMLHttpRequest/.test(module),
  "une requête depuis le module d'exécution ouvrirait la porte à une note calculée côté client");

v("le module ne manipule ni score ni progression",
  !/\bscore\b|\bpoints\b|complete-lesson|submit/i.test(module),
  "la notation doit rester entièrement dans api/");

v("la version de Pyodide est épinglée",
  /const VERSION = "\d+\.\d+\.\d+"/.test(module),
  "sans épinglage, une mise à jour du CDN changerait les sorties affichées");

// ── 2. La salle de cours débloque la leçon même quand l'exécution échoue ─────
const salle = readFileSync("client/src/pages/academy/classroom.tsx", "utf8");
const fonction = salle.slice(salle.indexOf("async function executerCellule"));
const corps = fonction.slice(0, fonction.indexOf("\n  }\n") + 5);

v("executerCellule marque la cellule exécutée dans TOUS les cas",
  /finally\s*\{[^}]*setRanCells/.test(corps),
  "sans un `finally`, un échec de téléchargement bloquerait la validation de la leçon");

v("un échec d'exécution bascule sur la sortie enregistrée",
  /catch\s*\{[^}]*repli:\s*true/.test(corps),
  "l'étudiant doit voir le résultat de référence plutôt qu'une cellule vide");

// ── 3. Rien de Pyodide dans le paquet livré ──────────────────────────────────
//
// Ne peut s'exécuter qu'après un build ; sauté sinon plutôt que de faire échouer un
// contrôle lancé seul.
if (existsSync("dist/public/assets")) {
  const paquet = readdirSync("dist/public/assets")
    .filter(f => f.endsWith(".js"))
    .map(f => readFileSync(`dist/public/assets/${f}`, "utf8"))
    .join("\n");

  v("le chargeur est bien livré au navigateur",
    paquet.includes("cdn.jsdelivr.net/pyodide"),
    "l'adresse du CDN est absente : l'exécution ne démarrerait jamais");

  for (const trace of ["pyodide.asm", "_pyodide_core", "python_stdlib"]) {
    v(`aucune trace de « ${trace} » dans le paquet`, !paquet.includes(trace),
      "Pyodide s'est retrouvé embarqué : le site pèserait 11 Mo de plus");
  }
} else {
  console.log("  (paquet non vérifié : lancez d'abord npm run build:vercel)");
}

console.log(ko === 0 ? "\nTOUT PASSE" : `\n${ko} ÉCHEC(S)`);
process.exit(ko ? 1 : 0);
