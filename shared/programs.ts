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
  },
  {
    id: "tof",
    prefix: "TOF-",
    title: "Formation de formateurs",
    subtitle: "Animer en milieu rural, avec les outils du terrain",
    credential: null,
    outcome: "Concevoir et animer des sessions adaptées aux réalités paysannes.",
    accent: "#7c3aed",
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
        outcome: "", accent: "#64748b",
      },
      courses: orphans,
    });
  }
  return groups;
}
