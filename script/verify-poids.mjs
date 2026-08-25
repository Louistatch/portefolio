/**
 * Budget de poids de la page d'entrée.
 *
 *   npm run verify:poids   (et automatiquement dans build:vercel)
 *
 * Ce que le visiteur télécharge AVANT de voir quoi que ce soit : l'entrée JavaScript, ses
 * morceaux préchargés et la feuille de style. Rien d'autre ne compte ici.
 *
 * ── Pourquoi ce contrôle existe ──
 *
 * Les quarante pages du site étaient importées statiquement dans App.tsx. Ouvrir la page
 * d'accueil téléchargeait donc aussi les quinze écrans d'administration, la salle de cours
 * et la salle de réunion — 1 947 Ko, 536 Ko compressés. Le découpage par route l'a ramené à
 * 689 Ko, 195 Ko compressés.
 *
 * Rien n'empêche que cela reparte à l'envers, et c'est le point : il suffit qu'une page soit
 * réimportée statiquement dans App.tsx, ou qu'un paquet lourd soit nommé dans `manualChunks`
 * — Vite précharge alors ce morceau depuis l'entrée. Dans les deux cas le build reste vert,
 * les tests passent, et seule la personne au bout d'une connexion lente s'en aperçoit.
 *
 * Le plafond est volontairement lâche : il ne sanctionne pas la croissance normale, il
 * attrape le doublement.
 */

import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";

const RACINE = "dist/public";
const PLAFOND_GZIP = 260 * 1024;   // mesuré à 195 Ko ; le double d'avant était 536 Ko

if (!existsSync(`${RACINE}/index.html`)) {
  console.error("verify:poids — dist/public/index.html absent. Lancez d'abord le build.");
  process.exit(1);
}

const html = readFileSync(`${RACINE}/index.html`, "utf8");
const refs = [...new Set([...html.matchAll(/\/assets\/([^"']+\.(?:js|css))/g)].map(m => m[1]))].sort();

if (!refs.length) {
  console.error("verify:poids — aucune ressource référencée par index.html : le motif a changé.");
  process.exit(1);
}

let brut = 0, gz = 0;
for (const f of refs) {
  const d = readFileSync(`${RACINE}/assets/${f}`);
  brut += d.length;
  gz += gzipSync(d, { level: 6 }).length;
  console.log(`  ${(d.length / 1024).toFixed(0).padStart(6)} Ko  ${f}`);
}

const ko = (n) => `${(n / 1024).toFixed(0)} Ko`;
console.log(`  ${"—".repeat(6)}`);
console.log(`  ${ko(brut).padStart(9)} brut · ${ko(gz)} compressé · ${refs.length} fichiers`);

if (gz > PLAFOND_GZIP) {
  console.error(
    `\nverify:poids — la page d'entrée pèse ${ko(gz)} compressés, au-dessus du plafond de `
    + `${ko(PLAFOND_GZIP)}.\n\n`
    + `  Deux causes, presque toujours :\n`
    + `    — une page réimportée statiquement dans client/src/App.tsx au lieu de lazy() ;\n`
    + `    — un paquet lourd nommé dans manualChunks (vite.config.ts), que Vite précharge\n`
    + `      alors depuis l'entrée même si aucune page d'accueil ne s'en sert.\n`
  );
  process.exit(1);
}

console.log(`\nTOUT PASSE — sous le plafond de ${ko(PLAFOND_GZIP)} compressés.`);
