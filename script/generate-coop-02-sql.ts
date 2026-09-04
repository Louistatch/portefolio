/**
 * Projette le contenu du cours COOP-02 en SQL, et le contrôle au passage.
 *
 *   npx tsx script/generate-coop-02-sql.ts > supabase/academy_cours_coop_02.sql
 *
 * Le contenu vit dans shared/coop-02.ts. Ce script n'en est que la projection : pour
 * corriger une leçon, on édite le TypeScript et l'on régénère.
 *
 * ── Pourquoi les contrôles ne sont pas ceux de COOP-01 ──
 *
 * Le générateur de COOP-01 exige que chaque correction cite un article de l'Acte uniforme.
 * La règle est juste pour un cours de droit, et elle serait fausse ici : COOP-02 enseigne une
 * méthode d'analyse de filière, dont les réponses se vérifient dans les fiches du cas et dans
 * les catégories du FIDA, pas dans un texte de loi. Recopier la règle aurait obligé à coudre
 * un numéro d'article dans des corrections qui n'en ont pas besoin — le contrôle serait passé
 * au vert, et les corrections auraient empiré.
 *
 * L'intention de la règle est en revanche conservée mot pour mot : une correction doit
 * renvoyer à une source que l'étudiant peut aller vérifier lui-même, jamais à l'autorité du
 * formateur. Ce script vérifie donc que chaque correction s'ancre sur un repère nommé —
 * article, fiche du cas, niveau du système, groupe de ménages, critère, trajectoire, maillon,
 * circuit, flux. Et, pour que ce contrôle ne devienne pas une formalité qu'un seul mot passe-
 * partout suffirait à satisfaire, il exige aussi que l'ensemble du cours mobilise au moins
 * cinq ancres distinctes.
 *
 * Deux contrôles s'y ajoutent, propres à la place de ce cours dans le parcours :
 *
 *   — la leçon 5 est le pont vers COOP-01 : chacune de ses corrections doit citer un article ;
 *   — chaque autre leçon doit citer un article au moins une fois. Sans cela, le parcours ne
 *     serait pas un parcours mais deux cours étrangers vendus ensemble, et l'étudiant
 *     apprendrait la méthode d'un côté, le droit de l'autre, sans jamais voir que le service
 *     manquant désigne le maillon, que le maillon commande le lien commun et que le lien
 *     commun s'écrit aux statuts.
 */
import { COOP_02, LECONS_COOP_02 } from "../shared/coop-02.js";
import { gradeLessonExercises } from "../shared/exercises.js";

const q = (t: string) => "'" + t.replace(/'/g, "''") + "'";
const lignes: string[] = [];

lignes.push(`-- ══════════════ Cours COOP-02 — organiser les acteurs ══════════════
--
-- Second des deux cours du parcours « Coopératives et organisation des acteurs ». COOP-01
-- apprend à monter une société coopérative conforme à l'Acte uniforme ; celui-ci apprend à
-- décider LAQUELLE monter, à quel maillon, et pour rendre quel service.
--
-- ── Ce fichier est un artefact, pas la source ──
--
-- Le contenu vit dans shared/coop-02.ts, typé et versionné. Ce SQL en est la projection,
-- produite par script/generate-coop-02-sql.ts. Pour corriger une leçon, on édite le
-- TypeScript et l'on régénère — jamais l'inverse, sous peine de voir les deux diverger.
--
-- Les insertions de leçons sont gardées par un \`not exists\` sur (course_id, order_index) :
-- rejouer ce fichier ne crée pas de doublons, mais ne met pas non plus à jour une leçon
-- existante. Pour republier une leçon modifiée, la supprimer d'abord.
--
-- ── Sur les sources ──
--
-- La méthode vient des « Directives opérationnelles sur le développement des filières
-- agricoles en faveur des pauvres » du FIDA, version française de septembre 2026 : les trois
-- niveaux du système, les quatre flux, les trois trajectoires pro-pauvres, les sept critères
-- de priorisation. Le territoire, les cinq groupes de ménages et les trois filières viennent
-- des fiches d'exercice du même document et sont annoncés fictifs par leurs auteurs ; ils
-- sont repris tels quels. Les articles cités renvoient à l'Acte uniforme relatif au droit des
-- sociétés coopératives, et chacun a été relu dans le texte publié.
--
-- ── Cinq leçons, et pas six ──
--
-- La fenêtre d'admission est de trois mois, soit treize semaines. COOP-01 en occupe huit à
-- une leçon par semaine ; ce cours occupe les cinq restantes. C'est vérifié par
-- npm run verify:rythme, qui échouerait si l'on en ajoutait une sixième.

insert into sms_courses (code, title, description, tools, level, total_lessons, order_index, is_published)
values (${q(COOP_02.code)}, ${q(COOP_02.titre)}, ${q(COOP_02.description)},
  array[${COOP_02.outils.map(q).join(",")}]::text[], ${q(COOP_02.niveau)}, ${LECONS_COOP_02.length}, 31, true)
on conflict (code) do update set
  title = excluded.title, description = excluded.description, tools = excluded.tools,
  level = excluded.level, total_lessons = excluded.total_lessons, is_published = excluded.is_published;`);

for (const l of LECONS_COOP_02) {
  const contenu = JSON.stringify({ cells: l.cellules });
  lignes.push(`insert into sms_lessons (course_id, title, content, type, points, order_index)
select c.id, ${q(l.titre)}, ${q(contenu)}::jsonb, 'lesson', ${l.points}, ${l.ordre}
from sms_courses c where c.code = ${q(COOP_02.code)}
  and not exists (select 1 from sms_lessons x where x.course_id = c.id and x.order_index = ${l.ordre});`);
}

console.log(lignes.join("\n\n"));

// ── Contrôles ──
let ko = 0;
const ARTICLE = /\bart(icle)?s?\.?\s*\d/i;

// Chaque leçon est corrigée par le correcteur réel du site, avec sa propre clé : si un
// exercice ne rend pas 100 %, sa réponse attendue est inatteignable et c'est l'étudiant qui
// le découvrirait, en perdant des points sur une réponse juste.
for (const l of LECONS_COOP_02) {
  const ex = l.cellules.filter((c: any) => c.type === "exercise") as any[];
  const bonnes: any = {};
  for (const e of ex) bonnes[e.id] = e.answer;
  const note = gradeLessonExercises({ cells: l.cellules }, bonnes);
  if (!note || note.scorePct !== 100) { ko++; console.error(`  KO  leçon ${l.ordre} : ${note ? note.scorePct : "aucun exercice"} %`); }
  else console.error(`  ok  leçon ${l.ordre} — ${ex.length} exercices, corrigés à 100 % avec la clé`);
}

const tous = LECONS_COOP_02.flatMap(l => l.cellules.filter((c: any) => c.type === "exercise")) as any[];

const sansExplication = tous.filter(e => !e.explain);
if (sansExplication.length) { console.error(`  KO  ${sansExplication.length} exercices sans explication`); ko++; }
else console.error("  ok  chaque exercice porte son explication");

// L'indice est ce qui distingue un exercice d'un piège : sans lui, l'étudiant bloqué n'a que
// la réponse à découvrir, et il la devine au lieu de la chercher.
const sansIndice = tous.filter(e => !e.hint);
if (sansIndice.length) { console.error(`  KO  ${sansIndice.length} exercices sans indice : ${sansIndice.map(e => e.id).join(", ")}`); ko++; }
else console.error("  ok  chaque exercice porte son indice");

// Une correction doit renvoyer à une source vérifiable par l'étudiant lui-même.
const ANCRES: { nom: string; motif: RegExp }[] = [
  { nom: "article", motif: ARTICLE },
  { nom: "fiche du cas", motif: /\bfiches?\b/i },
  { nom: "FIDA", motif: /\bFIDA\b/ },
  { nom: "niveau du système", motif: /\b(micro|méso|macro)\b/i },
  { nom: "groupe de ménages", motif: /\bgroupes? [A-E]\b/ },
  { nom: "critère", motif: /\bcritères?\b/i },
  { nom: "trajectoire", motif: /\btrajectoire/i },
  { nom: "maillon ou circuit", motif: /\b(maillon|circuit)/i },
  { nom: "flux", motif: /\bflux\b/i },
  { nom: "lien horizontal ou vertical", motif: /\b(horizontal|vertical)/i },
];
const mobilisees = new Set<string>();
const sansAncre: string[] = [];
for (const e of tous) {
  const trouvees = ANCRES.filter(a => a.motif.test(e.explain)).map(a => a.nom);
  if (!trouvees.length) sansAncre.push(e.id);
  trouvees.forEach(n => mobilisees.add(n));
}
if (sansAncre.length) {
  console.error(`  KO  ${sansAncre.length} corrections ne s'ancrent sur aucun repère vérifiable : ${sansAncre.join(", ")}`);
  ko++;
} else console.error(`  ok  chaque correction s'ancre sur un repère vérifiable`);

if (mobilisees.size < 5) {
  console.error(`  KO  ${mobilisees.size} ancres distinctes seulement — le contrôle ci-dessus ne prouve plus rien`);
  ko++;
} else console.error(`  ok  ${mobilisees.size} ancres distinctes mobilisées : ${[...mobilisees].join(", ")}`);

// La leçon 5 est le pont vers COOP-01 : elle se corrige article en main.
const pont = LECONS_COOP_02.find(l => l.ordre === 5);
const pontSansArticle = (pont?.cellules.filter((c: any) => c.type === "exercise") as any[] ?? [])
  .filter(e => !ARTICLE.test(e.explain));
if (!pont) { console.error("  KO  leçon 5 introuvable — le pont vers COOP-01 a disparu"); ko++; }
else if (pontSansArticle.length) {
  console.error(`  KO  leçon 5 : ${pontSansArticle.length} corrections sans article : ${pontSansArticle.map(e => e.id).join(", ")}`);
  ko++;
} else console.error("  ok  leçon 5 — chaque correction cite un article de l'Acte uniforme");

// Et chaque autre leçon garde au moins une attache juridique.
const detachees = LECONS_COOP_02
  .filter(l => l.ordre !== 5)
  .filter(l => !(l.cellules.filter((c: any) => c.type === "exercise") as any[]).some(e => ARTICLE.test(e.explain)))
  .map(l => l.ordre);
if (detachees.length) { console.error(`  KO  leçons sans aucune attache à l'Acte uniforme : ${detachees.join(", ")}`); ko++; }
else console.error("  ok  chaque leçon rattache la méthode au droit au moins une fois");

// Les identifiants servent de clé de correction en base : un doublon écraserait une réponse.
const ids = tous.map(e => e.id);
const doublons = ids.filter((id, i) => ids.indexOf(id) !== i);
if (doublons.length) { console.error(`  KO  identifiants dupliqués : ${[...new Set(doublons)].join(", ")}`); ko++; }
else console.error(`  ok  ${ids.length} identifiants d'exercice tous distincts`);

console.error(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUT PASSE");
if (ko) process.exit(1);
