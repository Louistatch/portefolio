/**
 * Clé de correction du test d'admission au parcours « finance climatique quantitative ».
 *
 * Sous api/, donc jamais incluse dans le paquet envoyé au navigateur. Les énoncés et les
 * options vivent dans shared/fcq-test.ts et partent bien côté client : c'est cette séparation
 * qui empêche un candidat de lire les réponses dans le code de la page.
 *
 * Deux tableaux, comme pour les autres parcours : les index servent à corriger, les textes
 * servent à vérifier au build que la clé n'a pas dérivé des énoncés. Réordonner les options
 * d'une question sans toucher à la clé désynchroniserait l'index en silence, et le test
 * continuerait de corriger — en se trompant.
 *
 * La clé est volontairement différente de celle du parcours analyste : un candidat qui a
 * passé les deux tests ne doit pas pouvoir réutiliser une suite de lettres mémorisée.
 */

export const FCQ_ANSWER_KEY: number[] = [
  1, 3, 0, 2, 3, 0, 2, 1, 0, 2, 3, 1, 2, 0, 1, 3, 0, 2, 3, 1,
];

/** Texte attendu de la bonne réponse, dans l'ordre des questions. Vérification seulement. */
export const FCQ_CORRECT_TEXTS: string[] = [
  "La somme de la colonne ead pour chaque valeur distincte de zone",
  "Il renvoie a là où la condition est vraie, et b partout ailleurs",
  "Elle affecte 0,75 à la colonne lgd, uniquement sur les lignes où le masque est vrai",
  "10 000 lignes et 3 colonnes",
  "La proportion de valeurs inférieures à 0,2, soit environ 0,2",
  "0,04",
  "0,85",
  "5 %",
  "20 millions FCFA",
  "0,512",
  "90 % des années, la perte reste inférieure à 50 millions",
  "Celui dont l'écart-type est le plus élevé connaît des années plus dispersées, donc de plus mauvais extrêmes",
  "La moyenne est supérieure à la médiane",
  "2 points",
  "L'encours exposé au moment du défaut",
  "25 000 FCFA",
  "Parce que la répartition des expositions et leurs dépendances diffèrent",
  "Pour qu'un tiers relançant le code retrouve exactement les mêmes chiffres",
  "L'annoncer explicitement comme hypothèse de travail",
  "Vérifier que le code retrouve le résultat déjà connu",
];
