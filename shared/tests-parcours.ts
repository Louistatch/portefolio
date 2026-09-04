/**
 * Les banques de questions des tests d'admission, en UN SEUL registre.
 *
 * ── Le défaut que ce fichier supprime ──
 *
 * Il y avait deux listes. Le serveur tenait la sienne dans api/program-tests.ts, gardée par
 * un contrôle de cohérence explicite. Le navigateur tenait la sienne, en dur, dans
 * client/src/pages/academy/program-test.tsx — et personne ne la vérifiait.
 *
 * Elles ont divergé. Les parcours FCQ et COOP ont été ajoutés côté serveur et oubliés côté
 * navigateur. Le serveur répondait donc « ce test existe », le navigateur ne trouvait aucune
 * question, et la page affichait « Ce parcours n'a pas de test d'admission en ligne pour le
 * moment » — un mensonge, produit par la page elle-même. Conséquence : personne ne pouvait
 * entrer dans le parcours payant. Pas d'erreur, pas de journal, juste une porte murée avec
 * un panneau poli.
 *
 * Une liste qu'on doit penser à tenir à jour finit toujours par ne plus l'être. Il n'y en a
 * donc plus qu'une, et les deux côtés la lisent. Ajouter un parcours sans sa banque devient
 * impossible à moitié : ou les deux, ou aucun.
 *
 * ── Ce qui reste côté serveur ──
 *
 * Les énoncés et les options sont publics : ils partent au navigateur, c'est leur métier.
 * Les CLÉS DE CORRECTION, elles, ne quittent jamais api/ — voir api/program-tests.ts, qui
 * assemble ce registre avec les clés pour former les tests complets.
 */
import { QUESTIONS_TOF } from "./tof-test.js";
import { QUESTIONS_FCA } from "./fca-test.js";
import { QUESTIONS_FCQ } from "./fcq-test.js";
import { QUESTIONS_COOP } from "./coop-test.js";

/** Une question telle qu'elle part au navigateur : jamais de réponse attendue. */
export interface QuestionAdmission {
  domaine: string;
  q: string;
  opts: string[];
}

/**
 * Parcours → énoncés de son test d'admission.
 *
 * Le cursus MEAL n'y figure pas : son test historique vit dans api/index.ts et son admission
 * sur les colonnes de `students`. L'asymétrie est documentée dans
 * supabase/academy_program_admissions.sql.
 */
export const BANQUES_ADMISSION: Record<string, QuestionAdmission[]> = {
  tof: QUESTIONS_TOF,
  fca: QUESTIONS_FCA,
  fcq: QUESTIONS_FCQ,
  coop: QUESTIONS_COOP,
};

/** Le parcours a-t-il un test d'admission en ligne ? */
export function aUnTestEnLigne(programId: string): boolean {
  return (BANQUES_ADMISSION[programId]?.length ?? 0) > 0;
}
