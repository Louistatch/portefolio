/**
 * Banque de questions du test d'admission au parcours « finance climatique quantitative ».
 *
 * Énoncés et options seulement : la clé de correction vit sous api/fcq-answers.ts et ne part
 * jamais dans le navigateur.
 *
 * ── Ce que ce test mesure, et ce qu'il ne mesure pas ──
 *
 * Il porte sur les PRÉREQUIS, jamais sur le contenu du cours. Interroger sur la simulation
 * Monte Carlo avant de l'avoir enseignée ne mesurerait rien d'autre que ce que le candidat
 * savait déjà par ailleurs.
 *
 * Concrètement, il vérifie qu'un candidat peut suivre sans se noyer :
 *   — lire du pandas et du NumPy, pas en écrire ;
 *   — manier une probabilité élémentaire, une espérance, un complémentaire ;
 *   — lire un quantile, un écart-type, et distinguer un point de pourcentage d'un pourcentage ;
 *   — connaître le vocabulaire du crédit vu dans le parcours analyste (EAD, PD, LGD) ;
 *   — savoir ce qui rend un calcul vérifiable par un tiers.
 *
 * ── Pourquoi Python est en prérequis ici et absent du test FCA ──
 *
 * Les deux parcours visent des gens différents. Celui-ci suppose acquis ce que l'autre
 * n'exige nulle part. C'est la raison d'être de la séparation en deux tests, et donc en deux
 * parcours : un seul test ferait échouer des agents de crédit sur du code dont leur métier
 * n'a pas besoin.
 */

export interface QuestionFcq {
  domaine: string;
  q: string;
  opts: string[];
}

export const QUESTIONS_FCQ: QuestionFcq[] = [
  // ── Python et pandas : lire, pas écrire ────────────────────────────────────
  {
    domaine: "Python et pandas",
    q: "Que renvoie `df.groupby(\"zone\")[\"ead\"].sum()` ?",
    opts: [
      "La somme de toutes les colonnes numériques du tableau",
      "La somme de la colonne ead pour chaque valeur distincte de zone",
      "Le nombre de lignes présentes dans chaque zone",
      "La moyenne de la colonne ead pour chaque zone",
    ],
  },
  {
    domaine: "Python et pandas",
    q: "Que fait `np.where(condition, a, b)` ?",
    opts: [
      "Il renvoie les positions où la condition est vraie",
      "Il supprime du tableau les éléments ne vérifiant pas la condition",
      "Il trie le tableau selon la condition",
      "Il renvoie a là où la condition est vraie, et b partout ailleurs",
    ],
  },
  {
    domaine: "Python et pandas",
    q: "Que fait l'instruction `df.loc[masque, \"lgd\"] = 0.75` ?",
    opts: [
      "Elle affecte 0,75 à la colonne lgd, uniquement sur les lignes où le masque est vrai",
      "Elle affecte 0,75 à toute la colonne lgd",
      "Elle crée un nouveau tableau contenant seulement les lignes du masque",
      "Elle compare la colonne lgd à 0,75 et renvoie un booléen",
    ],
  },
  {
    domaine: "Python et pandas",
    q: "Quelle est la forme du tableau produit par `rng.random((10_000, 3))` ?",
    opts: [
      "3 lignes et 10 000 colonnes",
      "Un tableau à une dimension de 10 000 valeurs",
      "10 000 lignes et 3 colonnes",
      "30 000 valeurs tirées entre 0 et 3",
    ],
  },
  {
    domaine: "Python et pandas",
    q: "`arr` contient 10 000 tirages uniformes entre 0 et 1. Que vaut approximativement `(arr < 0.2).mean()` ?",
    opts: [
      "0, car une comparaison ne se moyenne pas",
      "La somme des valeurs inférieures à 0,2",
      "Le nombre de valeurs inférieures à 0,2, soit environ 2 000",
      "La proportion de valeurs inférieures à 0,2, soit environ 0,2",
    ],
  },

  // ── Probabilités ──────────────────────────────────────────────────────────
  {
    domaine: "Probabilités",
    q: "Deux zones connaissent une saison déficitaire indépendamment l'une de l'autre, avec une probabilité de 0,2 chacune. Quelle est la probabilité que les deux soient déficitaires la même année ?",
    opts: ["0,04", "0,40", "0,20", "0,36"],
  },
  {
    domaine: "Probabilités",
    q: "Un événement a une probabilité de 0,15. Quelle est la probabilité qu'il ne se produise pas ?",
    opts: ["0,15", "1,15", "0,85", "0,075"],
  },
  {
    domaine: "Probabilités",
    q: "Un événement climatique a une période de retour de 20 ans. Quelle est sa probabilité de survenue au cours d'une année donnée ?",
    opts: ["20 %", "5 %", "2 %", "0,5 %"],
  },
  {
    domaine: "Probabilités",
    q: "Une perte vaut 10 millions FCFA avec une probabilité de 0,8, et 60 millions avec une probabilité de 0,2. Quelle est la perte moyenne ?",
    opts: ["20 millions FCFA", "35 millions FCFA", "70 millions FCFA", "12 millions FCFA"],
  },
  {
    domaine: "Probabilités",
    q: "Trois zones sont déficitaires indépendamment, chacune avec une probabilité de 0,2. Quelle est la probabilité qu'aucune des trois ne le soit ?",
    opts: ["0,200", "0,600", "0,512", "0,488"],
  },

  // ── Statistique descriptive ───────────────────────────────────────────────
  {
    domaine: "Statistique descriptive",
    q: "Que signifie « le 90e centile des pertes annuelles vaut 50 millions FCFA » ?",
    opts: [
      "La perte moyenne est de 50 millions",
      "La perte ne peut jamais dépasser 50 millions",
      "90 % des années, la perte est exactement de 50 millions",
      "90 % des années, la perte reste inférieure à 50 millions",
    ],
  },
  {
    domaine: "Statistique descriptive",
    q: "Deux portefeuilles ont la même perte moyenne mais des écarts-types très différents. Que peut-on en conclure ?",
    opts: [
      "Ils présentent le même risque, puisque la moyenne est identique",
      "Celui dont l'écart-type est le plus élevé connaît des années plus dispersées, donc de plus mauvais extrêmes",
      "Celui dont l'écart-type est le plus élevé perd davantage en moyenne",
      "L'écart-type ne s'applique pas à des pertes",
    ],
  },
  {
    domaine: "Statistique descriptive",
    q: "Dans une distribution de pertes fortement étalée vers la droite, comment se situent la moyenne et la médiane ?",
    opts: [
      "Elles sont nécessairement égales",
      "La médiane est supérieure à la moyenne",
      "La moyenne est supérieure à la médiane",
      "Leur ordre dépend uniquement du nombre d'observations",
    ],
  },
  {
    domaine: "Statistique descriptive",
    q: "Une perte attendue passe de 4 % à 6 % de l'encours. De combien de POINTS de pourcentage a-t-elle augmenté ?",
    opts: ["2 points", "50 points", "2 %", "1,5 point"],
  },

  // ── Crédit et portefeuille ────────────────────────────────────────────────
  {
    domaine: "Crédit et portefeuille",
    q: "Dans le calcul d'une perte attendue, que désigne l'EAD ?",
    opts: [
      "Le taux d'intérêt appliqué au prêt",
      "L'encours exposé au moment du défaut",
      "La probabilité que l'emprunteur fasse défaut",
      "La part de l'encours perdue en cas de défaut",
    ],
  },
  {
    domaine: "Crédit et portefeuille",
    q: "Un prêt de 500 000 FCFA présente une probabilité de défaut de 10 % et une perte en cas de défaut de 50 %. Quelle est sa perte attendue ?",
    opts: ["50 000 FCFA", "250 000 FCFA", "5 000 FCFA", "25 000 FCFA"],
  },
  {
    domaine: "Crédit et portefeuille",
    q: "Deux portefeuilles affichent le même encours et la même perte attendue. Pourquoi leur risque peut-il être très différent ?",
    opts: [
      "Parce que la répartition des expositions et leurs dépendances diffèrent",
      "Parce que leurs taux d'intérêt diffèrent",
      "Ce n'est pas possible : même encours et même perte attendue impliquent le même risque",
      "Parce que l'un des deux est plus ancien que l'autre",
    ],
  },

  // ── Méthode et rigueur ────────────────────────────────────────────────────
  {
    domaine: "Méthode et rigueur",
    q: "Pourquoi fixe-t-on la graine d'un générateur aléatoire dans une analyse destinée à un comité ?",
    opts: [
      "Pour accélérer le calcul",
      "Pour éviter que la simulation ne produise des valeurs extrêmes",
      "Pour qu'un tiers relançant le code retrouve exactement les mêmes chiffres",
      "Pour améliorer la précision de la simulation",
    ],
  },
  {
    domaine: "Méthode et rigueur",
    q: "Dans une note d'analyse, comment traiter une valeur issue d'un dire d'expert plutôt que d'une source publiée ?",
    opts: [
      "La présenter comme une donnée : la provenance importe peu si la valeur est plausible",
      "L'omettre, faute de source",
      "L'arrondir fortement pour ne pas donner une fausse impression de précision",
      "L'annoncer explicitement comme hypothèse de travail",
    ],
  },
  {
    domaine: "Méthode et rigueur",
    q: "Vous refaites en Python un calcul déjà mené au tableur. Quel contrôle effectuer en premier ?",
    opts: [
      "Comparer les temps d'exécution des deux méthodes",
      "Vérifier que le code retrouve le résultat déjà connu",
      "Augmenter le nombre de décimales affichées",
      "Refaire le calcul avec une autre bibliothèque pour comparer",
    ],
  },
];
