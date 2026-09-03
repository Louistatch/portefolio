/**
 * Projette le contenu du cours SCOOP-01 en SQL, et le contrôle au passage.
 *
 *   npx tsx script/generate-scoop-01-sql.ts > supabase/academy_cours_scoop_01.sql
 *
 * Le contenu vit dans shared/scoop-01.ts. Ce script n'en est que la projection : pour
 * corriger une leçon, on édite le TypeScript et l'on régénère.
 *
 * Le contrôle importe autant que la génération. Chaque leçon est corrigée avec sa propre clé
 * de réponses par le correcteur réel du site : si un exercice ne rend pas 100 %, c'est que sa
 * réponse attendue est inatteignable — une tolérance absente sur un exercice numérique, un
 * index de choix hors bornes. Sans ce contrôle, l'étudiant découvrirait la faute à sa place,
 * en perdant des points sur une réponse juste.
 *
 * S'y ajoute un contrôle propre à un cours de droit : chaque exercice doit citer au moins un
 * article dans son explication. Une correction qui affirme sans renvoyer au texte apprend à
 * faire confiance au formateur, alors que tout ce cours apprend à aller vérifier soi-même.
 */
import { SCOOP_01, LECONS_SCOOP_01 } from "../shared/scoop-01.js";
import { gradeLessonExercises } from "../shared/exercises.js";

const q = (t: string) => "'" + t.replace(/'/g, "''") + "'";
const lignes: string[] = [];

lignes.push(`-- ══════════════ Cours SCOOP-01 — Droit coopératif OHADA ══════════════
--
-- Cinquième parcours de LouisFarm : monter, immatriculer et gouverner une société
-- coopérative conforme à l'Acte uniforme relatif au droit des sociétés coopératives,
-- adopté le 15 décembre 2010 à Lomé, publié au Journal Officiel de l'OHADA n° 23 du
-- 15 février 2011 et applicable depuis le 15 mai 2011.
--
-- ── Ce fichier est un artefact, pas la source ──
--
-- Le contenu vit dans shared/scoop-01.ts, typé et versionné. Ce SQL en est la projection,
-- produite par script/generate-scoop-01-sql.ts. Pour corriger une leçon, on édite le
-- TypeScript et l'on régénère — jamais l'inverse, sous peine de voir les deux diverger.
--
-- Les insertions de leçons sont gardées par un \`not exists\` sur (course_id, order_index) :
-- rejouer ce fichier ne crée pas de doublons, mais ne met pas non plus à jour une leçon
-- existante. Pour republier une leçon modifiée, la supprimer d'abord.
--
-- ── Sur les références ──
--
-- Chaque article cité a été relu dans le texte publié. Là où la doctrine s'écarte du texte,
-- c'est le texte qui fait foi et l'écart est signalé dans la leçon : l'article 6 énumère six
-- principes coopératifs et non les sept de l'Alliance coopérative internationale, et le sigle
-- de la coopérative avec conseil d'administration est « COOP-CA » (art. 268) et non
-- « SCOOPS-CA » comme l'écrivent beaucoup de modèles en circulation.
--
-- Les coopératives citées en exemple sont fictives ; leurs situations sont construites à
-- partir de configurations réellement rencontrées.

insert into sms_courses (code, title, description, tools, level, total_lessons, order_index, is_published)
values (${q(SCOOP_01.code)}, ${q(SCOOP_01.titre)}, ${q(SCOOP_01.description)},
  array[${SCOOP_01.outils.map(q).join(",")}]::text[], ${q(SCOOP_01.niveau)}, ${LECONS_SCOOP_01.length}, 30, true)
on conflict (code) do update set
  title = excluded.title, description = excluded.description, tools = excluded.tools,
  level = excluded.level, total_lessons = excluded.total_lessons, is_published = excluded.is_published;`);

for (const l of LECONS_SCOOP_01) {
  const contenu = JSON.stringify({ cells: l.cellules });
  lignes.push(`insert into sms_lessons (course_id, title, content, type, points, order_index)
select c.id, ${q(l.titre)}, ${q(contenu)}::jsonb, 'lesson', ${l.points}, ${l.ordre}
from sms_courses c where c.code = ${q(SCOOP_01.code)}
  and not exists (select 1 from sms_lessons x where x.course_id = c.id and x.order_index = ${l.ordre});`);
}

console.log(lignes.join("\n\n"));

// Contrôle : chaque exercice doit être corrigeable, et la bonne réponse doit passer.
let ko = 0;
for (const l of LECONS_SCOOP_01) {
  const ex = l.cellules.filter((c: any) => c.type === "exercise") as any[];
  const bonnes: any = {};
  for (const e of ex) bonnes[e.id] = e.answer;
  const note = gradeLessonExercises({ cells: l.cellules }, bonnes);
  const ok = note && note.scorePct === 100;
  if (!ok) { ko++; console.error(`  KO  leçon ${l.ordre} : ${note ? note.scorePct : "aucun exercice"} %`); }
  else console.error(`  ok  leçon ${l.ordre} — ${ex.length} exercices, corrigés à 100 % avec la clé`);
}

const tous = LECONS_SCOOP_01.flatMap(l => l.cellules.filter((c: any) => c.type === "exercise")) as any[];

const vides = tous.filter(e => !e.explain);
if (vides.length) { console.error(`  KO  ${vides.length} exercices sans explication`); ko++; }
else console.error("  ok  chaque exercice porte son explication");

// Propre à ce cours : une correction de droit doit renvoyer au texte.
const sansArticle = tous.filter(e => !/\bart(icle)?s?\.?\s*\d/i.test(e.explain));
if (sansArticle.length) {
  console.error(`  KO  ${sansArticle.length} corrections ne citent aucun article : ${sansArticle.map(e => e.id).join(", ")}`);
  ko++;
} else console.error("  ok  chaque correction cite au moins un article de l'Acte uniforme");

// Les identifiants servent de clé de correction en base : un doublon écraserait une réponse.
const ids = tous.map(e => e.id);
const doublons = ids.filter((id, i) => ids.indexOf(id) !== i);
if (doublons.length) { console.error(`  KO  identifiants dupliqués : ${[...new Set(doublons)].join(", ")}`); ko++; }
else console.error(`  ok  ${ids.length} identifiants d'exercice tous distincts`);

console.error(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUT PASSE");
if (ko) process.exit(1);
