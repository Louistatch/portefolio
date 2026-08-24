// ══════════════ Travaux de groupe (Group Work) ══════════════
//
// À partir de la semaine 4, le cursus prend la forme du modèle WQU : les leçons continuent
// au rythme hebdomadaire, et s'y ajoute une évaluation collective — le « Group Work » (GW).
// Il y en a UN PAR MOIS, soit trois au total, qui tiennent dans la fenêtre d'admission de
// 3 mois (13 semaines) : semaine 4, semaine 8, semaine 12.
//
// Le calendrier est relatif à la date d'admission de l'étudiant, comme le planning des
// leçons : chacun avance sur sa propre horloge, et les groupes sont constitués par cohorte
// (mois d'admission) pour que les membres d'un même groupe aient des échéances proches.
//
// Ce fichier est la source de vérité du calendrier et des énoncés. La table
// `academy_group_works` est semée depuis ces valeurs au premier appel de l'API ; une fois
// semée, elle prime (l'énoncé reste modifiable depuis l'administration sans redéploiement).

/** Semaines d'ouverture des trois GW, comptées depuis l'admission. Un par mois. */
export const GROUP_WORK_WEEKS = [4, 8, 12] as const;

/** Durée de la fenêtre de rendu d'un GW, en semaines. Deux fois celle d'une leçon : un
 *  travail collectif demande de se coordonner, ce qu'une semaine ne permet pas. */
export const GROUP_WORK_WINDOW_WEEKS = 2;

/**
 * Taille d'un groupe : trois, comme le modèle WQU dont ce dispositif est repris.
 *
 * L'effectif ne tombe presque jamais juste — 19 étudiants ne font pas des groupes de 3. Le
 * reste est absorbé en élargissant un groupe existant plutôt qu'en ouvrant un groupe d'une
 * personne : un « groupe » seul n'est pas un travail de groupe, c'est un devoir individuel
 * déguisé, et l'étudiant concerné n'a personne à qui écrire.
 */
export const GROUP_TARGET_SIZE = 3;
export const GROUP_MAX_MEMBERS = 4;
export const GROUP_MIN_MEMBERS = 2;

/**
 * Un étudiant n'entre dans le dispositif que s'il n'a pas encore franchi sa semaine 2.
 *
 * Les travaux de groupe ont été ajoutés en cours de route. Les imposer à quelqu'un qui est
 * déjà en semaine 9 reviendrait à changer les règles au milieu de la partie : il découvrirait
 * trois évaluations collectives dont deux seraient déjà en retard le jour de leur apparition.
 * Le dispositif s'applique donc à ceux dont le parcours commence à peine.
 */
export const GROUP_WORK_ELIGIBILITY_WEEKS = 2;

/**
 * Évaluation par les pairs — chaque membre note les AUTRES membres de son groupe.
 *
 * Quatre critères à 3 points, soit 12 au total : c'est la grille WQU, et elle tient en un
 * écran, ce qui est la condition pour qu'elle soit réellement remplie. Elle ne change pas la
 * note du projet ; elle documente la contribution de chacun, et c'est à ce titre qu'elle
 * compte — un rendu collectif sans trace des contributions est ingérable dès qu'un membre
 * conteste.
 */
export const PEER_REVIEW_MAX_PER_CRITERION = 3;
export const PEER_REVIEW_CRITERIA = [
  { cle: "planification", libelle: "Contribue à la planification du projet et apporte une contribution utile à son avancement" },
  { cle: "ponctualite", libelle: "Termine son travail et le partage bien avant l'échéance (pas au dernier moment)" },
  { cle: "qualite", libelle: "Produit des éléments de qualité, réellement utilisés dans le rendu (et non plagiés)" },
  { cle: "reactivite", libelle: "Répond aux demandes de clarification et aux révisions demandées par le groupe" },
] as const;

/** Total maximal d'une évaluation par les pairs : 4 critères × 3 points. */
export const PEER_REVIEW_MAX_TOTAL = PEER_REVIEW_CRITERIA.length * PEER_REVIEW_MAX_PER_CRITERION;

/**
 * Grille du formateur. Les points se répartissent sur les mêmes axes pour les trois GW ;
 * seul l'énoncé change. Le total fait 100, ce qui évite d'avoir à expliquer une conversion.
 */
export const INSTRUCTOR_RUBRIC = [
  { cle: "analyse", libelle: "Analyse quantitative (questions ouvertes)", points: 40 },
  { cle: "methode", libelle: "Rigueur méthodologique et justification des choix", points: 25 },
  { cle: "livrables", libelle: "Qualité et complétude des livrables attendus", points: 20 },
  { cle: "restitution", libelle: "Clarté de la restitution écrite", points: 15 },
] as const;

export type GroupWorkDef = {
  /** 1, 2 ou 3 — l'ordre dans lequel les GW s'enchaînent. */
  index: number;
  /** Semaine d'ouverture depuis l'admission. */
  weekIndex: number;
  title: string;
  /** Énoncé : ce que le groupe doit produire, et pourquoi. */
  brief: string;
  /** Livrables attendus, un par ligne dans le formulaire de rendu. */
  deliverables: string[];
  maxScore: number;
  /** Énoncé imprimable, déposé dans le forum du groupe à sa constitution. */
  briefUrl: string;
  /** Modèle de rapport à trois mains, une section réservée par membre. */
  templateUrl: string;
};

export const GROUP_WORKS: GroupWorkDef[] = [
  {
    index: 1,
    weekIndex: GROUP_WORK_WEEKS[0],
    title: "GW1 — Concevoir une collecte de données en équipe",
    brief:
      "Votre groupe reçoit une commande fictive : mesurer l'effet d'un projet de maraîchage sur les revenus " +
      "de 200 ménages. À vous de cadrer la collecte, de construire le questionnaire dans KoboToolbox et de " +
      "défendre vos choix d'échantillonnage. Le rendu est collectif : un seul dépôt pour tout le groupe.",
    deliverables: [
      "Note de cadrage (2 pages) : question d'évaluation, indicateurs, unité d'observation",
      "Formulaire KoboToolbox déployé (lien de partage ou XLSForm)",
      "Plan d'échantillonnage justifié (taille, méthode, limites)",
      "Répartition du travail entre les membres du groupe",
    ],
    maxScore: 100,
    briefUrl: "/academy/gw/GW1-enonce.pdf",
    templateUrl: "/academy/gw/GW1-modele-rapport.docx",
  },
  {
    index: 2,
    weekIndex: GROUP_WORK_WEEKS[1],
    title: "GW2 — Cartographier et interpréter les résultats",
    brief:
      "À partir des données collectées au GW1 (ou du jeu de données fourni en cours), produisez la lecture " +
      "spatiale des résultats : où le projet a porté, où il n'a pas porté, et ce que la carte ne dit pas. " +
      "Le travail attendu est une analyse, pas une illustration.",
    deliverables: [
      "Carte thématique exportée (PNG ou PDF) avec légende, échelle et source",
      "Projet QGIS ou lien vers les couches utilisées",
      "Note de lecture (2 pages) : ce que montre la carte, ce qu'elle ne montre pas",
      "Répartition du travail entre les membres du groupe",
    ],
    maxScore: 100,
    briefUrl: "/academy/gw/GW2-enonce.pdf",
    templateUrl: "/academy/gw/GW2-modele-rapport.docx",
  },
  {
    index: 3,
    weekIndex: GROUP_WORK_WEEKS[2],
    title: "GW3 — Tableau de bord et rapport automatisé",
    brief:
      "Dernier travail collectif du cursus : industrialiser la chaîne. Le groupe livre un tableau de bord " +
      "qui se met à jour depuis la source de données, et le rapport qui en découle. C'est la démonstration " +
      "de bout en bout attendue d'un expert MEAL.",
    deliverables: [
      "Tableau de bord fonctionnel (lien ou fichier) alimenté par la source de données",
      "Rapport de suivi-évaluation (5 pages) généré à partir du tableau de bord",
      "Note technique : comment la mise à jour se fait, et ce qu'il reste manuel",
      "Répartition du travail entre les membres du groupe",
    ],
    maxScore: 100,
    briefUrl: "/academy/gw/GW3-enonce.pdf",
    templateUrl: "/academy/gw/GW3-modele-rapport.docx",
  },
];

/** Nom lisible d'un groupe d'après son rang dans la cohorte : 0 → « Groupe A ». */
export function groupNameFor(rank: number): string {
  const lettres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lettre = rank < lettres.length ? lettres[rank] : String(rank + 1);
  return `Groupe ${lettre}`;
}

/** Cohorte d'un étudiant : le mois de son admission, au format « 2026-08 ». */
export function cohortOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type GroupWorkStatus = "locked" | "available" | "submitted" | "completed" | "missed";

/** Libellé affiché pour chaque état. Partagé entre l'espace étudiant et l'administration. */
export const GROUP_WORK_STATUS_LABEL: Record<GroupWorkStatus, string> = {
  locked: "Verrouillé",
  available: "À rendre",
  submitted: "Rendu — en cours de correction",
  completed: "Corrigé",
  missed: "En retard",
};
