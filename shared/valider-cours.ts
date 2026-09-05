// ══════════════ Ce qu'une leçon doit prouver avant d'être publiée ══════════════
//
// Cette validation existait déjà, mais dupliquée dans chaque script/generate-<code>-sql.ts :
// la correction doit rendre 100 % avec sa propre clé (une réponse attendue inatteignable —
// une tolérance absente sur un exercice numérique, un index de choix hors bornes — se
// découvrirait sinon à la place de l'étudiant, en lui coûtant des points sur une réponse
// juste), et chaque exercice porte son explication.
//
// Elle est isolée ici pour une raison précise : l'API admin d'auteur de cours écrit
// directement en base, sans passer par un script ni par une revue de code. Le seul endroit
// qui peut encore refuser une leçon mal formée avant qu'un étudiant ne tombe dessus, c'est
// donc cette fonction — appelée par le script ET par la route qui accepte une leçon soumise
// depuis le panneau d'administration.

import { lessonExercises, gradeLessonExercises, exerciseId, type ExerciseCell } from "./exercises.js";

export type CelluleBrute = Record<string, any>;

export type LeconAValider = { titre: string; cellules: CelluleBrute[] };

export type ResultatValidation = { ok: boolean; erreurs: string[] };

const TYPES_CONNUS = new Set(["md", "callout", "exercise"]);

/**
 * Valide une leçon avant écriture en base.
 *
 * `idsDejaUtilises` porte les identifiants d'exercice des AUTRES leçons du même cours : un
 * identifiant sert de clé de correction, un doublon entre deux leçons écraserait l'une des
 * deux réponses au moment de noter. Passer un ensemble vide revient à ne vérifier que
 * l'intérieur de la leçon.
 */
export function validerLecon(lecon: LeconAValider, idsDejaUtilises: Set<string> = new Set()): ResultatValidation {
  const erreurs: string[] = [];

  if (!lecon.titre?.trim()) erreurs.push("Le titre de la leçon est vide.");
  if (!Array.isArray(lecon.cellules) || lecon.cellules.length === 0) {
    erreurs.push("La leçon ne contient aucune cellule.");
    return { ok: false, erreurs };
  }

  lecon.cellules.forEach((c, i) => {
    if (!TYPES_CONNUS.has(c?.type)) { erreurs.push(`Cellule ${i + 1} : type inconnu « ${c?.type} ».`); return; }
    if ((c.type === "md" || c.type === "callout") && !String(c.content ?? "").trim())
      erreurs.push(`Cellule ${i + 1} (${c.type}) : contenu vide.`);
    if (c.type === "callout" && !String(c.title ?? "").trim())
      erreurs.push(`Cellule ${i + 1} (callout) : titre vide.`);
  });

  const exercices: ExerciseCell[] = lessonExercises({ cells: lecon.cellules });
  if (exercices.length) {
    const ids = exercices.map((e, i) => exerciseId(e, i));

    exercices.forEach((e, i) => {
      const id = ids[i];
      if (e.answer === undefined || e.answer === null || e.answer === "")
        erreurs.push(`Exercice « ${id} » : aucune réponse attendue renseignée.`);
      if (!e.explain?.trim())
        erreurs.push(`Exercice « ${id} » : aucune explication — l'étudiant qui échoue ne saurait pas pourquoi.`);
      if (e.kind === "choice") {
        if (!Array.isArray(e.opts) || e.opts.length < 2)
          erreurs.push(`Exercice « ${id} » : un choix multiple demande au moins deux options.`);
        // ── Le trou que la vérification à 100 % ne peut pas voir ──
        //
        // Comparer la clé à elle-même est toujours vrai : `gradeLessonExercises` noterait
        // un index hors bornes à 100 % puisque la réponse qu'on lui donne EST la clé. Seul
        // ce contrôle explicite peut attraper un index de choix qui ne pointe sur aucune
        // option — trouvé en testant ce validateur, pas en le lisant.
        else if (!Number.isInteger(Number(e.answer)) || Number(e.answer) < 0 || Number(e.answer) >= e.opts.length) {
          erreurs.push(`Exercice « ${id} » : la réponse attendue (${e.answer}) ne désigne aucune des `
            + `${e.opts.length} options.`);
        }
      }
    });

    const doublonsLocaux = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (doublonsLocaux.length)
      erreurs.push(`Identifiants d'exercice dupliqués dans la leçon : ${Array.from(new Set(doublonsLocaux)).join(", ")}.`);

    const collisions = ids.filter(id => idsDejaUtilises.has(id));
    if (collisions.length)
      erreurs.push(`Identifiant(s) déjà utilisé(s) par une autre leçon de ce cours : ${collisions.join(", ")}.`);

    // La correction n'est vérifiée que si les réponses sont toutes renseignées : sinon
    // l'erreur ci-dessus suffit, et gradeLessonExercises noterait juste 0 % sans rien
    // apprendre de plus.
    if (!erreurs.length) {
      const bonnes: Record<string, any> = {};
      exercices.forEach((e, i) => { bonnes[ids[i]] = e.answer; });
      const note = gradeLessonExercises({ cells: lecon.cellules }, bonnes);
      if (!note || note.scorePct !== 100) {
        erreurs.push(`La correction ne rend pas 100 % avec sa propre clé (${note ? note.scorePct : 0} %) : `
          + "une réponse attendue est inatteignable.");
      }
    }
  }

  return { ok: erreurs.length === 0, erreurs };
}

/** Identifiants d'exercice d'une leçon, tels que la notation les calculera. */
export function idsExercices(cellules: CelluleBrute[]): string[] {
  return lessonExercises({ cells: cellules }).map((e, i) => exerciseId(e, i));
}
