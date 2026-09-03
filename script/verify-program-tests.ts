/**
 * Contrôle la qualité des tests d'admission propres à un parcours.
 *
 *   npx tsx script/verify-program-tests.ts
 *
 * Un QCM peut être parfaitement rédigé et rester inutile : si la bonne réponse occupe presque
 * toujours la même position, répondre « B » partout suffit à passer. C'est arrivé lors de la
 * rédaction du test de la formation de formateurs — la bonne réponse tombait en deuxième
 * position pour treize questions sur quinze, soit 13/15 à l'aveugle pour un seuil de 11.
 *
 * Ce script remplace verify-tof-test.ts, qui ne couvrait qu'un parcours : à l'arrivée du
 * troisième test, une copie du script serait devenue une copie à maintenir, et c'est
 * exactement ainsi qu'un contrôle finit par ne plus contrôler que la moitié des cas.
 *
 * Les clés de correction sont importées depuis api/, jamais recopiées : un contrôle qui vise
 * sa propre copie ne contrôle rien.
 */
import { existsSync, readFileSync, readdirSync } from "fs";
import { programById } from "../shared/programs.js";
import { QUESTIONS_TOF } from "../shared/tof-test.js";
import { QUESTIONS_FCA } from "../shared/fca-test.js";
import { QUESTIONS_FCQ } from "../shared/fcq-test.js";
import { QUESTIONS_SCOOPS } from "../shared/scoops-test.js";
import { TOF_ANSWER_KEY, TOF_CORRECT_TEXTS } from "../api/tof-answers.js";
import { FCA_ANSWER_KEY, FCA_CORRECT_TEXTS } from "../api/fca-answers.js";
import { FCQ_ANSWER_KEY, FCQ_CORRECT_TEXTS } from "../api/fcq-answers.js";
import { SCOOPS_ANSWER_KEY, SCOOPS_CORRECT_TEXTS } from "../api/scoops-answers.js";

const LETTRES = ["A", "B", "C", "D"];

type Question = { domaine: string; q: string; opts: string[] };

interface Suite {
  programId: string;
  questions: Question[];
  cle: number[];
  textes: string[];
  /** Thèmes que le test doit couvrir — sinon un pan du métier passe à la trappe. */
  themesAttendus: string[];
}

const SUITES: Suite[] = [
  {
    programId: "tof",
    questions: QUESTIONS_TOF,
    cle: TOF_ANSWER_KEY,
    textes: TOF_CORRECT_TEXTS,
    themesAttendus: ["Andragogie", "Animation", "Budget familial", "Épargne",
      "Épargne communautaire", "Tontines", "Crédit agricole", "Planification de campagne"],
  },
  {
    programId: "fca",
    questions: QUESTIONS_FCA,
    cle: FCA_ANSWER_KEY,
    textes: FCA_CORRECT_TEXTS,
    themesAttendus: ["Vocabulaire du crédit", "Calcul", "Campagne agricole",
      "Microfinance", "Lecture de données"],
  },
  {
    programId: "fcq",
    questions: QUESTIONS_FCQ,
    cle: FCQ_ANSWER_KEY,
    textes: FCQ_CORRECT_TEXTS,
    themesAttendus: ["Python et pandas", "Probabilités", "Statistique descriptive",
      "Crédit et portefeuille", "Méthode et rigueur"],
  },
  {
    programId: "scoops",
    questions: QUESTIONS_SCOOPS,
    cle: SCOOPS_ANSWER_KEY,
    textes: SCOOPS_CORRECT_TEXTS,
    // Aucun thème ne porte sur l'Acte uniforme : le test vérifie les PRÉREQUIS du parcours
    // — savoir lire un texte réglementaire, connaître la vie d'une assemblée, compter — et
    // non son contenu, qui s'apprend pendant les huit semaines.
    themesAttendus: ["Formes juridiques", "Lecture d'un texte", "Vie associative",
      "Calcul et pourcentages", "Gestion et comptes"],
  },
];

let ko = 0;

for (const s of SUITES) {
  const parcours = programById(s.programId);
  const seuil = parcours.admission.seuil;
  const n = s.questions.length;

  console.log(`\n── ${parcours.title} (${s.programId}) — ${n} questions, seuil ${seuil} ──`);
  const v = (nom: string, ok: boolean, detail = "") => {
    if (!ok) ko++;
    console.log(`  ${ok ? "ok " : "KO "} ${nom}${ok ? "" : "  " + detail}`);
  };

  // ── Cohérence de structure ──────────────────────────────────────────────────
  v("nombre de questions conforme au parcours", n === parcours.admission.nbQuestions,
    `${n} pour ${parcours.admission.nbQuestions} déclarées`);
  v("une réponse par question dans la clé", s.cle.length === n, `clé de ${s.cle.length}`);
  v("autant de textes attendus que de questions", s.textes.length === n, `${s.textes.length} textes`);
  v("quatre options partout", s.questions.every(q => q.opts.length === 4));
  v("aucune option vide ou dupliquée",
    s.questions.every(q => q.opts.every(o => o.trim().length > 0) && new Set(q.opts).size === 4));
  v("aucun énoncé dupliqué", new Set(s.questions.map(q => q.q)).size === n);
  v("chaque réponse pointe une option existante",
    s.cle.every(i => Number.isInteger(i) && i >= 0 && i < 4));

  // Contrôle croisé index / texte : rattrape une réorganisation des options faite sans
  // toucher à la clé — l'index seul se serait tu et le test aurait mal corrigé.
  const desyncs = s.questions
    .map((q, i) => ({ i, attendu: s.textes[i], reel: q.opts[s.cle[i]] }))
    .filter(x => x.attendu !== x.reel);
  v("clé et énoncés synchronisés", desyncs.length === 0,
    desyncs.map(d => `Q${d.i + 1} : la clé pointe « ${d.reel} », attendu « ${d.attendu} »`).join(" | "));

  // Le seuil doit rester atteignable et exigeant : 70 % arrondi au supérieur.
  v("seuil cohérent avec 70 %", seuil === Math.ceil(n * 0.7), `seuil ${seuil}, attendu ${Math.ceil(n * 0.7)}`);

  // ── Aucune stratégie aveugle ne doit passer ─────────────────────────────────
  const parPosition = [0, 1, 2, 3].map(pos => s.cle.filter(k => k === pos).length);
  parPosition.forEach((score, pos) => {
    v(`répondre « ${LETTRES[pos]} » partout échoue`, score < seuil,
      `donnerait ${score}/${n} pour un seuil de ${seuil}`);
  });

  // Une clé périodique se repère aussi vite qu'une position dominante : si elle se répète
  // tous les k rangs, observer les k premières réponses suffit à deviner le reste.
  for (let k = 1; k <= 5; k++) {
    const periodique = s.cle.every((val, i) => val === s.cle[i % k]);
    v(`clé non périodique de période ${k}`, !periodique, `se répète tous les ${k} rangs`);
  }

  let serie = 1, serieMax = 1;
  for (let i = 1; i < s.cle.length; i++) {
    serie = s.cle[i] === s.cle[i - 1] ? serie + 1 : 1;
    serieMax = Math.max(serieMax, serie);
  }
  v("aucune série de plus de 2 réponses identiques", serieMax <= 2, `série de ${serieMax}`);

  // ── Couverture des thèmes ───────────────────────────────────────────────────
  const domaines = new Map<string, number>();
  for (const q of s.questions) domaines.set(q.domaine, (domaines.get(q.domaine) ?? 0) + 1);
  const manquants = s.themesAttendus.filter(d => !domaines.has(d));
  v("tous les thèmes attendus sont représentés", manquants.length === 0,
    `manquants : ${manquants.join(", ")}`);
  const inattendus = [...domaines.keys()].filter(d => !s.themesAttendus.includes(d));
  v("aucun thème hors liste", inattendus.length === 0, `en trop : ${inattendus.join(", ")}`);

  console.log(`     positions ${LETTRES.map((l, i) => `${l}:${parPosition[i]}`).join("  ")}`);
  console.log(`     thèmes    ${[...domaines].map(([d, c]) => `${d} (${c})`).join(", ")}`);
}

// ── La clé de correction reste-t-elle côté serveur ? ──────────────────────────
//
// Les clés vivent sous api/ précisément pour ne jamais partir dans le navigateur. Rien
// n'empêche pourtant quelqu'un d'importer api/fca-answers.ts depuis un fichier client :
// le site continuerait de fonctionner, le test continuerait de corriger, et la clé serait
// lisible dans le paquet pour qui l'ouvre. Aucune erreur, aucun symptôme — d'où ce contrôle.
//
// Il ne peut s'exécuter qu'après un build, donc il est sauté si dist/public n'existe pas
// plutôt que de faire échouer un contrôle lancé seul.
if (existsSync("dist/public/assets")) {
  console.log("\n── Étanchéité de la clé (paquet client) ──");
  const v = (nom: string, ok: boolean, detail = "") => {
    if (!ok) ko++;
    console.log(`  ${ok ? "ok " : "KO "} ${nom}${ok ? "" : "  " + detail}`);
  };

  const paquet = readdirSync("dist/public/assets")
    .filter(f => f.endsWith(".js"))
    .map(f => readFileSync(`dist/public/assets/${f}`, "utf8"))
    .join("\n");

  for (const s of SUITES) {
    // Un texte court comme « 70 % » se retrouve légitimement ailleurs sur le site : le
    // compter en double signalerait une fuite inexistante. Seuls les textes assez longs
    // pour être uniques servent à ce contrôle.
    const distinctifs = s.textes.filter(t => t.length >= 30);
    const doubles = distinctifs.filter(t => paquet.split(t).length - 1 > 1);
    v(`${s.programId} : aucune bonne réponse répétée dans le paquet`, doubles.length === 0,
      `${doubles.length} texte(s) présent(s) deux fois — un corrigé embarqué ?`);

    // Signature d'un tableau de clés embarqué : deux bonnes réponses de questions
    // différentes qui se suivent immédiatement, séparées par une virgule et des guillemets.
    let colles = 0;
    for (let i = 0; i + 1 < s.textes.length; i++) {
      const a = paquet.indexOf(s.textes[i]);
      const b = paquet.indexOf(s.textes[i + 1]);
      if (a >= 0 && b > a && b - (a + s.textes[i].length) < 8) colles++;
    }
    v(`${s.programId} : aucune bonne réponse accolée à la suivante`, colles === 0,
      `${colles} paire(s) consécutive(s)`);
  }
} else {
  console.log("\n(étanchéité du paquet non vérifiée : lancez d'abord npm run build:vercel)");
}

console.log(ko === 0 ? "\nTOUT PASSE" : `\n${ko} ÉCHEC(S)`);
process.exit(ko ? 1 : 0);
