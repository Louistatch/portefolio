/**
 * Toute leçon publiée doit porter au moins un exercice noté.
 *
 *   npm run verify:lecons
 *
 * ── Pourquoi ce contrôle existe ──
 *
 * `complete-lesson` accorde la note maximale à une leçon qui ne contient aucun exercice :
 * `finalScore = graded ? … : maxScore`. Ce n'est pas une négligence — la progression d'un
 * cours se calcule sur les LIGNES DE NOTES, pas sur les leçons, donc une leçon sans note
 * bloquerait le cursus entier. Il faut bien inscrire quelque chose.
 *
 * La conséquence est qu'une leçon publiée sans exercice vaut 10/10 pour un clic, en
 * silence. Les douze leçons de TOF-FIN-01 étaient dans ce cas : douze notes maximales
 * jamais gagnées, sur le parcours qui forme les animateurs ruraux. Elles portaient
 * pourtant une question chacune — écrite en cellule `quiz`, que le correcteur ignore.
 *
 * Le contrôle porte donc sur le CONTENU, pas sur le code : c'est là que le défaut naît, et
 * c'est là qu'on peut l'attraper avant qu'un étudiant ne reçoive une note imméritée.
 *
 * Signale aussi les cellules `quiz` restantes : elles ne sont pas notées et leur réponse
 * part au navigateur, `stripExerciseAnswers` ne filtrant que les cellules `exercise`.
 * En auto-évaluation c'est un choix ; en évaluation, c'est une fuite.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !cle) {
  console.log("verify:lecons — ignoré (VITE_SUPABASE_URL / clé absentes de l'environnement).");
  process.exit(0);
}

const supabase = createClient(url, cle, { auth: { persistSession: false } });

const { data: cours, error: eC } = await supabase
  .from("sms_courses").select("id, code, title").eq("is_published", true).order("code");
if (eC) { console.error("Lecture des cours impossible :", eC.message); process.exit(1); }

const { data: lecons, error: eL } = await supabase
  .from("sms_lessons").select("id, course_id, order_index, title, content");
if (eL) { console.error("Lecture des leçons impossible :", eL.message); process.exit(1); }

const cellules = (l) => {
  let c = l.content;
  if (typeof c === "string") { try { c = JSON.parse(c); } catch { return []; } }
  return Array.isArray(c?.cells) ? c.cells : [];
};

const sansExercice = [];
const avecQuiz = [];

for (const co of cours || []) {
  const siennes = (lecons || []).filter(l => l.course_id === co.id)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  for (const l of siennes) {
    const cells = cellules(l);
    const notes = cells.filter(c => c?.type === "exercise").length;
    const quiz = cells.filter(c => c?.type === "quiz").length;
    if (notes === 0) sansExercice.push(`${co.code} · leçon ${l.order_index} — ${l.title}`);
    if (quiz > 0) avecQuiz.push(`${co.code} · leçon ${l.order_index} — ${quiz} cellule(s) quiz`);
  }
}

const total = (lecons || []).length;
const notees = total - sansExercice.length;
console.log(`\nverify:lecons — ${notees} leçon(s) évaluée(s) sur ${total} publiée(s).`);

if (avecQuiz.length) {
  console.log(`\n${avecQuiz.length} leçon(s) portent encore une cellule « quiz » — non notée, et sa réponse part au navigateur :`);
  for (const x of avecQuiz) console.log(`  ${x}`);
}

if (sansExercice.length) {
  console.error(
    `\n${sansExercice.length} leçon(s) publiée(s) SANS exercice noté — chacune vaut la note maximale pour un clic :\n`
  );
  for (const x of sansExercice) console.error(`  ${x}`);
  console.error(
    `\nUne leçon publiée doit pouvoir être ratée. Ajoutez-lui au moins un exercice noté\n` +
    `(cellule { "type": "exercise" }), ou dépubliez le cours le temps de l'écrire.\n`
  );
  process.exit(1);
}

console.log("\nTOUT PASSE — chaque leçon publiée porte au moins un exercice noté.\n");
