/**
 * Retard sur le rythme conseillé : mesure, paliers d'alerte, et le texte de l'alerte.
 *
 * ── Pourquoi ce module existe ──
 * La remise à zéro d'un parcours (api/index.ts, /api/admin/academy/late-students/reset)
 * tombait sans que rien ne l'ait annoncée : l'étudiant découvrait la conséquence par
 * l'email qui la constate. Une sanction qu'on n'a pas vue venir n'est pas une règle, c'est
 * une surprise — et elle ne fait revenir personne.
 *
 * Le texte des alertes vit donc ici, et non dans l'écran ou dans l'email : les deux le
 * lisent au même endroit, ce qui interdit qu'un tableau de bord annonce une échéance et
 * qu'un email en annonce une autre.
 *
 * ── Ce que le retard mesure ──
 * L'âge de la PLUS ANCIENNE échéance non tenue, pas le nombre de leçons manquantes.
 * Compter les leçons punirait autant l'étudiant rapide parti en congés que celui qui a
 * décroché. C'est la même mesure que constatDeRetard() côté serveur.
 */

/** Au-delà de ce retard, le parcours est remis à zéro. */
export const RETARD_EXCLUSION_JOURS = 30;

/** Jours de retard déclenchant chaque alerte, du plus tôt au plus tard. */
export const RETARD_PALIERS = [7, 14, 21] as const;

export type NiveauRetard = "rappel" | "avertissement" | "dernier" | "depasse";

export type ConstatRetard = {
  /** Retard, en jours, sur la plus ancienne échéance non tenue. */
  jours: number;
  /** Nombre de leçons dont l'échéance est passée sans validation. */
  leconsEnRetard: number;
  /** Fin de la fenêtre d'admission, si connue (ISO). */
  finAdmission?: string | null;
  /** Pour les tests : instant de référence. */
  maintenant?: number;
};

export type Alerte = {
  niveau: NiveauRetard;
  /** Palier atteint, en jours. */
  palier: number;
  /** Gravité, pour le choix des couleurs à l'écran. */
  ton: "info" | "attention" | "grave";
  titre: string;
  /** Une phrase : ce qui se passe, et quand. */
  resume: string;
  /** Le corps du message. Chaque entrée est un paragraphe. */
  paragraphes: string[];
  /** Ce que la remise à zéro efface. Vide au premier palier : on n'agite pas la sanction dès le premier retard. */
  consequences: string[];
  /** Ce qu'elle ne touche pas. Toujours dit dès qu'on énonce les conséquences. */
  conserve: string[];
  /** Jours restants avant le seuil de remise à zéro (0 si déjà franchi). */
  joursAvantRemiseAZero: number;
  /** Date à laquelle le seuil sera franchi (ISO), ou null s'il l'est déjà. */
  dateRemiseAZero: string | null;
  action: { libelle: string; href: string };
};

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Palier applicable : le plus avancé que le retard justifie. */
export function niveauDeRetard(jours: number): NiveauRetard | null {
  if (jours > RETARD_EXCLUSION_JOURS) return "depasse";
  if (jours >= 21) return "dernier";
  if (jours >= 14) return "avertissement";
  if (jours >= 7) return "rappel";
  return null;
}

function jourMois(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

/** Accord en nombre, sans le « (s) » qui trahit un texte fabriqué par une machine. */
function pluriel(n: number, singulier: string, plurielMot?: string): string {
  return `${n} ${n > 1 ? (plurielMot ?? singulier + "s") : singulier}`;
}

/**
 * Ce que la remise à zéro efface, et ce qu'elle laisse.
 *
 * La liste suit exactement ce que fait la route de remise à zéro. L'attestation
 * d'admission en fait partie : elle constate une admission qui est annulée. Le dire
 * évite qu'un étudiant la cherche ensuite dans son espace.
 */
export const CONSEQUENCES_REMISE_A_ZERO = [
  "Votre admission est annulée : l'accès aux leçons se referme.",
  "Votre planning de leçons et le calendrier de vos travaux de groupe sont supprimés.",
  "Vous quittez votre équipe du travail de groupe en cours — vos coéquipiers continuent sans vous.",
  "Votre attestation d'admission disparaît, puisque l'admission qu'elle constate est annulée.",
];

export const CONSERVE_REMISE_A_ZERO = [
  "Vos notes restent à votre relevé, ainsi que les attestations de cours déjà délivrées.",
  "Le test d'admission est repassable immédiatement, sans les sept jours d'attente habituels.",
  "Vous repartez de la semaine 1 avec une promotion plus récente, et une nouvelle fenêtre de trois mois.",
];

/**
 * Construit l'alerte correspondant au retard constaté, ou null s'il n'y a rien à dire.
 *
 * Le ton monte d'un palier à l'autre : le premier message suppose une semaine chargée, le
 * dernier annonce une date. Aucun ne moralise — un étudiant qui décroche le sait déjà.
 */
export function alerteDeRetard(c: ConstatRetard): Alerte | null {
  const niveau = niveauDeRetard(c.jours);
  if (!niveau) return null;

  const maintenant = c.maintenant ?? Date.now();
  const restant = Math.max(0, RETARD_EXCLUSION_JOURS - c.jours);
  const dateRemiseAZero = restant > 0 ? new Date(maintenant + restant * JOUR_MS).toISOString() : null;
  const echeance = dateRemiseAZero ? jourMois(dateRemiseAZero) : null;
  const fin = c.finAdmission ? jourMois(c.finAdmission) : null;
  const enRetard = pluriel(c.leconsEnRetard, "leçon en retard", "leçons en retard");

  const action = { libelle: "Reprendre ma prochaine leçon", href: "/academy/dashboard" };

  if (niveau === "rappel") {
    return {
      niveau, palier: 7, ton: "info",
      titre: "Une échéance est passée",
      resume: `Votre plus ancienne leçon non validée devait l'être il y a ${pluriel(c.jours, "jour")}.`,
      paragraphes: [
        `Vous avez ${enRetard}. Le rythme d'une à deux leçons par semaine est un conseil, pas un couperet : personne ne vous ferme la porte pour une semaine chargée.`,
        fin
          ? `Ce qui ne s'étend pas, en revanche, c'est votre fenêtre d'admission : elle se termine le ${fin}, et cette date ne bouge pas. Chaque semaine passée est une semaine de moins pour terminer.`
          : `Ce qui ne s'étend pas, en revanche, c'est votre fenêtre d'admission de trois mois : elle a été fixée à votre admission et ne bouge pas.`,
        `Reprendre aujourd'hui vous coûte une soirée. Au-delà de trente jours de retard un parcours est remis à zéro : il vous reste ${pluriel(restant, "jour")}.`,
      ],
      consequences: [],
      conserve: [],
      joursAvantRemiseAZero: restant, dateRemiseAZero, action,
    };
  }

  if (niveau === "avertissement") {
    return {
      niveau, palier: 14, ton: "attention",
      titre: "Votre parcours est menacé",
      resume: echeance
        ? `Sans reprise avant le ${echeance}, votre parcours sera remis à zéro.`
        : `Sans reprise, votre parcours sera remis à zéro.`,
      paragraphes: [
        `Vous avez ${enRetard}, et ${pluriel(c.jours, "jour")} de retard sur la plus ancienne. Au-delà de trente jours, un parcours est remis à zéro — non pour sanctionner, mais parce qu'à ce stade la fenêtre de trois mois qui reste ne permet plus de terminer le cursus.`,
        echeance
          ? `Dans votre cas, ce seuil tombe le ${echeance}. Il vous reste ${pluriel(restant, "jour")} pour valider les leçons en retard, et cela suffit largement.`
          : `Il vous reste ${pluriel(restant, "jour")} pour valider les leçons en retard, et cela suffit largement.`,
        `Vous n'avez pas à tout rattraper d'un coup : validez la plus ancienne, et le compteur repart de la suivante.`,
      ],
      consequences: CONSEQUENCES_REMISE_A_ZERO,
      conserve: CONSERVE_REMISE_A_ZERO,
      joursAvantRemiseAZero: restant, dateRemiseAZero, action,
    };
  }

  if (niveau === "dernier") {
    return {
      niveau, palier: 21, ton: "grave",
      titre: "Dernier rappel avant la remise à zéro",
      resume: echeance
        ? `Il vous reste ${pluriel(restant, "jour")} — jusqu'au ${echeance}.`
        : `Le seuil de trente jours est sur le point d'être franchi.`,
      paragraphes: [
        `${pluriel(c.jours, "jour")} de retard sur votre plus ancienne échéance, ${enRetard} au total.${echeance ? ` Au ${echeance}, votre parcours sera remis à zéro.` : ""}`,
        `Une leçon validée d'ici là suffit à écarter l'échéance : c'est la plus ancienne échéance non tenue qui est mesurée, pas le nombre de leçons restantes.`,
        `Si quelque chose vous en empêche — le temps, la connexion, un empêchement personnel — écrivez-nous plutôt que de laisser courir. Nous préférons décaler avec vous que remettre à zéro sans vous.`,
      ],
      consequences: CONSEQUENCES_REMISE_A_ZERO,
      conserve: CONSERVE_REMISE_A_ZERO,
      joursAvantRemiseAZero: restant, dateRemiseAZero, action,
    };
  }

  return {
    niveau: "depasse", palier: RETARD_EXCLUSION_JOURS, ton: "grave",
    titre: "Le seuil de trente jours est franchi",
    resume: `${pluriel(c.jours, "jour")} de retard : votre parcours peut être remis à zéro à tout moment.`,
    paragraphes: [
      `Votre plus ancienne échéance non tenue date de ${pluriel(c.jours, "jour")}, et vous avez ${enRetard}. La fenêtre d'admission qui vous reste ne permet plus de terminer le cursus au rythme prévu.`,
      `Reprendre maintenant reste possible et compte : tant que la remise à zéro n'a pas été faite, une leçon validée vous ramène sous le seuil.`,
      `Si vous préférez repartir proprement avec une promotion plus récente, écrivez-nous et nous remettons votre parcours à zéro de nous-mêmes — vous repasserez le test sans délai d'attente.`,
    ],
    consequences: CONSEQUENCES_REMISE_A_ZERO,
    conserve: CONSERVE_REMISE_A_ZERO,
    joursAvantRemiseAZero: 0, dateRemiseAZero: null, action,
  };
}
