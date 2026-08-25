// ══════════════ Parcours de l'Academy ══════════════
//
// Un « parcours » regroupe les cours qui mènent à un même titre. La notion n'existait
// nulle part : le tableau de bord alignait les 4 cours publiés dans une grille unique,
// si bien qu'un étudiant venu pour le MEAL voyait la formation de formateurs ruraux au
// même rang que ses propres cours, sans savoir lequel comptait pour son certificat.
//
// Le rattachement se fait par préfixe de code — même convention que la délivrance du
// certificat final dans api/index.ts — pour éviter une colonne de plus en base et le
// risque qu'elle diverge du code.

export type Program = {
  id: string;
  prefix: string;
  title: string;
  subtitle: string;
  /** Titre délivré à l'achèvement du parcours, ou null si le parcours n'en délivre pas. */
  credential: string | null;
  /** Ce qu'on sait faire à la sortie — affiché sous le titre du parcours. */
  outcome: string;
  accent: string;
  /**
   * Leçons ouvertes par semaine à l'intérieur du parcours.
   *
   * Les cours d'un même parcours s'enchaînent en séquence — on termine MEAL-01 avant
   * d'entamer MEAL-02 — tandis que les parcours, eux, avancent en parallèle. Reste à
   * faire tenir la séquence dans la fenêtre d'admission de 3 mois, soit 13 semaines :
   * le cursus MEAL compte 20 leçons, ce qui impose 2 leçons par semaine (10 semaines) ;
   * la formation de formateurs en compte 12 et tient à 1 par semaine (12 semaines).
   */
  lessonsPerWeek: number;
  /**
   * Admission propre au parcours.
   *
   * `surStudents` distingue les deux mécanismes de stockage. Le cursus MEAL est porté par les
   * colonnes historiques de `students` (admitted_at, entry_score…), lues en une trentaine
   * d'endroits ; les autres parcours par la table academy_program_admissions. Une seule
   * fonction côté serveur sait où regarder — voir admissionParcours() dans api/index.ts.
   */
  admission: {
    nbQuestions: number;
    /** Bonnes réponses exigées. */
    seuil: number;
    surStudents: boolean;
  };
};

export const PROGRAMS: Program[] = [
  {
    id: "meal",
    prefix: "MEAL-",
    title: "Cursus MEAL",
    subtitle: "Trois projets terrain, de la collecte au rapport automatisé",
    credential: "Certificat Super-Expert MEAL",
    outcome: "Concevoir une collecte, cartographier les résultats, automatiser le reporting.",
    accent: "#0d9488",
    lessonsPerWeek: 2,
    admission: { nbQuestions: 30, seuil: 21, surStudents: true },
  },
  {
    id: "tof",
    prefix: "TOF-",
    title: "Formation de formateurs",
    subtitle: "Animer en milieu rural, avec les outils du terrain",
    // LouisFarm délivre deux titres finaux. Celui-ci n'a rien à voir avec le cursus MEAL :
    // autre public, autre métier, autre test d'admission.
    credential: "Certificat de Formateur en Gestion Financière Paysanne",
    outcome: "Concevoir et animer des sessions adaptées aux réalités paysannes.",
    accent: "#7c3aed",
    lessonsPerWeek: 1,
    // Quinze questions et non trente : le public visé anime sur le terrain et n'est pas
    // toujours à l'aise avec un questionnaire en ligne. Le seuil reste à 70 %.
    admission: { nbQuestions: 15, seuil: 11, surStudents: false },
  },
  {
    id: "fca",
    prefix: "FCA-",
    title: "Finance climatique agricole",
    subtitle: "Chiffrer ce qu'une mauvaise saison coûte à un portefeuille de crédit",
    // Troisième titre délivré par LouisFarm. Public distinct des deux autres : agents de
    // crédit, chargés de portefeuille de SFD, cadres de coopératives et de faîtières.
    credential: "Certificat d'Analyste du Risque Climatique Agricole",
    outcome: "Calculer une perte attendue, mesurer une concentration, auditer un produit indiciel, écrire la note qui débloque un financement.",
    accent: "#b45309",
    lessonsPerWeek: 1,
    // Le parcours analyste ne suppose aucun code : le test d'admission porte sur le crédit
    // et l'arithmétique financière, pas sur Python. Vingt questions, seuil à 70 %.
    admission: { nbQuestions: 20, seuil: 14, surStudents: false },
  },
  {
    id: "fcq",
    prefix: "FCQ-",
    title: "Finance climatique quantitative",
    subtitle: "Le portefeuille prêt par prêt : simulation, corrélation, risque de base",
    // Second niveau de la même discipline que « fca », et non un quatrième domaine. Deux
    // conséquences assumées :
    //
    //   — l'accent est un cran plus sombre du MÊME ambre. Une quatrième teinte catégorielle
    //     se séparant des trois autres sous daltonisme n'existe pas une fois teal, violet et
    //     ambre pris : toutes les candidates échouent au contrôle de séparation. Regrouper
    //     les deux niveaux d'une même discipline est la sortie honnête, et c'est aussi la
    //     plus juste — ce sont bien deux niveaux, pas deux domaines ;
    //
    //   — c'est malgré tout un PARCOURS à part, pas un cours de plus sous « fca ».
    //     grantProgramAdmission inscrit à tous les cours portant le préfixe du parcours : un
    //     cours Python nommé FCA-02 s'ouvrirait donc automatiquement à quiconque a réussi un
    //     test explicitement sans code.
    credential: "Certificat de Quantitativiste du Risque Climatique Agricole",
    outcome: "Simuler une distribution de pertes, chiffrer l'effet de la corrélation entre zones, auditer le risque de base d'un produit indiciel, produire un notebook auditable.",
    accent: "#7c2d12",
    lessonsPerWeek: 1,
    // Python est un PRÉREQUIS, pas un objectif : le test porte sur ce qu'il faut déjà
    // savoir faire — lire du pandas, une probabilité, un quantile. Vingt questions, 70 %.
    admission: { nbQuestions: 20, seuil: 14, surStudents: false },
  },
];

/** Parcours auquel appartient un cours, d'après son code. */
export function programOf(code: string | null | undefined): Program | null {
  if (!code) return null;
  return PROGRAMS.find(p => code.startsWith(p.prefix)) ?? null;
}

export type CourseLike = { id: number; code: string; order_index?: number };

export type ProgramGroup<T extends CourseLike> = {
  program: Program;
  courses: T[];
};

/**
 * Répartit des cours par parcours, dans l'ordre déclaré de PROGRAMS.
 * Un cours dont le code ne correspond à aucun préfixe n'est pas perdu : il est
 * rassemblé dans un parcours « Autres », pour qu'ajouter un cours au catalogue
 * sans toucher à ce fichier ne le fasse pas disparaître du tableau de bord.
 */
export function groupByProgram<T extends CourseLike>(courses: T[]): ProgramGroup<T>[] {
  const groups: ProgramGroup<T>[] = [];
  const orphans: T[] = [];

  for (const course of courses) {
    const program = programOf(course.code);
    if (!program) { orphans.push(course); continue; }
    let group = groups.find(g => g.program.id === program.id);
    if (!group) { group = { program, courses: [] }; groups.push(group); }
    group.courses.push(course);
  }

  groups.sort((a, b) =>
    PROGRAMS.findIndex(p => p.id === a.program.id) - PROGRAMS.findIndex(p => p.id === b.program.id));

  if (orphans.length) {
    groups.push({
      program: {
        id: "autres", prefix: "", title: "Autres formations",
        subtitle: "Cours hors parcours", credential: null,
        outcome: "", accent: "#64748b", lessonsPerWeek: 1,
        admission: { nbQuestions: 30, seuil: 21, surStudents: true },
      },
      courses: orphans,
    });
  }
  return groups;
}

/** Parcours par identifiant. Lève si l'identifiant est inconnu : un parcours mal nommé
 *  doit se voir au premier appel, pas se traduire par une admission silencieusement absente. */
export function programById(id: string): Program {
  const p = PROGRAMS.find(x => x.id === id);
  if (!p) throw new Error(`Parcours inconnu : ${id}`);
  return p;
}
