/**
 * Test d'admission de la formation de formateurs (parcours « tof »).
 *
 * Ce fichier ne contient QUE les énoncés et les options — il part dans le navigateur. La clé
 * de correction vit côté serveur, dans api/index.ts, et n'en sort jamais : c'est ce qui
 * empêche un candidat de lire les réponses dans le code de la page.
 *
 * ── Pourquoi un second test ──
 *
 * Un unique test d'admission, celui du cursus MEAL, ouvrait l'accès à tous les cours publiés.
 * Un formateur rural devait donc répondre à trente questions sur pandas et QGIS pour accéder
 * à un cours de gestion financière paysanne, qui n'a rien à voir. Les deux parcours mènent à
 * deux certificats distincts ; ils méritent deux portes distinctes.
 *
 * ── Quinze questions, et non trente ──
 *
 * Le public visé anime des sessions sur le terrain et n'est pas toujours à l'aise avec un
 * questionnaire en ligne. La barrière doit vérifier qu'on connaît le métier, pas qu'on sait
 * remplir un formulaire. Le seuil reste à 70 %, soit 11 bonnes réponses sur 15.
 *
 * ── Position des bonnes réponses ──
 *
 * Elles sont réparties à dessein entre les quatre positions. Une première rédaction plaçait
 * la bonne réponse en deuxième position pour treize questions sur quinze : répondre « B »
 * partout aurait suffi à être admis. script/verify-tof-test.ts vérifie désormais qu'aucune
 * position ne permet d'atteindre le seuil.
 */

export interface QuestionTof {
  domaine: string;
  q: string;
  opts: string[];
}

export const QUESTIONS_TOF: QuestionTof[] = [
  {
    domaine: "Andragogie",
    q: "L'andragogie désigne :",
    opts: [
      "L'art d'enseigner aux enfants",
      "La gestion administrative d'un centre de formation",
      "L'art d'accompagner l'apprentissage des adultes",
      "L'évaluation des acquis en fin de formation",
    ],
  },
  {
    domaine: "Andragogie",
    q: "Chez l'adulte en formation, l'expérience déjà acquise doit être :",
    opts: [
      "Utilisée comme point de départ des échanges",
      "Mise de côté, car elle gêne l'apprentissage",
      "Corrigée systématiquement avant de commencer",
      "Évaluée par un test préalable obligatoire",
    ],
  },
  {
    domaine: "Animation",
    q: "Avec des participants majoritairement non alphabétisés, le support le plus adapté est :",
    opts: [
      "Un document écrit distribué à chacun",
      "Une présentation projetée avec beaucoup de texte",
      "Un exposé magistral suivi d'un questionnaire écrit",
      "Des images, des objets concrets et des mises en situation",
    ],
  },
  {
    domaine: "Animation",
    q: "Un participant monopolise la parole depuis dix minutes. La meilleure réaction est :",
    opts: [
      "L'interrompre sèchement pour rétablir l'ordre",
      "Reformuler son propos et solliciter explicitement d'autres participants",
      "Le laisser finir, quitte à dépasser l'horaire",
      "Ignorer la situation, le groupe se régulera seul",
    ],
  },
  {
    domaine: "Animation",
    q: "L'objectif d'une session doit être formulé du point de vue :",
    opts: [
      "De ce que le formateur va présenter",
      "Du programme financé par le bailleur",
      "Du temps disponible dans la journée",
      "De ce que le participant saura faire à la fin",
    ],
  },
  {
    domaine: "Budget familial",
    q: "Un budget familial met en regard :",
    opts: [
      "Les entrées et les sorties d'argent sur une période",
      "Les dettes et les créances du ménage",
      "Le patrimoine foncier et le cheptel",
      "Les dépenses de l'année précédente uniquement",
    ],
  },
  {
    domaine: "Budget familial",
    q: "Dans un ménage agricole, les revenus sont surtout :",
    opts: [
      "Réguliers, mois après mois",
      "Saisonniers, concentrés après les récoltes",
      "Fixes et connus à l'avance",
      "Indépendants du calendrier cultural",
    ],
  },
  {
    domaine: "Budget familial",
    q: "Distinguer dépenses essentielles et dépenses reportables sert d'abord à :",
    opts: [
      "Culpabiliser les ménages dépensiers",
      "Calculer l'impôt dû par le ménage",
      "Décider quoi financer en priorité quand les ressources manquent",
      "Comparer les ménages entre eux",
    ],
  },
  {
    domaine: "Épargne",
    q: "L'intérêt principal d'épargner juste après la récolte est :",
    opts: [
      "De mettre de côté au moment où l'argent est là, en vue de la soudure",
      "De payer moins de taxes sur la vente",
      "D'obtenir un meilleur prix de vente",
      "De réduire le coût du stockage",
    ],
  },
  {
    domaine: "Épargne communautaire",
    q: "Dans un groupe d'épargne et de crédit communautaire, la caisse est alimentée par :",
    opts: [
      "Une subvention versée par l'ONG",
      "Un prêt bancaire contracté par le groupe",
      "La vente des récoltes du groupement",
      "Les cotisations régulières des membres",
    ],
  },
  {
    domaine: "Tontines",
    q: "Dans une tontine rotative classique, la somme collectée à chaque tour :",
    opts: [
      "Est partagée à parts égales entre tous les membres",
      "Reste en caisse jusqu'à la fin du cycle",
      "Est remise en totalité à un membre, à tour de rôle",
      "Est prêtée à un membre extérieur au groupe",
    ],
  },
  {
    domaine: "Tontines",
    q: "La principale limite d'une tontine face à un groupe d'épargne et de crédit est :",
    opts: [
      "Elle ne permet pas de recevoir une somme importante",
      "Le montant et la date du versement sont fixés d'avance, sans souplesse en cas d'urgence",
      "Elle exige un compte bancaire",
      "Elle ne concerne que les cultures vivrières",
    ],
  },
  {
    domaine: "Crédit agricole",
    q: "Avant de conseiller un crédit à un producteur, la première question à examiner est :",
    opts: [
      "La capacité de remboursement au regard des revenus attendus",
      "Le montant maximal que l'institution peut prêter",
      "La durée la plus longue possible",
      "Le nombre de crédits déjà accordés au village",
    ],
  },
  {
    domaine: "Crédit agricole",
    q: "Le différé de remboursement d'un crédit de campagne sert à :",
    opts: [
      "Réduire le taux d'intérêt appliqué",
      "Retarder indéfiniment le remboursement",
      "Permettre à l'institution de vérifier les garanties",
      "Faire coïncider les premières échéances avec la vente de la récolte",
    ],
  },
  {
    domaine: "Planification de campagne",
    q: "Un plan de campagne bien construit permet surtout au producteur :",
    opts: [
      "D'obtenir une subvention publique",
      "De fixer le prix de vente de sa récolte",
      "De prévoir ses besoins de trésorerie mois par mois avant de s'engager",
      "De choisir son institution de microfinance",
    ],
  },
];
