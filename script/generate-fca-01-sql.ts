/**
 * Projette le contenu du cours FCA-01 en SQL, et le contrôle au passage.
 *
 *   npx tsx script/generate-fca-01-sql.ts > supabase/academy_cours_fca_01.sql
 *
 * Le contenu vit dans shared/fca-01.ts. Ce script n'en est que la projection : pour corriger
 * une leçon, on édite le TypeScript et l'on régénère.
 *
 * Le contrôle importe autant que la génération. Chaque leçon est corrigée avec sa propre clé
 * de réponses par le correcteur réel du site : si un exercice ne rend pas 100 %, c'est que sa
 * réponse attendue est inatteignable — une tolérance absente sur un exercice numérique, un
 * index de choix hors bornes. Sans ce contrôle, l'étudiant découvrirait la faute à sa place,
 * en perdant des points sur une réponse juste.
 */
import { FCA_01, LECONS_FCA_01 } from "../shared/fca-01.js";
import { gradeLessonExercises } from "../shared/exercises.js";

const q = (t: string) => "'" + t.replace(/'/g, "''") + "'";
const lignes: string[] = [];

lignes.push(`insert into sms_courses (code, title, description, tools, level, total_lessons, order_index, is_published)
values (${q(FCA_01.code)}, ${q(FCA_01.titre)}, ${q(FCA_01.description)},
  array[${FCA_01.outils.map(q).join(",")}]::text[], ${q(FCA_01.niveau)}, ${LECONS_FCA_01.length}, 20, true)
on conflict (code) do update set
  title = excluded.title, description = excluded.description, tools = excluded.tools,
  level = excluded.level, total_lessons = excluded.total_lessons, is_published = excluded.is_published;`);

for (const l of LECONS_FCA_01) {
  const contenu = JSON.stringify({ cells: l.cellules });
  lignes.push(`insert into sms_lessons (course_id, title, content, type, points, order_index)
select c.id, ${q(l.titre)}, ${q(contenu)}::jsonb, 'lesson', ${l.points}, ${l.ordre}
from sms_courses c where c.code = ${q(FCA_01.code)}
  and not exists (select 1 from sms_lessons x where x.course_id = c.id and x.order_index = ${l.ordre});`);
}

console.log(lignes.join("\n\n"));

// Contrôle : chaque exercice doit être corrigeable, et la bonne réponse doit passer.
let ko = 0;
for (const l of LECONS_FCA_01) {
  const ex = l.cellules.filter((c: any) => c.type === "exercise") as any[];
  const bonnes: any = {};
  for (const e of ex) bonnes[e.id] = e.answer;
  const note = gradeLessonExercises({ cells: l.cellules }, bonnes);
  const ok = note && note.scorePct === 100;
  if (!ok) { ko++; console.error(`  KO  leçon ${l.ordre} : ${note ? note.scorePct : "aucun exercice"} %`); }
  else console.error(`  ok  leçon ${l.ordre} — ${ex.length} exercices, corrigés à 100 % avec la clé`);
}
const vides = LECONS_FCA_01.flatMap(l => l.cellules.filter((c: any) => c.type === "exercise" && !c.explain));
if (vides.length) { console.error(`  KO  ${vides.length} exercices sans explication`); ko++; }
else console.error("  ok  chaque exercice porte son explication");
console.error(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUT PASSE");
if (ko) process.exit(1);
