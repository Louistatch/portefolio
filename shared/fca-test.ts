/**
 * Test d'admission du parcours « finance climatique agricole » (FCA).
 *
 * Ce fichier ne contient QUE les énoncés et les options — il part dans le navigateur. La clé
 * de correction vit dans api/fca-answers.ts et n'en sort jamais.
 *
 * ── Ce que ce test vérifie, et ce qu'il ne vérifie pas ──
 *
 * Il vérifie les PRÉREQUIS, pas le contenu du cours. Un candidat n'a aucune raison de
 * connaître la perte attendue ou le risque de base avant d'avoir suivi FCA-01 : les lui
 * demander à l'entrée ferait un test que seuls les anciens élèves pourraient réussir.
 *
 * Ce qu'il faut posséder pour suivre le parcours sans décrocher :
 *   — le vocabulaire de base du crédit (intérêt, capital, échéance, garantie, défaut) ;
 *   — l'arithmétique des pourcentages, qui sert à chaque leçon ;
 *   — la familiarité avec le cycle d'une campagne agricole et ses contraintes de trésorerie ;
 *   — savoir lire un petit tableau de chiffres.
 *
 * Aucune question ne suppose de programmation : c'est le parcours analyste. Le parcours
 * quantitatif, lui, aura son propre test avec Python en prérequis.
 *
 * ── Position des bonnes réponses ──
 *
 * Réparties à dessein, cinq par position, sans séquence périodique ni série. Contrôlé par
 * script/verify-program-tests.ts, qui refuse toute clé permettant de réussir en répondant
 * la même lettre partout.
 */

export interface QuestionFca {
  domaine: string;
  q: string;
  opts: string[];
}

export const QUESTIONS_FCA: QuestionFca[] = [
  // ── Vocabulaire du crédit ──
  {
    domaine: "Vocabulaire du crédit",
    q: "Dans un prêt, le « capital restant dû » désigne :",
    opts: [
      "Le total des intérêts déjà payés",
      "Le montant emprunté au départ",
      "La part du montant emprunté qui n'a pas encore été remboursée",
      "La garantie déposée par l'emprunteur",
    ],
  },
  {
    domaine: "Vocabulaire du crédit",
    q: "On dit qu'un emprunteur est « en défaut » lorsque :",
    opts: [
      "Il cesse d'honorer ses échéances selon les termes du contrat",
      "Il rembourse par anticipation",
      "Il demande un rééchelonnement accepté par le prêteur",
      "Il change d'institution financière",
    ],
  },
  {
    domaine: "Vocabulaire du crédit",
    q: "Une garantie sert principalement à :",
    opts: [
      "Augmenter le montant qu'on peut emprunter sans condition",
      "Supprimer les intérêts sur le prêt",
      "Raccourcir la durée du prêt",
      "Réduire le montant que le prêteur perd si l'emprunteur fait défaut",
    ],
  },
  {
    domaine: "Vocabulaire du crédit",
    q: "Le « différé » d'un crédit de campagne signifie que l'emprunteur :",
    opts: [
      "Paie ses intérêts avant de recevoir les fonds",
      "Ne commence à rembourser qu'après un délai convenu",
      "Rembourse par mensualités constantes dès le premier mois",
      "Peut annuler le prêt à tout moment",
    ],
  },
  {
    domaine: "Vocabulaire du crédit",
    q: "La différence entre le taux nominal et le taux effectif global tient au fait que le second :",
    opts: [
      "Intègre l'ensemble des frais supportés par l'emprunteur",
      "Ignore les commissions et les frais",
      "Est toujours inférieur au taux nominal",
      "Ne s'applique qu'aux crédits immobiliers",
    ],
  },

  // ── Calcul et pourcentages ──
  {
    domaine: "Calcul",
    q: "Un portefeuille de 200 millions FCFA subit une perte de 6 %. Quel est le montant perdu ?",
    opts: [
      "1,2 million FCFA",
      "6 millions FCFA",
      "60 millions FCFA",
      "12 millions FCFA",
    ],
  },
  {
    domaine: "Calcul",
    q: "Sur 400 prêts accordés, 36 sont en défaut. Le taux de défaut est de :",
    opts: [
      "3,6 %",
      "9 %",
      "11 %",
      "36 %",
    ],
  },
  {
    domaine: "Calcul",
    q: "Un prêteur récupère 30 % de l'encours après un défaut. Quelle part perd-il ?",
    opts: [
      "30 %",
      "50 %",
      "70 %",
      "3 %",
    ],
  },
  {
    domaine: "Calcul",
    q: "Un taux passe de 27 % à 24 %. La baisse est de :",
    opts: [
      "3 %",
      "11 points de pourcentage",
      "24 %",
      "3 points de pourcentage",
    ],
  },
  {
    domaine: "Calcul",
    q: "Trois zones portent respectivement 60 %, 25 % et 15 % de l'encours. Un choc double la perte dans la seule première zone. L'effet sur le portefeuille total sera :",
    opts: [
      "Identique quelle que soit la zone touchée",
      "Plus important que si le choc avait frappé la troisième zone",
      "Nul, car les deux autres zones compensent",
      "Trois fois plus important que le choc lui-même",
    ],
  },

  // ── Campagne agricole ──
  {
    domaine: "Campagne agricole",
    q: "Dans un système pluvial, le revenu d'un producteur de céréales arrive principalement :",
    opts: [
      "Après la récolte, à la commercialisation",
      "Au moment des semis",
      "De façon régulière tout au long de l'année",
      "Au début de la saison des pluies",
    ],
  },
  {
    domaine: "Campagne agricole",
    q: "La « période de soudure » désigne :",
    opts: [
      "La période de préparation des sols avant les semis",
      "Le moment où les prix agricoles sont au plus haut",
      "Le moment où les stocks de l'année précédente sont épuisés et la nouvelle récolte pas encore disponible",
      "La saison de commercialisation des excédents",
    ],
  },
  {
    domaine: "Campagne agricole",
    q: "Un semis effectué trop tard par rapport à l'installation des pluies expose surtout la culture :",
    opts: [
      "À un excès d'azote dans le sol",
      "À un arrêt précoce des pluies avant la maturité",
      "À une baisse du prix de vente",
      "À une interdiction de commercialisation",
    ],
  },
  {
    domaine: "Campagne agricole",
    q: "Un crédit d'intrants sert à financer :",
    opts: [
      "L'achat d'un véhicule de transport",
      "La construction d'un magasin de stockage",
      "Les semences, engrais et produits phytosanitaires de la campagne",
      "Les salaires de l'organisation paysanne",
    ],
  },

  // ── Microfinance et cadre institutionnel ──
  {
    domaine: "Microfinance",
    q: "Dans l'espace UEMOA, l'acronyme SFD désigne :",
    opts: [
      "Les systèmes financiers décentralisés, c'est-à-dire les institutions de microfinance",
      "Les sociétés de financement du développement",
      "Les services financiers digitaux",
      "Les structures de formation et de développement",
    ],
  },
  {
    domaine: "Microfinance",
    q: "Un taux d'usure est :",
    opts: [
      "Le taux moyen pratiqué sur le marché",
      "Le taux d'inflation constaté sur l'année",
      "Le taux appliqué aux crédits en souffrance",
      "Le taux plafond au-delà duquel un prêt devient illégal",
    ],
  },
  {
    domaine: "Microfinance",
    q: "Dans une caution solidaire de groupe, si un membre ne rembourse pas :",
    opts: [
      "Le prêteur perd immédiatement la totalité de la créance",
      "Le prêt est automatiquement annulé",
      "Les autres membres du groupe sont engagés à couvrir le manquement",
      "Le groupe entier est exclu de toute banque de la zone",
    ],
  },

  // ── Lecture de données ──
  {
    domaine: "Lecture de données",
    q: "Un tableau indique : zone A, 300 prêts, encours 180 M ; zone B, 900 prêts, encours 180 M. Que peut-on affirmer ?",
    opts: [
      "La zone B porte trois fois plus de risque en montant",
      "La zone A est plus risquée car ses prêts sont plus gros",
      "Les deux zones sont identiques en tout point",
      "Les deux zones exposent le même montant, avec des prêts de taille très différente",
    ],
  },
  {
    domaine: "Lecture de données",
    q: "Le taux de défaut d'un produit passe de 5 % à 15 % en une saison. Le constat le plus prudent est :",
    opts: [
      "Il s'agit certainement d'un problème de gestion des agents de crédit",
      "Le triplement indique un facteur commun à identifier avant de conclure",
      "C'est une variation normale qui ne demande aucune analyse",
      "Le produit doit être supprimé immédiatement",
    ],
  },
  {
    domaine: "Lecture de données",
    q: "Une moyenne de rendement calculée sur toute une région peut être trompeuse parce qu'elle :",
    opts: [
      "Masque des écarts importants entre les zones qui la composent",
      "Est toujours surestimée par construction",
      "Ne peut se calculer que sur des données annuelles",
      "N'a de sens que si toutes les parcelles ont la même taille",
    ],
  },
];
