/**
 * Clé de correction du test d'admission du parcours « finance climatique agricole ».
 *
 * Sous api/, donc jamais incluse dans le paquet envoyé au navigateur. Les énoncés et les
 * options vivent dans shared/fca-test.ts et partent bien côté client : c'est cette séparation
 * qui empêche un candidat de lire les réponses dans le code de la page.
 *
 * Deux tableaux, même raison que pour la formation de formateurs : les index servent à
 * corriger, les textes servent à vérifier au build que la clé n'a pas dérivé des énoncés.
 * Réordonner les options d'une question sans toucher à la clé désynchroniserait l'index en
 * silence, et le test continuerait de corriger — en se trompant.
 */

export const FCA_ANSWER_KEY: number[] = [
  2, 0, 3, 1, 0, 3, 1, 2, 3, 1, 0, 2, 1, 2, 0, 3, 2, 3, 1, 0,
];

/** Texte attendu de la bonne réponse, dans l'ordre des questions. Vérification seulement. */
export const FCA_CORRECT_TEXTS: string[] = [
  "La part du montant emprunté qui n'a pas encore été remboursée",
  "Il cesse d'honorer ses échéances selon les termes du contrat",
  "Réduire le montant que le prêteur perd si l'emprunteur fait défaut",
  "Ne commence à rembourser qu'après un délai convenu",
  "Intègre l'ensemble des frais supportés par l'emprunteur",
  "12 millions FCFA",
  "9 %",
  "70 %",
  "3 points de pourcentage",
  "Plus important que si le choc avait frappé la troisième zone",
  "Après la récolte, à la commercialisation",
  "Le moment où les stocks de l'année précédente sont épuisés et la nouvelle récolte pas encore disponible",
  "À un arrêt précoce des pluies avant la maturité",
  "Les semences, engrais et produits phytosanitaires de la campagne",
  "Les systèmes financiers décentralisés, c'est-à-dire les institutions de microfinance",
  "Le taux plafond au-delà duquel un prêt devient illégal",
  "Les autres membres du groupe sont engagés à couvrir le manquement",
  "Les deux zones exposent le même montant, avec des prêts de taille très différente",
  "Le triplement indique un facteur commun à identifier avant de conclure",
  "Masque des écarts importants entre les zones qui la composent",
];
