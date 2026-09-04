/**
 * Registre des tests d'admission propres à un parcours.
 *
 * Un parcours déclaré dans shared/programs.ts avec `admission.surStudents: false` doit avoir
 * son entrée ici, faute de quoi personne ne pourra jamais s'y inscrire. Le contrôle de
 * cohérence est fait au chargement, plus bas, et il est volontairement bruyant.
 *
 * Le cursus MEAL n'y figure pas : son test historique vit dans api/index.ts et son admission
 * sur les colonnes de `students`. L'asymétrie est documentée dans
 * supabase/academy_program_admissions.sql.
 */
import { PROGRAMS } from "../shared/programs.js";
import { BANQUES_ADMISSION } from "../shared/tests-parcours.js";
import { TOF_ANSWER_KEY } from "./tof-answers.js";
import { FCA_ANSWER_KEY } from "./fca-answers.js";
import { FCQ_ANSWER_KEY } from "./fcq-answers.js";
import { COOP_ANSWER_KEY } from "./coop-answers.js";

export interface TestParcours {
  /** Énoncés et options — partent côté client. */
  questions: { domaine: string; q: string; opts: string[] }[];
  /** Clé de correction — ne sort jamais du serveur. */
  cle: number[];
}

/**
 * Les clés de correction, et elles seules.
 *
 * Séparées des énoncés parce qu'elles n'ont pas le même destin : les énoncés partent au
 * navigateur, les clés jamais. Les tenir dans deux structures rend la faute visible — une
 * clé importée dans un fichier de shared/ sauterait aux yeux à la relecture.
 */
const CLES: Record<string, number[]> = {
  tof: TOF_ANSWER_KEY,
  fca: FCA_ANSWER_KEY,
  fcq: FCQ_ANSWER_KEY,
  coop: COOP_ANSWER_KEY,
};

/**
 * Test complet = énoncés partagés + clé serveur.
 *
 * Assemblé depuis BANQUES_ADMISSION plutôt que réécrit ici : c'est ce qui garantit que le
 * navigateur et le serveur parlent du même test. La version précédente recopiait la liste,
 * et la copie côté navigateur a fini par oublier FCQ et COOP.
 */
export const TESTS_PARCOURS: Record<string, TestParcours> = Object.fromEntries(
  Object.entries(BANQUES_ADMISSION)
    .filter(([id]) => CLES[id])
    .map(([id, questions]) => [id, { questions, cle: CLES[id] }]),
);

/**
 * Incohérences entre les parcours déclarés et les tests disponibles.
 *
 * Renvoyées plutôt que levées : une exception au chargement ferait tomber la fonction
 * serverless entière — donc tout le site, y compris les parcours qui vont bien — pour une
 * erreur de contenu. Les routes qui en dépendent vérifient au cas par cas et répondent
 * clairement ; le script de contrôle, lui, les affiche au build.
 */
export function incoherencesTests(): string[] {
  const out: string[] = [];
  for (const p of PROGRAMS) {
    if (p.admission.surStudents) continue;
    const t = TESTS_PARCOURS[p.id];
    if (!t) {
      out.push(`Parcours « ${p.id} » sans banque de questions : aucune inscription possible.`);
      continue;
    }
    if (t.questions.length !== p.admission.nbQuestions) {
      out.push(`Parcours « ${p.id} » : ${t.questions.length} questions pour ${p.admission.nbQuestions} déclarées.`);
    }
    if (t.cle.length !== t.questions.length) {
      out.push(`Parcours « ${p.id} » : clé de ${t.cle.length} pour ${t.questions.length} questions.`);
    }
    if (t.cle.some((i, k) => !Number.isInteger(i) || i < 0 || i >= (t.questions[k]?.opts.length ?? 0))) {
      out.push(`Parcours « ${p.id} » : la clé pointe une option inexistante.`);
    }
  }
  return out;
}
