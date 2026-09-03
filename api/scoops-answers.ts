/**
 * Clé de correction du test d'admission du parcours « droit coopératif OHADA ».
 *
 * Sous api/, donc jamais incluse dans le paquet envoyé au navigateur. Les énoncés et les
 * options vivent dans shared/scoops-test.ts et partent bien côté client : c'est cette
 * séparation qui empêche un candidat de lire les réponses dans le code de la page.
 *
 * Deux tableaux, même raison que pour les autres parcours : les index servent à corriger,
 * les textes servent à vérifier au build que la clé n'a pas dérivé des énoncés. Réordonner
 * les options d'une question sans toucher à la clé désynchroniserait l'index en silence, et
 * le test continuerait de corriger — en se trompant.
 */

export const SCOOPS_ANSWER_KEY: number[] = [
  2, 0, 3, 1, 0, 2, 1, 3, 3, 1, 2, 0, 1, 3, 0, 2, 3, 1, 0, 2,
];

/** Texte attendu de la bonne réponse, dans l'ordre des questions. Vérification seulement. */
export const SCOOPS_CORRECT_TEXTS: string[] = [
  "Un groupement doté d'une existence juridique propre, distincte de celle de ses membres",
  "Il n'a pas de personnalité juridique, donc il ne peut être titulaire d'un compte",
  "La première vise à dégager et partager un bénéfice, la seconde vise d'abord à servir ses membres",
  "Par un vote où toutes les voix ont le même poids",
  "On ne peut écarter ces dispositions par un accord privé, sauf là où le texte le permet lui-même",
  "Un dossier auquel manque l'une de ces pièces doit être refusé",
  "Elle est supplétive : elle ne s'applique que si les statuts sont muets",
  "Non : les conditions sont cumulatives et le chiffre d'affaires reste sous le seuil",
  "À exiger qu'un nombre minimum de membres soit présent ou représenté pour délibérer valablement",
  "Un mandat, ou procuration",
  "La date et le lieu, les membres présents ou représentés, l'ordre du jour, les résolutions mises aux voix et le résultat des votes",
  "Que sa dissolution puisse être demandée en justice pour défaut de fonctionnement",
  "3 360 000 F",
  "24",
  "400 000 F",
  "100 000 F",
  "L'excédent de l'exercice, avant toute affectation",
  "Une dépense non justifiée n'est pas contrôlable et expose le responsable à devoir en rendre compte",
  "Pour apprécier sa capacité à rembourser et la régularité de sa gestion",
  "Qu'aucun membre ne peut en obtenir une part, ni en cours de vie ni en partant",
];
