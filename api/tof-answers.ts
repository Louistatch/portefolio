/**
 * Clé de correction du test d'admission de la formation de formateurs.
 *
 * Ce fichier vit sous api/ et non sous shared/ : il n'est jamais inclus dans le paquet envoyé
 * au navigateur. Les énoncés et les options, eux, sont dans shared/tof-test.ts et partent
 * bien côté client — c'est la séparation qui empêche un candidat de lire les réponses dans le
 * code de la page.
 *
 * ── Pourquoi deux tableaux ──
 *
 * TOF_ANSWER_KEY porte les index, seuls utilisés pour corriger : pas de calcul au chargement,
 * donc aucun risque de faire tomber la fonction serverless entière sur une coquille de
 * contenu. TOF_CORRECT_TEXTS porte le texte attendu à ces mêmes rangs, et ne sert qu'à
 * script/verify-tof-test.ts.
 *
 * Le jour où l'on réordonne les options d'une question — ce qui est arrivé dès la première
 * rédaction, la bonne réponse se trouvant treize fois sur quinze en deuxième position — l'index
 * seul se serait désynchronisé sans que rien ne le signale : le test aurait continué de
 * corriger, en se trompant. Le contrôle croisé des deux tableaux rend cette dérive visible
 * avant le déploiement.
 */

export const TOF_ANSWER_KEY: number[] = [
  2, 0, 3, 1, 3, 0, 1, 2, 0, 3, 2, 1, 0, 3, 2,
];

/** Texte attendu de la bonne réponse, dans l'ordre des questions. Vérification seulement. */
export const TOF_CORRECT_TEXTS: string[] = [
  "L'art d'accompagner l'apprentissage des adultes",
  "Utilisée comme point de départ des échanges",
  "Des images, des objets concrets et des mises en situation",
  "Reformuler son propos et solliciter explicitement d'autres participants",
  "De ce que le participant saura faire à la fin",
  "Les entrées et les sorties d'argent sur une période",
  "Saisonniers, concentrés après les récoltes",
  "Décider quoi financer en priorité quand les ressources manquent",
  "De mettre de côté au moment où l'argent est là, en vue de la soudure",
  "Les cotisations régulières des membres",
  "Est remise en totalité à un membre, à tour de rôle",
  "Le montant et la date du versement sont fixés d'avance, sans souplesse en cas d'urgence",
  "La capacité de remboursement au regard des revenus attendus",
  "Faire coïncider les premières échéances avec la vente de la récolte",
  "De prévoir ses besoins de trésorerie mois par mois avant de s'engager",
];
