// ══════════════ Exercices de leçon (pédagogie « faire faire ») ══════════════
// Une leçon peut contenir des cellules { type: "exercise" } : l'étudiant produit une réponse
// (calcul, choix, saisie) et le serveur la corrige. Le corrigé vit dans le contenu en base et
// n'est JAMAIS envoyé au client — même logique anti-triche que le test d'admission.
//
// Logique isolée ici plutôt que dans api/index.ts pour être typée, relue et testée à part.

export const EXERCISE_PASS_PCT = 70;

/** Un paramètre tiré au hasard dans [min, max] pour un exercice paramétré. */
export type Parametre = { nom: string; min: number; max: number; decimales?: number };

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
  /**
   * Exercice paramétré : `answer` n'est plus figé, il se calcule à partir d'un tirage de
   * ces paramètres par `formule`. `prompt`, `hint` et `explain` peuvent référencer un
   * paramètre par `{{nom}}`, remplacé par sa valeur tirée avant envoi au navigateur. Voir
   * materialiserExercicesParametres.
   */
  parametres?: Parametre[];
  formule?: string;
};

export type ExerciseResult = { id: string; correct: boolean; explain: string | null };

/**
 * Tentatives tolérées avant que la note ne soit plafonnée.
 *
 * Deux, et pas une. Une connexion qui lâche au moment de l'envoi, un doigt qui
 * valide trop tôt sur un écran de 390 px, une consigne relue de travers : la
 * première reprise ne dit rien du savoir, elle dit le contexte. La troisième,
 * si — surtout après avoir vu quels items étaient faux.
 */
export const TENTATIVES_SANS_PENALITE = 2;

/**
 * Plafond de la note selon le rang de la tentative qui réussit.
 *
 * Le plancher est le seuil de validation lui-même : la persévérance valide
 * toujours la leçon, elle cesse seulement de valoir autant que la maîtrise. Une
 * leçon qu'on ne pourrait plus valider après cinq essais serait un cul-de-sac,
 * et c'est le cursus entier qui se refermerait derrière.
 */
export function plafondDeNote(tentative: number): number {
  if (tentative <= TENTATIVES_SANS_PENALITE) return 100;
  const paliers = [90, 80];
  return paliers[tentative - TENTATIVES_SANS_PENALITE - 1] ?? EXERCISE_PASS_PCT;
}

/**
 * Ce qu'on renvoie à l'étudiant qui n'a PAS atteint le seuil.
 *
 * ── La faille que cette fonction ferme ──
 *
 * L'échec renvoyait `explain` pour tous les exercices, ratés compris. Or la
 * correction énonce la bonne réponse en toutes lettres — « c'est la colonne
 * label ». Un échec volontaire était donc le moyen le plus rapide d'obtenir le
 * corrigé complet, et rien n'étant enregistré, la note finale ne gardait aucune
 * trace du détour.
 *
 * ── Pourquoi ne pas simplement tout masquer ──
 *
 * Parce que la correction est ce que le dispositif a de meilleur : les 146
 * exercices en ont une, ce qui est rare. On ne la supprime pas, on la DÉPLACE au
 * moment où elle est méritée — la réussite. Avant cela l'étudiant sait quels
 * items sont faux, ce qui suffit à reprendre, et l'indice reste affiché puisqu'il
 * était écrit pour être lu avant de répondre.
 */
export function resultatsSansCorrection(results: ExerciseResult[]): ExerciseResult[] {
  return results.map(r => ({ id: r.id, correct: r.correct, explain: null }));
}


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
      // `parametres`/`formule` n'ont normalement plus lieu d'être ici : un exercice
      // paramétré doit avoir été matérialisé par materialiserExercicesParametres avant
      // d'arriver jusqu'ici. Les retirer quand même est la seconde barrière, pas la
      // première — la formule est aussi révélatrice que la réponse elle-même.
      const { answer, accept, tolerance, explain, parametres, formule, ...safe } = c;
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

// ══════════════ Exercices paramétrés ══════════════
//
// Un exercice paramétré tire des valeurs au hasard (un montant de portefeuille, un taux de
// défaut) et calcule la bonne réponse à partir d'elles, plutôt que de la figer une fois pour
// toutes. Sans quoi un étudiant qui repasse une leçon échouée retrouve exactement le même
// énoncé, et la seconde tentative teste sa mémoire du résultat plutôt que sa maîtrise de la
// méthode — l'idée vient d'un prototype Lovable, retenue parce qu'elle prolonge exactement
// ce que gradeLessonExercises protège déjà.
//
// ── Pourquoi pas eval() ou new Function() ──
//
// La formule est écrite par un auteur de cours dans le panneau d'administration, donc en
// principe de confiance — mais « en principe » n'est pas une raison d'ouvrir l'exécution de
// code arbitraire quand un petit interpréteur arithmétique suffit et se laisse VALIDER : une
// formule malformée doit produire une erreur de validation lisible, jamais une exception
// serveur ni, pire, une porte vers autre chose que + - * / ^ et des nombres.

/** Tokenise une formule arithmétique : nombres, identifiants, opérateurs, parenthèses. */
type Jeton = { t: "nombre"; v: number } | { t: "id"; nom: string } | { t: "op"; op: string };

function tokeniser(expr: string): Jeton[] {
  const jetons: Jeton[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      const brut = expr.slice(i, j);
      const v = Number(brut);
      if (!Number.isFinite(v)) throw new Error(`nombre invalide « ${brut} »`);
      jetons.push({ t: "nombre", v });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) j++;
      jetons.push({ t: "id", nom: expr.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/^()".includes(c)) { jetons.push({ t: "op", op: c }); i++; continue; }
    throw new Error(`caractère inattendu « ${c} »`);
  }
  return jetons;
}

/** Les paramètres qu'une formule référence, sans l'évaluer — sert à la validation. */
export function identifiantsDeFormule(expr: string): string[] {
  const jetons = tokeniser(expr);
  const noms = jetons.filter((j): j is { t: "id"; nom: string } => j.t === "id").map(j => j.nom);
  return Array.from(new Set(noms));
}

/**
 * Évalue une formule arithmétique (+ - * / ^, parenthèses, identifiants) contre un
 * dictionnaire de valeurs. Un identifiant absent du dictionnaire lève une erreur plutôt que
 * de silencieusement produire NaN — c'est ce qui rend l'erreur détectable à la validation
 * plutôt qu'au moment où un étudiant tombe dessus.
 */
export function evaluerFormule(expr: string, valeurs: Record<string, number>): number {
  const jetons = tokeniser(expr);
  let pos = 0;
  const voir = () => jetons[pos];
  const avancer = () => jetons[pos++];

  function primaire(): number {
    const j = voir();
    if (!j) throw new Error("expression incomplète");
    if (j.t === "nombre") { avancer(); return j.v; }
    if (j.t === "id") {
      avancer();
      if (!(j.nom in valeurs)) throw new Error(`paramètre « ${j.nom} » non défini`);
      return valeurs[j.nom];
    }
    if (j.t === "op" && j.op === "(") {
      avancer();
      const v = expression();
      const fermante = avancer();
      if (!fermante || fermante.t !== "op" || fermante.op !== ")") throw new Error("parenthèse fermante attendue");
      return v;
    }
    if (j.t === "op" && j.op === "-") { avancer(); return -unaire(); }
    if (j.t === "op" && j.op === "+") { avancer(); return unaire(); }
    throw new Error(`jeton inattendu « ${j.t === "op" ? j.op : ""} »`);
  }
  function unaire(): number { return primaire(); }
  function puissance(): number {
    const base = unaire();
    const j = voir();
    if (j && j.t === "op" && j.op === "^") { avancer(); return Math.pow(base, puissance()); }
    return base;
  }
  function terme(): number {
    let v = puissance();
    for (;;) {
      const j = voir();
      if (j && j.t === "op" && (j.op === "*" || j.op === "/")) {
        avancer();
        const d = puissance();
        v = j.op === "*" ? v * d : v / d;
      } else break;
    }
    return v;
  }
  function expression(): number {
    let v = terme();
    for (;;) {
      const j = voir();
      if (j && j.t === "op" && (j.op === "+" || j.op === "-")) {
        avancer();
        const d = terme();
        v = j.op === "+" ? v + d : v - d;
      } else break;
    }
    return v;
  }

  const resultat = expression();
  if (pos < jetons.length) throw new Error("caractères en trop après l'expression");
  return resultat;
}

/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) : la même graine produit toujours
 * la même suite. C'est ce qui permet de tirer les mêmes valeurs deux fois — une pour
 * l'énoncé envoyé au navigateur, une pour la correction calculée côté serveur — sans avoir
 * à stocker le tirage nulle part entre les deux.
 */
function rngSeeded(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Réduit une chaîne en un entier 32 bits — sert à combiner un identifiant et un texte en une seule graine. */
function hacherChaine(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}

/**
 * La graine d'un exercice paramétré, à partir de ce qui identifie la TENTATIVE en cours.
 *
 * `base` vaut typiquement l'étudiant × la leçon × le nombre de tentatives déjà faites :
 * une nouvelle tentative change `base`, donc change les valeurs, sans qu'il soit besoin de
 * stocker quoi que ce soit — le nombre de tentatives est déjà en base
 * (lesson_progress.tentatives), c'est la seule information qui manquait pour retrouver le
 * même tirage à l'énoncé et à la correction.
 */
export function graineExercice(base: number, exerciseId: string): number {
  return hacherChaine(`${base}:${exerciseId}`);
}

/** Tire une valeur pour chaque paramètre déclaré, dans son intervalle, avec ses décimales. */
export function tirerValeurs(parametres: Parametre[], graine: number): Record<string, number> {
  const rng = rngSeeded(graine);
  const valeurs: Record<string, number> = {};
  for (const p of parametres) {
    const brut = p.min + rng() * (p.max - p.min);
    const d = p.decimales ?? 0;
    const echelle = 10 ** d;
    valeurs[p.nom] = Math.round(brut * echelle) / echelle;
  }
  return valeurs;
}

function formaterValeur(v: number): string {
  return v.toLocaleString("fr-FR");
}

function substituerParametres(texte: string | undefined, valeurs: Record<string, number>): string | undefined {
  if (!texte) return texte;
  return texte.replace(/\{\{(\w+)\}\}/g, (motif, nom) => nom in valeurs ? formaterValeur(valeurs[nom]) : motif);
}

/**
 * Remplace chaque exercice paramétré d'une leçon par sa version concrète pour UN tirage
 * donné : `{{nom}}` résolu dans l'énoncé/l'indice/l'explication, et `answer` calculée par
 * la formule. Les exercices ordinaires traversent inchangés.
 *
 * Appelée deux fois avec le même `grainesBase` — une pour ce qui part au navigateur (avant
 * stripExerciseAnswers), une pour ce que le serveur corrige — les deux appels tirent
 * exactement les mêmes valeurs.
 */
export function materialiserExercicesParametres(content: any, grainesBase: number): any {
  if (!Array.isArray(content?.cells)) return content;
  return {
    ...content,
    cells: content.cells.map((c: any, i: number) => {
      if (c?.type !== "exercise" || !Array.isArray(c.parametres) || !c.parametres.length || !c.formule) return c;
      const id = exerciseId(c, i);
      const graine = graineExercice(grainesBase, id);
      const valeurs = tirerValeurs(c.parametres, graine);
      let answer: number;
      try { answer = evaluerFormule(c.formule, valeurs); } catch { answer = NaN; }
      const { parametres, formule, ...reste } = c;
      return {
        ...reste,
        prompt: substituerParametres(c.prompt, valeurs),
        hint: substituerParametres(c.hint, valeurs),
        explain: substituerParametres(c.explain, valeurs),
        answer,
      };
    }),
  };
}
