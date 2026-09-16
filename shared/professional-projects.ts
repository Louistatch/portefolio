/** Grilles publiques : points maximaux, identiques dans le brief et la correction. */
export const PROJECT_RUBRICS = {
  data: [
    { id: 'problem', label: 'Formulation du problème', max: 10 },
    { id: 'quality', label: 'Qualité et provenance des données', max: 10 },
    { id: 'technical', label: 'Exécution technique reproductible', max: 20 },
    { id: 'reasoning', label: 'Raisonnement analytique', max: 20 },
    { id: 'business', label: 'Compréhension métier', max: 15 },
    { id: 'visuals', label: 'Visualisation', max: 10 },
    { id: 'communication', label: 'Communication', max: 10 },
    { id: 'recommendations', label: 'Recommandations', max: 5 },
  ],
  coop: [
    { id: 'diagnosis', label: 'Diagnostic des besoins et inclusion', max: 20 },
    { id: 'legal', label: 'Choix juridique et références vérifiées', max: 20 },
    { id: 'governance', label: 'Gouvernance et contrôle interne', max: 15 },
    { id: 'economics', label: 'Viabilité du service collectif', max: 20 },
    { id: 'plan', label: 'Plan opérationnel et indicateurs', max: 15 },
    { id: 'communication', label: 'Qualité du dossier et limites', max: 10 },
  ],
} as const;
export type ProjectProgram = keyof typeof PROJECT_RUBRICS;
export const PROJECT_PASS = 75;
export function isProjectProgram(id: string): id is ProjectProgram { return id === 'data' || id === 'coop'; }
export function gradeProject(program: ProjectProgram, scores: Record<string, unknown>, criticalIssue: boolean) {
  const rubric = PROJECT_RUBRICS[program];
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) throw new Error('Grille incomplète.');
  if (Object.keys(scores).length !== rubric.length) throw new Error('Complétez chaque critère.');
  let total = 0;
  for (const criterion of rubric) {
    const score = scores[criterion.id];
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > criterion.max) throw new Error(`Note invalide : ${criterion.label}.`);
    total += score;
  }
  return { score: Math.round(total * 100) / 100, status: total >= PROJECT_PASS && !criticalIssue ? 'approved' : 'changes_requested' };
}
export function projectRequiredForCourse(code: string) { return code === 'DATA-02' || code === 'COOP-02'; }
