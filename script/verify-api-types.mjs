/**
 * Contrôle de types de l'API — celui que `npm run check` ne fait PAS.
 *
 *   npm run verify:api
 *
 * tsconfig.json n'inclut que client/src, shared et server. `api/index.ts` — 5 200 lignes,
 * la totalité du serveur — n'a jamais été dans le périmètre. Un `tsc --noEmit` vert ne dit
 * donc rien de ce fichier, et il est facile de croire le contraire : c'est arrivé deux fois
 * de suite en corrigeant le rythme des leçons, sur le fichier même qu'on modifiait.
 *
 * Le fichier porte huit erreurs antérieures, toutes sans effet à l'exécution (secrets lus
 * depuis l'environnement, un import sans extension). Les corriger est un autre chantier ;
 * ce contrôle sert seulement à ce qu'il n'y en ait pas une NEUVIÈME sans qu'on le sache.
 *
 * Comparaison par signature — code d'erreur et message — et non par ligne : les lignes
 * bougent à chaque édition, et un contrôle qui crie à chaque édition finit ignoré.
 *
 * Quand une erreur connue est corrigée, retirer sa ligne de script/api-typecheck-connu.txt.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const BASE = "script/api-typecheck-connu.txt";

let sortie = "";
try {
  execFileSync("npx", ["tsc", "-p", "tsconfig.api.json"], { encoding: "utf-8" });
} catch (e) {
  sortie = String(e.stdout ?? "") + String(e.stderr ?? "");
}

const signature = (l) => l.replace(/\((\d+),(\d+)\)/, "(L,C)");
const actuelles = sortie.split("\n")
  .filter(l => /^(api|shared)\/.*error TS/.test(l))
  .map(signature).sort();

if (!existsSync(BASE)) {
  console.error(`verify:api — ${BASE} absent : impossible de distinguer le connu du nouveau.`);
  process.exit(1);
}
const connues = readFileSync(BASE, "utf-8").split("\n").filter(Boolean).map(signature).sort();

// Chaque signature est comptée : deux occurrences de la même erreur ne doivent pas passer
// pour une seule.
const reste = [...connues];
const nouvelles = [];
for (const a of actuelles) {
  const i = reste.indexOf(a);
  if (i >= 0) reste.splice(i, 1); else nouvelles.push(a);
}

console.log(`API : ${actuelles.length} erreur(s) de type, ${connues.length} connue(s).`);

if (reste.length) {
  console.log(`\n${reste.length} erreur(s) connue(s) ont disparu — pensez à les retirer de ${BASE} :`);
  for (const r of reste) console.log(`  ${r}`);
}

if (nouvelles.length) {
  console.error(`\n${nouvelles.length} erreur(s) NOUVELLE(S) dans api/ ou shared/ :`);
  for (const n of nouvelles) console.error(`  ${n}`);
  console.error(`\n  Rappel : \`npm run check\` ne couvre pas api/**. Seul ce contrôle le fait.`);
  process.exit(1);
}

console.log("\nTOUT PASSE — aucune erreur de type nouvelle dans l'API.");
