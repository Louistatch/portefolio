/**
 * Projette le contenu du cours DATA-02 en SQL, et le contrôle au passage.
 *
 *   npx tsx script/generate-data-02-sql.ts > supabase/academy_cours_data_02.sql
 *
 * Le contenu vit dans shared/data-02.ts. Ce script n'en est que la projection : pour corriger
 * une leçon, on édite le TypeScript et l'on régénère.
 *
 * Même contrôle que pour DATA-01 : chaque exercice doit être corrigeable, et la bonne réponse
 * doit passer — y compris pour la leçon 4 (Capstone), dont le quiz ne quitte que la
 * compréhension du brief (piste, grille, seuil), jamais le projet réel, qui reste évalué à
 * part.
 */
import { DATA_02, LECONS_DATA_02 } from "../shared/data-02.js";
import { gradeLessonExercises } from "../shared/exercises.js";

const q = (t: string) => "'" + t.replace(/'/g, "''") + "'";
const lignes: string[] = [];

lignes.push(`-- ══════════════ Cours DATA-02 — modélisation prédictive et capstone ══════════════
--
-- Second des deux cours du parcours « Data Analytics » : régression, classification, séries
-- temporelles, puis un projet capstone à choisir parmi trois pistes professionnelles.
--
-- ── Ce fichier est un artefact, pas la source ──
--
-- Le contenu vit dans shared/data-02.ts, typé et versionné. Ce SQL en est la projection,
-- produite par script/generate-data-02-sql.ts. Pour corriger une leçon, on édite le
-- TypeScript et l'on régénère — jamais l'inverse, sous peine de voir les deux diverger.
--
-- Les insertions de leçons sont gardées par un \`not exists\` sur (course_id, order_index) :
-- rejouer ce fichier ne crée pas de doublons, mais ne met pas non plus à jour une leçon
-- existante. Les UPDATE ci-dessous republient le contenu sans changer les IDs ni la progression.

insert into sms_courses (code, title, description, tools, level, total_lessons, order_index, is_published)
values (${q(DATA_02.code)}, ${q(DATA_02.titre)}, ${q(DATA_02.description)},
  array[${DATA_02.outils.map(q).join(",")}]::text[], ${q(DATA_02.niveau)}, ${LECONS_DATA_02.length}, 41, true)
on conflict (code) do update set
  title = excluded.title, description = excluded.description, tools = excluded.tools,
  level = excluded.level, total_lessons = excluded.total_lessons, is_published = excluded.is_published;`);

for (const l of LECONS_DATA_02) {
  const contenu = JSON.stringify({ cells: l.cellules });
  lignes.push(`update sms_lessons l set title = ${q(l.titre)}, content = ${q(contenu)}::jsonb
from sms_courses c where l.course_id = c.id and c.code = ${q(DATA_02.code)} and l.order_index = ${l.ordre};`);
  lignes.push(`insert into sms_lessons (course_id, title, content, type, points, order_index)
select c.id, ${q(l.titre)}, ${q(contenu)}::jsonb, 'lesson', ${l.points}, ${l.ordre}
from sms_courses c where c.code = ${q(DATA_02.code)}
  and not exists (select 1 from sms_lessons x where x.course_id = c.id and x.order_index = ${l.ordre});`);
}

console.log(lignes.join("\n\n"));

// Contrôle : chaque exercice doit être corrigeable, et la bonne réponse doit passer.
let ko = 0;
for (const l of LECONS_DATA_02) {
  const ex = l.cellules.filter((c: any) => c.type === "exercise") as any[];
  const bonnes: any = {};
  for (const e of ex) bonnes[e.id] = e.answer;
  const note = gradeLessonExercises({ cells: l.cellules }, bonnes);
  const ok = note && note.scorePct === 100;
  if (!ok) { ko++; console.error(`  KO  leçon ${l.ordre} : ${note ? note.scorePct : "aucun exercice"} %`); }
  else console.error(`  ok  leçon ${l.ordre} — ${ex.length} exercices, corrigés à 100 % avec la clé`);
}

const tous = LECONS_DATA_02.flatMap(l => l.cellules.filter((c: any) => c.type === "exercise")) as any[];

const vides = tous.filter(e => !e.explain);
if (vides.length) { console.error(`  KO  ${vides.length} exercices sans explication`); ko++; }
else console.error("  ok  chaque exercice porte son explication");

// Les identifiants servent de clé de correction en base : un doublon écraserait une réponse.
const ids = tous.map(e => e.id);
const doublons = ids.filter((id, i) => ids.indexOf(id) !== i);
if (doublons.length) { console.error(`  KO  identifiants dupliqués : ${[...new Set(doublons)].join(", ")}`); ko++; }
else console.error(`  ok  ${ids.length} identifiants d'exercice tous distincts`);

console.error(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUT PASSE");
if (ko) process.exit(1);
