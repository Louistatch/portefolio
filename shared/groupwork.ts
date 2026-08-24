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

/**
 * Durée de la fenêtre de rendu d'un GW, en semaines.
 *
 * Une seule — le même rythme qu'une leçon. Le groupe, lui, est constitué dès le premier
 * jour du parcours : les équipes ont donc des semaines pour lire l'énoncé, se répartir le
 * travail et avancer avant que la fenêtre de dépôt ne s'ouvre. Ce qui est borné à une
 * semaine, c'est la remise, pas la préparation.
 */
export const GROUP_WORK_WINDOW_WEEKS = 1;

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
  /** Cours du cursus dont ce travail est l'aboutissement — il s'ouvre à sa dernière semaine. */
  cours: string;
  /** Conseils de méthode, imprimés dans l'énoncé PDF. */
  conseils: string[];
  /** Énoncé imprimable, déposé dans le forum du groupe à sa constitution. */
  briefUrl: string;
  /** Modèle de rapport à trois mains, une section réservée par membre. */
  templateUrl: string;
  /** Sections du modèle de rapport, dans l'ordre : intitulé + consigne de rédaction. */
  plan: { titre: string; consigne: string }[];
};

// Chaque travail est l'aboutissement du cours de sa période, et d'aucun autre. Le cursus
// place MEAL-01 en semaines 1-4, MEAL-02 en 5-8 et MEAL-03 en 9-11 : un GW générique
// tomberait à côté, et demanderait au groupe des compétences qu'il n'a pas encore vues.
export const GROUP_WORKS: GroupWorkDef[] = [
  {
    index: 1,
    weekIndex: GROUP_WORK_WEEKS[0],
    cours: "MEAL-01 — Enquête nutritionnelle, Région de Lomé",
    title: "GW1 — Le questionnaire nutritionnel de la Région de Lomé",
    brief:
      "Votre groupe reprend le terrain de MEAL-01. Le service nutrition d'une ONG doit mesurer la " +
      "malnutrition aiguë chez les enfants de 6 à 59 mois dans trois quartiers de Lomé. Concevez le " +
      "formulaire KoboToolbox complet — types de réponse, validations, logique de saut — déployez-le, " +
      "testez-le sur le terrain avec KoboCollect, et défendez votre plan d'échantillonnage.",
    deliverables: [
      "Formulaire KoboToolbox déployé (lien de partage ou XLSForm), comportant au moins une contrainte de validation et un saut conditionnel",
      "Note de cadrage (2 pages) : indicateurs nutritionnels retenus, unité d'observation, justification des questions posées",
      "Plan d'échantillonnage : taille, méthode de tirage dans les trois quartiers, limites assumées",
      "Jeu de test : au moins 5 soumissions réalisées depuis KoboCollect, puis exportées",
      "Répartition du travail entre les membres du groupe",
    ],
    conseils: [
      "Commencez par la question d'évaluation, pas par le formulaire. Un questionnaire écrit avant la question mesure ce qui est facile à mesurer, pas ce qui est utile.",
      "Les validations et les sauts conditionnels ne se voient qu'à la saisie : testez à trois sur un vrai téléphone avant de déclarer le formulaire fini.",
      "Un âge en mois, une mesure de périmètre brachial et une date de naissance sont trois occasions de laisser passer une valeur absurde. Contraignez-les.",
      "Votre échantillon ne se justifie pas par « c'est ce qu'on nous a demandé » : dites ce qu'il permet de détecter, et ce qu'il ne permet pas.",
    ],
    maxScore: 100,
    briefUrl: "/academy/gw/GW1-enonce.pdf",
    templateUrl: "/academy/gw/GW1-modele-rapport.docx",
    plan: [
      { titre: "1. Cadrage de l'enquête", consigne: "Question d'évaluation, population cible, indicateurs nutritionnels retenus et pourquoi ceux-là." },
      { titre: "2. Le formulaire", consigne: "Structure, types de réponse, contraintes de validation et sauts conditionnels. Expliquez ce que chaque contrainte empêche." },
      { titre: "3. Plan d'échantillonnage", consigne: "Taille, méthode de tirage, base de sondage. Un échantillon non justifié est un échantillon non défendable." },
      { titre: "4. Test de terrain et limites", consigne: "Ce que vos 5 soumissions de test ont révélé, et ce que votre dispositif ne permettra pas de conclure." },
    ],
  },
  {
    index: 2,
    weekIndex: GROUP_WORK_WEEKS[1],
    cours: "MEAL-02 — Cartographie des bénéficiaires WASH",
    title: "GW2 — L'accès à l'eau des bénéficiaires WASH, en cartes",
    brief:
      "Le programme WASH veut savoir quels ménages bénéficiaires vivent à plus de 500 mètres d'un point " +
      "d'eau fonctionnel. À partir des points GPS collectés sous KoboCollect, votre groupe produit la carte " +
      "et l'analyse qui répondent à la question. On attend une analyse spatiale, pas une illustration.",
    deliverables: [
      "Carte thématique exportée (PNG ou PDF) : mise en page complète, légende, échelle, source et projection indiquées",
      "Analyse tampon (buffer 500 m) autour des points d'eau, avec le décompte des ménages situés hors zone",
      "Projet QGIS ou couches utilisées, dans l'archive du rendu",
      "Note de lecture (2 pages) : ce que montre la carte, ce qu'elle ne montre pas",
      "Répartition du travail entre les membres du groupe",
    ],
    conseils: [
      "Vérifiez la projection avant toute mesure de distance. Un tampon de 500 m calculé en degrés ne mesure rien.",
      "La discrétisation choisie change ce que la carte raconte : quantiles et seuils naturels ne donnent pas la même lecture. Choisissez, puis justifiez.",
      "Une carte sans échelle ni source n'est pas un document de travail — ces mentions ne sont pas décoratives.",
      "Méfiez-vous de l'effet de zone : une moyenne par quartier masque les écarts à l'intérieur du quartier.",
    ],
    maxScore: 100,
    briefUrl: "/academy/gw/GW2-enonce.pdf",
    templateUrl: "/academy/gw/GW2-modele-rapport.docx",
    plan: [
      { titre: "1. Données et préparation", consigne: "Sources, projection retenue, import des points GPS, nettoyages effectués. Quelqu'un doit pouvoir refaire vos cartes à partir de cette section." },
      { titre: "2. L'analyse tampon", consigne: "Comment vous avez construit les zones de 500 m, et combien de ménages tombent hors couverture. Donnez le chiffre." },
      { titre: "3. Choix cartographiques", consigne: "Variable représentée, discrétisation, symbologie, mise en page. Justifiez la discrétisation." },
      { titre: "4. Lecture et limites", consigne: "Ce que montre la carte — nommez les zones, chiffrez — puis ce qu'elle ne montre pas." },
    ],
  },
  {
    index: 3,
    weekIndex: GROUP_WORK_WEEKS[2],
    cours: "MEAL-03 — Système de reporting MEAL automatisé",
    title: "GW3 — La chaîne de reporting automatisée, de l'API au PDF",
    brief:
      "Dernier travail collectif du cursus. Votre groupe livre la chaîne complète : connexion à l'API " +
      "KoboToolbox, moteur d'analyse réutilisable, et rapport généré — tableaux, cartes, PDF — que l'on " +
      "peut relancer sans rouvrir le code. C'est la démonstration de bout en bout attendue d'un expert MEAL.",
    deliverables: [
      "Code de la chaîne (script ou notebook) : connexion à l'API Kobo, analyse, export du rapport",
      "Rapport généré automatiquement (PDF) comportant au moins un tableau et une carte",
      "Note technique : comment relancer la chaîne, ce qui est planifié, ce qui reste manuel",
      "Note d'éthique et de qualité des données (1 page) : anonymisation, consentement, contrôles appliqués",
      "Répartition du travail entre les membres du groupe",
    ],
    conseils: [
      "Une chaîne qu'il faut réalimenter à la main n'est pas automatisée. Dites-le plutôt que de le laisser croire — c'est la note technique qui est jugée, pas la promesse.",
      "N'écrivez jamais votre jeton d'API dans le code rendu. Un jeton dans une archive déposée est un jeton compromis.",
      "Écrivez le rapport pour quelqu'un qui n'a pas participé au projet : c'est le test qui révèle les raccourcis.",
      "Relancez votre chaîne une dernière fois sur une machine propre avant de déposer. Ce qui marche « chez soi » casse une fois sur deux ailleurs.",
    ],
    maxScore: 100,
    briefUrl: "/academy/gw/GW3-enonce.pdf",
    templateUrl: "/academy/gw/GW3-modele-rapport.docx",
    plan: [
      { titre: "1. Architecture de la chaîne", consigne: "De l'API Kobo au PDF : quelles étapes, quels outils, quels formats intermédiaires." },
      { titre: "2. Le moteur d'analyse", consigne: "Les indicateurs calculés, et ce qui rend le moteur réutilisable sur une autre enquête." },
      { titre: "3. Le rapport produit", consigne: "Ce que le rapport affiche, pour qui, à quelle fréquence. Cette section doit rester valable après une mise à jour des données." },
      { titre: "4. Éthique, qualité et limites", consigne: "Anonymisation, consentement, contrôles qualité — et ce qui reste manuel dans la chaîne." },
    ],
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
