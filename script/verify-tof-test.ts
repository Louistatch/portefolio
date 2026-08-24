/**
 * Contrôle la qualité du test d'admission de la formation de formateurs.
 *
 *   npx tsx script/verify-tof-test.ts
 *
 * Un QCM peut être parfaitement rédigé et rester inutile : si la bonne réponse occupe presque
 * toujours la même position, répondre « B » partout suffit à passer. C'est arrivé ici — une
 * première rédaction plaçait la bonne réponse en deuxième position pour treize questions sur
 * quinze, soit 13/15 à l'aveugle pour un seuil de 11. Ce script rend cette faute impossible à
 * livrer sans s'en apercevoir.
 *
 * La clé de correction est importée depuis api/tof-answers.ts, pas recopiée : un contrôle
 * qui vise sa propre copie ne contrôle rien.
 */
import { QUESTIONS_TOF } from "../shared/tof-test.js";
import { programById } from "../shared/programs.js";
import { TOF_ANSWER_KEY, TOF_CORRECT_TEXTS } from "../api/tof-answers.js";

const LETTRES = ["A", "B", "C", "D"];
const parcours = programById("tof");
const seuil = parcours.admission.seuil;
const n = QUESTIONS_TOF.length;

let ko = 0;
const v = (nom: string, ok: boolean, detail = "") => {
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${nom}${ok ? "" : "  " + detail}`);
};

// ── Cohérence de structure ────────────────────────────────────────────────────
v("nombre de questions conforme au parcours", n === parcours.admission.nbQuestions,
  `${n} questions pour ${parcours.admission.nbQuestions} déclarées`);
v("une réponse par question dans la clé", TOF_ANSWER_KEY.length === n,
  `clé de ${TOF_ANSWER_KEY.length} pour ${n} questions`);
v("quatre options partout", QUESTIONS_TOF.every(q => q.opts.length === 4));
v("aucune option vide ou dupliquée",
  QUESTIONS_TOF.every(q => q.opts.every(o => o.trim().length > 0) && new Set(q.opts).size === 4));
v("aucun énoncé dupliqué", new Set(QUESTIONS_TOF.map(q => q.q)).size === n);
v("chaque réponse pointe une option existante",
  TOF_ANSWER_KEY.every(i => Number.isInteger(i) && i >= 0 && i < 4));

// Contrôle croisé index / texte : c'est lui qui rattrape une réorganisation des options
// faite sans toucher à la clé — l'index seul se serait tu et le test aurait mal corrigé.
const desyncs = QUESTIONS_TOF
  .map((q, i) => ({ i, attendu: TOF_CORRECT_TEXTS[i], reel: q.opts[TOF_ANSWER_KEY[i]] }))
  .filter(x => x.attendu !== x.reel);
v("clé et énoncés synchronisés", desyncs.length === 0,
  desyncs.map(d => `Q${d.i + 1} : la clé pointe « ${d.reel} », attendu « ${d.attendu} »`).join(" | "));

// ── Le point qui compte : aucune stratégie aveugle ne doit passer ─────────────
const parPosition = [0, 1, 2, 3].map(pos => TOF_ANSWER_KEY.filter(k => k === pos).length);
parPosition.forEach((score, pos) => {
  v(`répondre « ${LETTRES[pos]} » partout échoue`, score < seuil,
    `donnerait ${score}/${n} pour un seuil de ${seuil}`);
});

// Une séquence périodique se repère aussi vite qu'une position dominante : si la clé se
// répète tous les k rangs, il suffit d'observer les k premières réponses.
for (let k = 1; k <= 5; k++) {
  const periodique = TOF_ANSWER_KEY.every((val, i) => val === TOF_ANSWER_KEY[i % k]);
  v(`clé non périodique de période ${k}`, !periodique,
    `la clé se répète tous les ${k} rangs`);
}

// Une longue série de réponses identiques est un autre motif exploitable.
let serie = 1, serieMax = 1;
for (let i = 1; i < TOF_ANSWER_KEY.length; i++) {
  serie = TOF_ANSWER_KEY[i] === TOF_ANSWER_KEY[i - 1] ? serie + 1 : 1;
  serieMax = Math.max(serieMax, serie);
}
v("aucune série de plus de 2 réponses identiques", serieMax <= 2, `série de ${serieMax}`);

// ── Couverture des thèmes du cours ───────────────────────────────────────────
const domaines = new Map<string, number>();
for (const q of QUESTIONS_TOF) domaines.set(q.domaine, (domaines.get(q.domaine) ?? 0) + 1);
const ATTENDUS = ["Andragogie", "Animation", "Budget familial", "Épargne",
  "Épargne communautaire", "Tontines", "Crédit agricole", "Planification de campagne"];
v("les huit thèmes du cours sont représentés",
  ATTENDUS.every(d => (domaines.get(d) ?? 0) > 0),
  `manquants : ${ATTENDUS.filter(d => !domaines.has(d)).join(", ")}`);

console.log("\nRépartition des bonnes réponses :");
parPosition.forEach((c, pos) => console.log(`  ${LETTRES[pos]} : ${c}`));
console.log("Thèmes :");
for (const [d, c] of domaines) console.log(`  ${d} : ${c}`);

console.log(ko === 0 ? "\nTOUT PASSE" : `\n${ko} ÉCHEC(S)`);
process.exit(ko ? 1 : 0);
