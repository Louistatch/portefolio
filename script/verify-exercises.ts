/**
 * Vérifie le moteur d'exercices ET tout le contenu pédagogique livré.
 *
 *   npm run verify:exercises
 *
 * À relancer après avoir écrit les exercices d'un nouveau cours. Le script refuse un corrigé
 * mal formé (option hors bornes, tolérance manquante, identifiants en double) et rejoue la
 * correction sur des copies parfaites, vides et approximatives.
 *
 * Deux sources, mêmes contrôles : les blocs JSON des fichiers
 * supabase/academy_exercises_*.sql, et les cours écrits en TypeScript, dont le SQL n'est
 * qu'une projection. **Ajouter un cours TypeScript à la liste `coursTs` fait partie de sa
 * livraison** : FCA-01 est resté hors contrôle parce que son fichier SQL s'appelle
 * academy_cours_fca_01.sql et ne correspondait à aucun motif surveillé — vingt-deux
 * exercices vérifiés une seule fois, à la génération, puis plus jamais.
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import {
  gradeLessonExercises, isExerciseCorrect, stripExerciseAnswers, EXERCISE_PASS_PCT,
} from "../shared/exercises";
import { LECONS_FCA_01 } from "../shared/fca-01";
import { LECONS_FCQ_01 } from "../shared/fcq-01";
import { LECONS_SCOOP_01 } from "../shared/scoop-01";

let pass = 0;
const failures: string[] = [];
function check(label: string, cond: boolean) {
  if (cond) pass++;
  else failures.push(label);
}

/**
 * Batterie appliquée à une leçon, quelle que soit sa provenance.
 *
 * Elle est écrite une fois et appelée deux fois : le contenu pédagogique arrive tantôt en
 * SQL, tantôt en TypeScript, et deux copies de ces contrôles auraient fini par diverger —
 * c'est exactement ainsi que les exercices du cours FCA-01 sont restés hors contrôle.
 */
function verifierLecon(where: string, cells: any[]) {
  const lesson = { cells };
  const exs = cells.filter(c => c.type === "exercise");
  check(`${where} : contient des exercices`, exs.length > 0);

  const ids = exs.map((e, i) => e.id || `ex${i + 1}`);
  check(`${where} : identifiants uniques`, new Set(ids).size === ids.length);

  for (const ex of exs) {
    const id = `${where} / ${ex.id}`;
    check(`${id} : énoncé présent`, !!ex.prompt);
    check(`${id} : correction pédagogique présente`, !!ex.explain);
    check(`${id} : type connu`, ["choice", "number", "text"].includes(ex.kind));
    if (ex.kind === "choice") {
      check(`${id} : options fournies`, Array.isArray(ex.opts) && ex.opts.length >= 2);
      check(`${id} : réponse dans les bornes`, Number.isInteger(ex.answer) && ex.answer >= 0 && ex.answer < (ex.opts?.length ?? 0));
    }
    if (ex.kind === "number") {
      check(`${id} : réponse numérique`, typeof ex.answer === "number" && Number.isFinite(ex.answer));
      check(`${id} : tolérance définie`, typeof ex.tolerance === "number");
    }
    if (ex.kind === "text") check(`${id} : réponse textuelle non vide`, typeof ex.answer === "string" && ex.answer.length > 0);
  }

  // Copie parfaite → 100 % ; copie vide → 0 % et refusée.
  const perfect = Object.fromEntries(exs.map((e, i) => [e.id || `ex${i + 1}`, e.answer]));
  const gp = gradeLessonExercises(lesson, perfect)!;
  check(`${where} : copie parfaite = 100 %`, gp.scorePct === 100 && gp.passed);
  const ge = gradeLessonExercises(lesson, {})!;
  check(`${where} : copie vide = 0 % et refusée`, ge.scorePct === 0 && !ge.passed);

  // Le corrigé ne doit jamais partir vers le navigateur.
  const sent = JSON.stringify(stripExerciseAnswers(lesson));
  check(`${where} : corrigé absent de la réponse HTTP`,
    !sent.includes('"answer"') && !sent.includes('"accept"')
    && !sent.includes('"tolerance"') && !sent.includes('"explain"'));
  const kept = stripExerciseAnswers(lesson).cells.filter((c: any) => c.type === "exercise");
  check(`${where} : énoncés et options conservés`,
    kept.every((c: any) => c.prompt && (c.kind !== "choice" || Array.isArray(c.opts))));
}

// ── Contenu livré en SQL : blocs JSON des migrations d'exercices ──
const sqlDir = join(process.cwd(), "supabase");
const files = readdirSync(sqlDir).filter(f => /^academy_exercises_.*\.sql$/.test(f));
if (!files.length) console.warn("Aucun fichier academy_exercises_*.sql trouvé.");

for (const file of files) {
  const sql = readFileSync(join(sqlDir, file), "utf-8");
  const blocks = [...sql.matchAll(/\(content->'cells'\) \|\| '(\[[\s\S]*?\])'::jsonb/g)];
  check(`${file} : au moins un bloc d'exercices`, blocks.length > 0);

  blocks.forEach((m, bi) => {
    const where = `${file} bloc ${bi + 1}`;
    let cells: any[];
    try {
      cells = JSON.parse(m[1].replace(/''/g, "'")); // dé-échappe les quotes SQL
    } catch (e: any) {
      failures.push(`${where} : JSON invalide (${e.message})`);
      return;
    }
    verifierLecon(where, cells);
  });
}

// ── Contenu écrit en TypeScript ──
//
// FCA-01 vit dans shared/fca-01.ts et n'est projeté en SQL que par un script. Son fichier
// s'appelle academy_cours_fca_01.sql, qui ne correspond pas au motif ci-dessus : ses vingt-
// deux exercices n'étaient donc contrôlés qu'au moment de la génération, jamais ensuite.
// C'est la source TypeScript qu'on vérifie, puisque c'est elle qu'on édite.
const coursTs: { nom: string; lecons: { titre: string; cellules: any[] }[] }[] = [
  { nom: "shared/fca-01.ts", lecons: LECONS_FCA_01 as any },
  { nom: "shared/fcq-01.ts", lecons: LECONS_FCQ_01 as any },
  { nom: "shared/scoop-01.ts", lecons: LECONS_SCOOP_01 as any },
];

for (const cours of coursTs) {
  check(`${cours.nom} : au moins une leçon`, cours.lecons.length > 0);
  cours.lecons.forEach((l, i) => {
    verifierLecon(`${cours.nom} leçon ${i + 1} « ${l.titre.slice(0, 40)} »`, l.cellules);
  });
}

// ── Moteur de correction ──
const num = { type: "exercise", id: "n", kind: "number", answer: 93.5, tolerance: 0.5 };
check("nombre : virgule décimale acceptée", isExerciseCorrect(num, "93,5"));
check("nombre : point décimal accepté", isExerciseCorrect(num, "93.5"));
check("nombre : espaces ignorés", isExerciseCorrect(num, " 93.5 "));
check("nombre : borne de tolérance incluse", isExerciseCorrect(num, "94"));
check("nombre : hors tolérance refusé", !isExerciseCorrect(num, "95"));
check("nombre : texte refusé", !isExerciseCorrect(num, "beaucoup"));

const txt = { type: "exercise", id: "t", kind: "text", answer: "geopoint", accept: ["geo point"] };
check("texte : exact", isExerciseCorrect(txt, "geopoint"));
check("texte : casse ignorée", isExerciseCorrect(txt, "GeoPoint"));
check("texte : mot noyé dans une phrase", isExerciseCorrect(txt, "le type geopoint"));
check("texte : variante acceptée", isExerciseCorrect(txt, "geo point"));
check("texte : accents ignorés", isExerciseCorrect({ ...txt, answer: "périmètre", accept: [] }, "PERIMETRE"));
check("texte : ponctuation ignorée", isExerciseCorrect({ ...txt, answer: "groupby", accept: [] }, "df.groupby()"));
check("texte : faux refusé", !isExerciseCorrect(txt, "gps"));
check("texte : vide refusé", !isExerciseCorrect(txt, ""));

const ch = { type: "exercise", id: "c", kind: "choice", answer: 1, opts: ["a", "b", "c"] };
check("choix : bon indice", isExerciseCorrect(ch, 1));
check("choix : indice en chaîne", isExerciseCorrect(ch, "1"));
check("choix : mauvais indice", !isExerciseCorrect(ch, 0));
check("choix : indice 0 valide quand c'est la réponse", isExerciseCorrect({ ...ch, answer: 0 }, 0));

const four = { cells: [1, 2, 3, 4].map(i => ({ type: "exercise", id: `e${i}`, kind: "choice", answer: 0, opts: ["x", "y"] })) };
check(`seuil : 3/4 = 75 % ≥ ${EXERCISE_PASS_PCT} % validé`, gradeLessonExercises(four, { e1: 0, e2: 0, e3: 0, e4: 1 })!.passed);
check("seuil : 2/4 = 50 % refusé", !gradeLessonExercises(four, { e1: 0, e2: 0, e3: 1, e4: 1 })!.passed);

check("leçon sans exercice : correction ignorée", gradeLessonExercises({ cells: [{ type: "md", content: "x" }] }, {}) === null);
check("contenu absent : correction ignorée", gradeLessonExercises(null, {}) === null);

// ── Résultat ──
if (failures.length) {
  console.error(`\n${failures.length} échec(s) :`);
  failures.forEach(f => console.error("  ✗", f));
  console.error(`\n${pass} assertions passées, ${failures.length} échec(s)`);
  process.exit(1);
}
console.log(`✓ ${pass} assertions passées — moteur d'exercices et contenu `
  + `${[...files, ...coursTs.map(c => c.nom)].join(", ")} valides.`);
