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

import {
  lessonExercises, gradeLessonExercises, exerciseId, evaluerFormule, identifiantsDeFormule,
  materialiserExercicesParametres, type ExerciseCell,
} from "./exercises.js";

/** Graine fixe pour la validation : peu importe laquelle, seule compte sa constance d'un appel à l'autre. */
const GRAINE_DE_TEST = 1;

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

  const exercicesBruts: ExerciseCell[] = lessonExercises({ cells: lecon.cellules });
  if (exercicesBruts.length) {
    const idsBruts = exercicesBruts.map((e, i) => exerciseId(e, i));

    // ── Ce qui ne se vérifie que sur la formule BRUTE, avant tout tirage ──
    //
    // Un exercice paramétré n'a pas de `answer` fixe : ce sont ses paramètres et sa
    // formule qui en tiennent lieu, et c'est ici qu'ils se valident — une formule qui
    // référence un paramètre non déclaré, ou qui ne s'évalue pas, doit être refusée avant
    // même de songer à en tirer une valeur.
    exercicesBruts.forEach((e, i) => {
      const id = idsBruts[i];
      if (!Array.isArray(e.parametres) || !e.parametres.length) return;

      if (e.kind !== "number")
        erreurs.push(`Exercice « ${id} » : un exercice paramétré doit être de type « réponse numérique ».`);

      const noms = new Set<string>();
      for (const p of e.parametres) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.nom))
          erreurs.push(`Exercice « ${id} » : nom de paramètre invalide « ${p.nom} ».`);
        if (noms.has(p.nom)) erreurs.push(`Exercice « ${id} » : paramètre « ${p.nom} » déclaré plusieurs fois.`);
        noms.add(p.nom);
        if (!(Number.isFinite(p.min) && Number.isFinite(p.max) && p.min < p.max))
          erreurs.push(`Exercice « ${id} » : bornes invalides pour « ${p.nom} » (min doit être strictement inférieur à max).`);
      }

      if (!e.formule?.trim()) {
        erreurs.push(`Exercice « ${id} » : un exercice paramétré doit porter une formule.`);
      } else {
        try {
          const utilises = identifiantsDeFormule(e.formule);
          const inconnus = utilises.filter(n => !noms.has(n));
          if (inconnus.length) {
            erreurs.push(`Exercice « ${id} » : la formule utilise ${inconnus.map(n => `« ${n} »`).join(", ")}, `
              + "non déclaré(s) en paramètre.");
          } else {
            const essai: Record<string, number> = {};
            for (const p of e.parametres) essai[p.nom] = (p.min + p.max) / 2;
            if (!Number.isFinite(evaluerFormule(e.formule, essai)))
              erreurs.push(`Exercice « ${id} » : la formule ne produit pas un nombre fini.`);
          }
        } catch (err: any) {
          erreurs.push(`Exercice « ${id} » : formule invalide — ${err.message}`);
        }
      }

      // Sans elle, `isExerciseCorrect` compare le chiffre saisi à une réponse calculée qui
      // a toutes les chances d'avoir des décimales — aucun étudiant ne peut la deviner au
      // chiffre près, la question serait injouable.
      if (!(Number(e.tolerance) > 0)) {
        erreurs.push(`Exercice « ${id} » : une tolérance strictement positive est obligatoire pour un exercice `
          + "paramétré — la réponse calculée a des décimales que l'étudiant ne peut pas deviner au chiffre près.");
      }

      for (const p of e.parametres) {
        if (!e.prompt?.includes(`{{${p.nom}}}`))
          erreurs.push(`Exercice « ${id} » : le paramètre « ${p.nom} » n'apparaît nulle part dans l'énoncé `
            + `(« {{${p.nom}}} » attendu).`);
      }
    });

    // ── Au-delà d'ici, tout se vérifie sur une version MATÉRIALISÉE ──
    //
    // Un tirage fixe donne à un exercice paramétré une réponse concrète, exactement comme
    // celle qu'un étudiant recevra — les contrôles usuels (réponse renseignée, bornes d'un
    // choix, correction à 100 % avec sa propre clé) s'appliquent donc sans distinguer les
    // deux catégories d'exercice.
    const materialise = materialiserExercicesParametres({ cells: lecon.cellules }, GRAINE_DE_TEST);
    const exercices: ExerciseCell[] = lessonExercises(materialise);
    const ids = exercices.map((e, i) => exerciseId(e, i));

    exercices.forEach((e, i) => {
      const id = ids[i];
      const reponseUtilisable = !(e.answer === undefined || e.answer === null || e.answer === ""
        || (typeof e.answer === "number" && !Number.isFinite(e.answer)));
      if (!reponseUtilisable)
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
      const note = gradeLessonExercises(materialise, bonnes);
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
