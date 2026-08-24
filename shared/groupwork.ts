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

/** Taille visée d'un groupe. Au-delà, la répartition automatique ouvre un nouveau groupe. */
export const GROUP_MAX_MEMBERS = 4;

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
