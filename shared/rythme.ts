// ══════════════ Rythme d'ouverture des leçons ══════════════
//
// La règle qui décide si une leçon est ouverte à un instant donné, isolée ici pour une
// raison précise : elle est fausse depuis l'origine et personne ne l'a vu, parce qu'elle
// vivait au milieu d'une fonction qui écrit en base et qu'on ne pouvait pas l'interroger
// sans base.
//
// Ce qu'elle a laissé passer : une étudiante a validé les 20 leçons du cursus MEAL — douze
// semaines de planning — en cinq jours. Terminer une leçon ouvrait la suivante, terminer un
// cours ouvrait le suivant, et rien dans ces deux règles ne regardait la date. Le calendrier
// ne rythmait donc rien du tout dès qu'on avançait sans s'arrêter.
//
// script/verify-rythme.ts rejoue exactement ce scénario contre la fonction ci-dessous.

export const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * De combien un étudiant peut prendre de l'avance sur son calendrier.
 *
 * L'intention d'origine — ne jamais bloquer sèchement quelqu'un qui avance vite — reste
 * entière : le calendrier ouvre de toute façon chaque leçon à sa date, donc personne n'est
 * jamais coincé sur une leçon difficile. La borne dit seulement jusqu'où l'anticipation
 * peut aller : une semaine d'avance, pas un trimestre.
 *
 * Mettre 0 revient au calendrier strict, chaque leçon à sa semaine.
 */
export const AVANCE_MAX_MS = 1 * SEMAINE_MS;

/** Fenêtre d'admission, en semaines. Voir ADMISSION_MONTHS dans shared/programs.ts. */
export const FENETRE_ADMISSION_SEMAINES = 13;

/**
 * Semaine à laquelle s'ouvre la dernière leçon d'un parcours, cours après cours.
 *
 * C'est le calcul que script/verify-rythme.ts fait pour chaque parcours écrit en
 * TypeScript, à partir de tableaux de tailles figés à la compilation. Ici, la même formule
 * sert à l'API admin quand un cours est créé ou modifié EN BASE, sans passer par le
 * TypeScript — le contrôle doit donc rester vrai même pour un contenu qui n'existe nulle
 * part ailleurs qu'en base.
 */
export function semainesNecessaires(taillesCours: number[], lessonsPerWeek: number): number {
  return taillesCours.reduce((total, n) => total + Math.ceil(n / lessonsPerWeek), 0);
}

export type EtatLecon = "locked" | "available" | "missed" | "completed";

export type ContexteLecon = {
  /** Instant de l'évaluation, en millisecondes. */
  maintenant: number;
  /** Date d'ouverture prévue par le calendrier, en millisecondes. */
  ouvertureAt: number;
  /** Statut actuellement en base. */
  statut: EtatLecon;
  /** Rang de la leçon dans son cours (order_index). */
  rang: number;
  /** Nombre de leçons déjà terminées dans ce cours. */
  termineesDuCours: number;
  /** Rang de la dernière leçon terminée dans ce cours. */
  rangMaxTermine: number;
  /** Le cours qui précède dans le même parcours est-il entièrement terminé ? null s'il n'y en a pas. */
  coursPrecedentTermine: boolean | null;
};

/**
 * Une leçon est-elle ouverte ?
 *
 *   1. sa semaine est arrivée — le rythme conseillé, qui garantit qu'un étudiant bloqué
 *      finit toujours par voir la suite ;
 *   2. c'est la leçon suivante d'un cours déjà entamé ;
 *   3. c'est la première leçon d'un cours dont le précédent est entièrement terminé.
 *
 * Les règles 2 et 3 — et elles seules — sont bornées par AVANCE_MAX_MS. La règle 1 ne l'est
 * pas : elle EST le calendrier.
 *
 * Une leçon déjà ouverte le reste. Resserrer un rythme ne doit jamais reprendre ce qui est
 * déjà entre les mains de l'étudiant : une leçon visible hier qui disparaît aujourd'hui se
 * lit comme une panne, pas comme une correction de calendrier.
 */
export function leconOuverte(c: ContexteLecon): boolean {
  if (c.statut === "completed") return true;
  if (c.statut === "available" || c.statut === "missed") return true;

  if (c.maintenant >= c.ouvertureAt) return true;

  const dansLaFenetreDAvance = c.maintenant >= c.ouvertureAt - AVANCE_MAX_MS;
  if (!dansLaFenetreDAvance) return false;

  const suiteDuCours = c.termineesDuCours > 0 && c.rang <= c.rangMaxTermine + 1;
  const debutDuCoursSuivant = c.termineesDuCours === 0 && c.rang <= 1 && c.coursPrecedentTermine === true;

  return suiteDuCours || debutDuCoursSuivant;
}
