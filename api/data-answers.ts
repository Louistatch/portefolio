/**
 * Clé de correction du test d'admission du parcours « Data Analytics ».
 *
 * Sous api/, donc jamais incluse dans le paquet envoyé au navigateur. Les énoncés et les
 * options vivent dans shared/data-test.ts et partent bien côté client : c'est cette
 * séparation qui empêche un candidat de lire les réponses dans le code de la page.
 *
 * Deux tableaux, même raison que pour les autres parcours : les index servent à corriger,
 * les textes servent à vérifier au build que la clé n'a pas dérivé des énoncés.
 *
 * La suite d'index reprend délibérément la même forme que celle du parcours COOP —
 * cinq réponses par position, aucune période de 1 à 5, aucune série de plus de deux — une
 * propriété déjà éprouvée par script/verify-program-tests.ts, appliquée ici à un tout autre
 * jeu de questions.
 */

export const DATA_ANSWER_KEY: number[] = [
  2, 0, 3, 1, 0, 2, 1, 3, 3, 1, 2, 0, 1, 3, 0, 2, 3, 1, 0, 2,
];

/** Texte attendu de la bonne réponse, dans l'ordre des questions. Vérification seulement. */
export const DATA_CORRECT_TEXTS: string[] = [
  "15 000 FCFA",
  "16 %",
  "95 000 F",
  "2 tonnes/ha",
  "Village B",
  "Une valeur suspecte à vérifier — une quantité vendue ne peut pas être négative",
  "Si le nombre d'exploitations observées est comparable dans les deux régions",
  "Filtrer les lignes dont la date correspond à janvier, puis les compter",
  "Une association entre deux faits ne prouve pas que l'un cause l'autre — un troisième facteur (motivation, ancienneté) peut expliquer les deux",
  "Un échantillon de 4 patients est trop petit pour en tirer une conclusion générale",
  "Non : un résultat obtenu dans une seule agence ne peut pas être généralisé sans vérifier que les autres lui ressemblent",
  "Est-ce que d'autres facteurs (saison, prix, promotion) ont aussi changé au même moment ?",
  "À un enregistrement (une observation), avec ses différentes valeurs séparées par des virgules",
  "Un ensemble de cases alignées verticalement, portant en général un même type d'information (par exemple tous les âges)",
  "Un tableur ou un langage de programmation capable de traiter beaucoup de lignes automatiquement",
  "Une case du tableau qui n'a pas été renseignée, pour une observation donnée",
  "Préciser ce que signifie « ne pas assez utiliser » avec un critère mesurable, puis identifier quelles données existent déjà sur le sujet",
  "Décomposer la question : mauvaises par rapport à quoi ? depuis quand ? dans quelle zone ? — avant de chercher une explication",
  "Résumer l'essentiel en une ou deux phrases claires, avec le chiffre clé et ce qu'il implique concrètement",
  "Comment la performance est-elle mesurée concrètement (ventes, satisfaction client, ponctualité) et sur quelle période ?",
];
