// ══════════════ Chronométrage d'une épreuve d'admission ══════════════
//
// Le test n'avait aucune limite de temps : rien n'empêchait de le laisser ouvert des jours,
// à chercher chaque réponse à son rythme, avec tout l'internet à disposition. Le
// chronomètre existe pour créer une vraie pression de temps — pas pour piéger qui a une
// connexion lente ou qui doit répondre au téléphone en cours de route.
//
// ── Pourquoi une allocation par question, et pas une durée fixe ──
//
// Les parcours n'ont pas le même nombre de questions (15 pour la formation de formateurs,
// 30 pour le cursus MEAL) : une durée unique aurait été confortable pour l'un et
// oppressante pour l'autre. Une allocation par question s'ajuste automatiquement, et reste
// un nombre qu'on peut justifier en une phrase.
//
// ── Pourquoi 75 secondes ──
//
// Les questions des bancs d'admission sont des questions de vocabulaire et de
// compréhension — jamais un calcul à poser sur papier, ça, c'est le rôle des exercices de
// cours, pas du test d'entrée. 75 secondes suffit à lire l'énoncé, les quatre options, et
// choisir sans note à disposition, sans laisser le temps de chercher la réponse ailleurs
// question par question.

export const SECONDES_PAR_QUESTION = 75;

/**
 * Seuil à partir duquel le compte à rebours passe en alerte visuelle : les derniers 20 % du
 * temps alloué. Proportionnel plutôt que fixe, pour qu'un test de 15 questions (18 minutes)
 * et un test de 30 (37 minutes) alertent au même degré d'urgence relative, pas au même
 * nombre de minutes absolu.
 */
export const PROPORTION_ALERTE = 0.2;

export function dureeEpreuveSecondes(nbQuestions: number): number {
  return nbQuestions * SECONDES_PAR_QUESTION;
}

/** Format mm:ss, pour un compte à rebours — jamais de nombre négatif affiché. */
export function formatCompteARebours(secondesRestantes: number): string {
  const s = Math.max(0, Math.round(secondesRestantes));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export type FenetreChrono = { testStartedAt: string; expiresAt: string; durationSeconds: number };

/** La fenêtre de temps qui découle d'un instant de démarrage et d'une durée. Fonction pure. */
export function fenetreDepuisDemarrage(demarrage: string, dureeSecondes: number): FenetreChrono {
  const debut = new Date(demarrage).getTime();
  return {
    testStartedAt: demarrage,
    expiresAt: new Date(debut + dureeSecondes * 1000).toISOString(),
    durationSeconds: dureeSecondes,
  };
}

/**
 * La fenêtre en cours, SI elle est encore valide — ne dit jamais d'en ouvrir une nouvelle.
 *
 * Sert au serveur ET au client à la même question : « est-ce que le temps déjà démarré
 * tient encore ? ». `null` répond aussi bien « jamais démarré » qu'« expiré » — les deux
 * cas veulent la même chose côté appelant, revoir l'écran de départ.
 */
export function fenetreChronoActive(demarrage: string | null, dureeSecondes: number): FenetreChrono | null {
  if (!demarrage) return null;
  const f = fenetreDepuisDemarrage(demarrage, dureeSecondes);
  return new Date(f.expiresAt).getTime() > Date.now() ? f : null;
}

// ══════════════ Chronométrage d'un quiz de leçon (« à vous de jouer ») ══════════════
//
// Contrairement au test d'admission, retentable après une semaine, le quiz noté d'une leçon
// ne se passe qu'UNE SEULE FOIS : une fois démarré, l'essai est consommé, qu'il soit terminé
// ou non. Ce qui suit en découle : pas de plafond de note selon le rang d'une tentative (il
// n'y en a jamais de seconde), et le temps écoulé sans avoir remis le quiz vaut 0 — pas une
// note calculée sur les réponses déjà données, un 0 pur, parce que la règle est « il doit
// finir », pas « il doit bien répondre à ce qu'il a eu le temps de faire ».
//
// 120 secondes par exercice, et non 75 comme pour le test d'admission : un exercice de cours
// peut demander un calcul (une perte attendue, un taux d'intérêt composé) que la question à
// choix multiple du test d'entrée ne demande jamais.

export const SECONDES_PAR_EXERCICE = 120;

/** Dix minutes : le moment où un rappel automatique part par email si le quiz n'est pas remis. */
export const SEUIL_RAPPEL_SECONDES = 600;

export function dureeQuizSecondes(nbExercices: number): number {
  return nbExercices * SECONDES_PAR_EXERCICE;
}
