// ══════════════ Exercices de leçon (pédagogie « faire faire ») ══════════════
// Une leçon peut contenir des cellules { type: "exercise" } : l'étudiant produit une réponse
// (calcul, choix, saisie) et le serveur la corrige. Le corrigé vit dans le contenu en base et
// n'est JAMAIS envoyé au client — même logique anti-triche que le test d'admission.
//
// Logique isolée ici plutôt que dans api/index.ts pour être typée, relue et testée à part.

export const EXERCISE_PASS_PCT = 70;

export type ExerciseCell = {
  id?: string;
  type: string;
  kind?: "choice" | "number" | "text" | string;
  title?: string;
  prompt?: string;
  opts?: string[];
  answer?: any;
  accept?: string[];
  tolerance?: number;
  unit?: string;
  hint?: string;
  explain?: string;
};

export type ExerciseResult = { id: string; correct: boolean; explain: string | null };

export type LessonGrade = {
  results: ExerciseResult[];
  correctCount: number;
  total: number;
  scorePct: number;
  passed: boolean;
};

export function lessonExercises(content: any): ExerciseCell[] {
  const cells = Array.isArray(content?.cells) ? content.cells : [];
  return cells.filter((c: any) => c?.type === "exercise");
}

/** Identifiant stable d'un exercice : celui du contenu, sinon son rang dans la leçon. */
export function exerciseId(ex: ExerciseCell, index: number): string {
  return ex.id || `ex${index + 1}`;
}

/**
 * Retire le corrigé des cellules d'exercice avant d'envoyer un cours au navigateur.
 *
 * `explain` en fait partie : la correction pédagogique énonce la bonne réponse en toutes
 * lettres (« C'est la colonne label »), donc la laisser dans le contenu revient à publier
 * le corrigé sous une autre forme. Elle est renvoyée par gradeLessonExercises au moment de
 * la correction, ce qui est le seul instant où l'étudiant doit la voir.
 * `hint` reste servi : l'indice est une aide destinée à être lue avant de répondre.
 */
export function stripExerciseAnswers(content: any) {
  if (!Array.isArray(content?.cells)) return content;
  return {
    ...content,
    cells: content.cells.map((c: any) => {
      if (c?.type !== "exercise") return c;
      const { answer, accept, tolerance, explain, ...safe } = c;
      return safe;
    }),
  };
}

function normalizeText(v: any): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // diacritiques décomposés par NFD
    .replace(/[`'"()._]/g, "")
    .replace(/\s+/g, " ");
}

export function isExerciseCorrect(ex: ExerciseCell, given: any): boolean {
  if (given === undefined || given === null || given === "") return false;
  switch (ex.kind) {
    case "choice":
      return Number(given) === Number(ex.answer);
    case "number": {
      // La virgule décimale est la norme en français : « 93,5 » doit être accepté.
      const g = Number(String(given).replace(",", ".").trim());
      if (!Number.isFinite(g)) return false;
      const tol = Number(ex.tolerance ?? 0);
      return Math.abs(g - Number(ex.answer)) <= tol;
    }
    default: {
      // Texte : la bonne réponse ou l'une des variantes, comparaison tolérante
      // (accents, casse, ponctuation, mot noyé dans une phrase).
      const g = normalizeText(given);
      if (!g) return false;
      const candidates = [ex.answer, ...(ex.accept || [])].filter(v => v !== undefined && v !== null);
      return candidates.some(c => {
        const n = normalizeText(c);
        return n.length > 0 && (g === n || g.includes(n));
      });
    }
  }
}

/** Corrige les exercices d'une leçon. Renvoie null si la leçon n'en contient aucun. */
export function gradeLessonExercises(content: any, answers: any): LessonGrade | null {
  const exercises = lessonExercises(content);
  if (!exercises.length) return null;
  const given = answers && typeof answers === "object" ? answers : {};
  const results: ExerciseResult[] = exercises.map((ex, i) => {
    const id = exerciseId(ex, i);
    return { id, correct: isExerciseCorrect(ex, given[id]), explain: ex.explain || null };
  });
  const correctCount = results.filter(r => r.correct).length;
  const scorePct = Math.round((correctCount / exercises.length) * 100);
  return { results, correctCount, total: exercises.length, scorePct, passed: scorePct >= EXERCISE_PASS_PCT };
}
