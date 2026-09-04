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
import { QUESTIONS_TOF } from "../shared/tof-test.js";
import { QUESTIONS_FCA } from "../shared/fca-test.js";
import { QUESTIONS_FCQ } from "../shared/fcq-test.js";
import { QUESTIONS_COOP } from "../shared/coop-test.js";
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

export const TESTS_PARCOURS: Record<string, TestParcours> = {
  tof: { questions: QUESTIONS_TOF, cle: TOF_ANSWER_KEY },
  fca: { questions: QUESTIONS_FCA, cle: FCA_ANSWER_KEY },
  fcq: { questions: QUESTIONS_FCQ, cle: FCQ_ANSWER_KEY },
  coop: { questions: QUESTIONS_COOP, cle: COOP_ANSWER_KEY },
};

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
