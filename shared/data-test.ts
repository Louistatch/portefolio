/**
 * Test d'admission du parcours « Data Analytics ».
 *
 * Ce fichier ne contient QUE les énoncés et les options — il part dans le navigateur. La clé
 * de correction vit dans api/data-answers.ts et n'en sort jamais.
 *
 * ── Ce que ce test vérifie, et ce qu'il ne vérifie pas ──
 *
 * Il ne pose AUCUNE question de Python, de Pandas ou de statistique. Le parcours lui-même le
 * dit dès sa première semaine : « Aucun prérequis technique. » Demander à l'entrée ce qui
 * s'apprend pendant les neuf semaines ferait un test que seuls d'anciens élèves pourraient
 * réussir, et écarterait précisément le public visé.
 *
 * Ce qu'il faut posséder pour suivre neuf semaines d'analyse de données sans décrocher :
 *   — un raisonnement quantitatif ordinaire : pourcentage, moyenne, rendement par unité ;
 *   — savoir LIRE un tableau de chiffres et en tirer ce qui est demandé, pas plus ;
 *   — la rigueur de ne pas confondre une coïncidence avec une preuve — c'est la compétence
 *     que ce parcours muscle du premier au dernier jour ;
 *   — les repères de base d'un fichier de données (ligne, colonne, valeur manquante) ;
 *   — la capacité à transformer une question floue (« nos ventes sont mauvaises ») en
 *     question précise, point de départ de tout travail d'analyse.
 *
 * Les exemples chiffrés du test sont fictifs et volontairement simples : un candidat qui
 * hésite sur une règle de trois n'est pas mal à l'aise avec les données, il manque de
 * pratique du calcul — ce que ce test ne mesure pas et ne doit pas mesurer.
 *
 * ── Position des bonnes réponses ──
 *
 * Réparties à dessein, cinq par position, sans séquence périodique ni série de plus de deux
 * — même exigence que pour les autres parcours. Contrôlé par script/verify-program-tests.ts.
 */

export interface QuestionData {
  domaine: string;
  q: string;
  opts: string[];
}

export const QUESTIONS_DATA: QuestionData[] = [
  // ── Raisonnement quantitatif ──
  {
    domaine: "Raisonnement quantitatif",
    q: "Un lot de 40 sacs de maïs coûte 600 000 FCFA. Quel est le prix d'un sac ?",
    opts: ["12 000 FCFA", "20 000 FCFA", "15 000 FCFA", "18 000 FCFA"],
  },
  {
    domaine: "Raisonnement quantitatif",
    q: "Sur 250 clients d'une coopérative, 40 ont remboursé en retard. Quel pourcentage cela représente-t-il, arrondi à l'unité ?",
    opts: ["16 %", "25 %", "12 %", "20 %"],
  },
  {
    domaine: "Raisonnement quantitatif",
    q: "Les ventes mensuelles d'une boutique sont : janvier 80 000 F, février 95 000 F, mars 110 000 F. Quelle est la moyenne des trois mois ?",
    opts: ["80 000 F", "110 000 F", "90 000 F", "95 000 F"],
  },
  {
    domaine: "Raisonnement quantitatif",
    q: "Un champ produit 3,2 tonnes sur 1,6 hectare. Quel est le rendement par hectare ?",
    opts: ["1,6 tonne/ha", "2 tonnes/ha", "2,5 tonnes/ha", "4 tonnes/ha"],
  },
  // ── Lecture de données ──
  {
    domaine: "Lecture de données",
    q: "Un tableau indique, pour 4 villages, le nombre d'exploitations agricoles suivies : Village A 12, Village B 27, Village C 9, Village D 18. Quel village en compte le plus ?",
    opts: ["Village B", "Village A", "Village D", "Village C"],
  },
  {
    domaine: "Lecture de données",
    q: "Dans un relevé de ventes hebdomadaire, une colonne « quantité » contient les valeurs 12, 8, -3, 15. Que signale la valeur -3 dans ce contexte ?",
    opts: [
      "Une remise accordée au client",
      "Une quantité en stock restante",
      "Une valeur suspecte à vérifier — une quantité vendue ne peut pas être négative",
      "Un retour de marchandise comptabilisé normalement",
    ],
  },
  {
    domaine: "Lecture de données",
    q: "Un tableau croisé montre, pour deux régions et deux années, le nombre moyen de sacs récoltés par exploitation. Que faut-il regarder en premier pour comparer honnêtement les deux régions ?",
    opts: [
      "Le total des sacs récoltés, toutes années confondues",
      "Si le nombre d'exploitations observées est comparable dans les deux régions",
      "La couleur utilisée dans le tableau",
      "Le nom de la personne qui a rempli le tableau",
    ],
  },
  {
    domaine: "Lecture de données",
    q: "On vous donne une liste de 500 transactions avec une colonne « date » et une colonne « montant ». Pour savoir combien ont eu lieu en janvier, quelle opération est nécessaire ?",
    opts: [
      "Trier la colonne montant du plus grand au plus petit",
      "Faire la somme de la colonne montant",
      "Supprimer les lignes sans date",
      "Filtrer les lignes dont la date correspond à janvier, puis les compter",
    ],
  },
  // ── Logique et rigueur ──
  {
    domaine: "Logique et rigueur",
    q: "Un directeur observe que les employés qui arrivent tôt vendent plus, et conclut qu'arriver tôt AUGMENTE les ventes. Quel est le principal problème de ce raisonnement ?",
    opts: [
      "Il n'a interrogé aucun employé",
      "Le nombre d'employés observés n'est pas précisé",
      "Les ventes ne sont pas exprimées en pourcentage",
      "Une association entre deux faits ne prouve pas que l'un cause l'autre — un troisième facteur (motivation, ancienneté) peut expliquer les deux",
    ],
  },
  {
    domaine: "Logique et rigueur",
    q: "Une étude affirme qu'un traitement est efficace parce que 3 patients sur 4 se sont sentis mieux après l'avoir pris. Quelle est la principale limite de cette conclusion ?",
    opts: [
      "Le traitement coûte trop cher",
      "Un échantillon de 4 patients est trop petit pour en tirer une conclusion générale",
      "Les patients ne sont pas du même âge",
      "Le mot « efficace » n'est pas défini dans le dictionnaire",
    ],
  },
  {
    domaine: "Logique et rigueur",
    q: "On vous dit : « Tous les clients interrogés dans une seule agence de Cotonou préfèrent le retrait au dépôt. » Peut-on en conclure que c'est vrai pour tous les clients de la banque, dans tout le pays ?",
    opts: [
      "Oui, car cette agence est représentative de toutes les autres",
      "Oui, car plus l'échantillon est petit, plus il est fiable",
      "Non : un résultat obtenu dans une seule agence ne peut pas être généralisé sans vérifier que les autres lui ressemblent",
      "Non, parce que Cotonou n'est pas une ville représentative",
    ],
  },
  {
    domaine: "Logique et rigueur",
    q: "Un vendeur affirme : « Depuis que j'ai changé la couleur de mon emballage, mes ventes ont doublé. » Quelle question faut-il poser avant d'accepter cette explication ?",
    opts: [
      "Est-ce que d'autres facteurs (saison, prix, promotion) ont aussi changé au même moment ?",
      "Quelle est la couleur préférée du vendeur ?",
      "Combien coûte le nouvel emballage ?",
      "Le vendeur a-t-il un diplôme de commerce ?",
    ],
  },
  // ── Outils numériques ──
  {
    domaine: "Outils numériques",
    q: "Dans un fichier de type CSV (valeurs séparées par des virgules), à quoi correspond une ligne ?",
    opts: [
      "À une seule colonne du fichier",
      "À un enregistrement (une observation), avec ses différentes valeurs séparées par des virgules",
      "Au titre du fichier",
      "À une formule de calcul",
    ],
  },
  {
    domaine: "Outils numériques",
    q: "Dans un tableur (Excel, Google Sheets), qu'appelle-t-on généralement une « colonne » ?",
    opts: [
      "Une ligne horizontale du tableau",
      "Le nom du fichier enregistré",
      "Une formule mathématique",
      "Un ensemble de cases alignées verticalement, portant en général un même type d'information (par exemple tous les âges)",
    ],
  },
  {
    domaine: "Outils numériques",
    q: "Vous devez analyser un fichier de 3 000 lignes de ventes. Quel outil est, par nature, le plus adapté plutôt qu'une vérification manuelle case par case ?",
    opts: [
      "Un tableur ou un langage de programmation capable de traiter beaucoup de lignes automatiquement",
      "Une calculatrice de poche",
      "Un cahier et un stylo",
      "Une conversation téléphonique avec chaque client",
    ],
  },
  {
    domaine: "Outils numériques",
    q: "Qu'est-ce qu'une « valeur manquante » dans un jeu de données ?",
    opts: [
      "Une valeur toujours égale à zéro",
      "Une valeur qui a été supprimée volontairement par erreur",
      "Une case du tableau qui n'a pas été renseignée, pour une observation donnée",
      "Une valeur négative",
    ],
  },
  // ── Résolution de problème ──
  {
    domaine: "Résolution de problème",
    q: "Une ONG vous dit : « Nous voulons comprendre pourquoi nos bénéficiaires n'utilisent pas assez notre programme. » Quelle est la meilleure première étape ?",
    opts: [
      "Construire immédiatement un modèle de prédiction",
      "Changer le nom du programme",
      "Envoyer un communiqué de presse",
      "Préciser ce que signifie « ne pas assez utiliser » avec un critère mesurable, puis identifier quelles données existent déjà sur le sujet",
    ],
  },
  {
    domaine: "Résolution de problème",
    q: "Face à un problème vague comme « nos ventes sont mauvaises », quelle démarche est la plus rigoureuse ?",
    opts: [
      "Supposer directement la cause la plus probable et agir dessus",
      "Décomposer la question : mauvaises par rapport à quoi ? depuis quand ? dans quelle zone ? — avant de chercher une explication",
      "Attendre le mois suivant pour voir si cela s'arrange tout seul",
      "Demander à un concurrent ce qu'il en pense",
    ],
  },
  {
    domaine: "Résolution de problème",
    q: "Vous devez présenter un résultat chiffré à un responsable qui n'a pas le temps de lire un long rapport. Quelle est la meilleure approche ?",
    opts: [
      "Résumer l'essentiel en une ou deux phrases claires, avec le chiffre clé et ce qu'il implique concrètement",
      "Lui envoyer toutes les données brutes sans commentaire",
      "N'utiliser que du vocabulaire technique, pour montrer la rigueur du travail",
      "Ne rien présenter tant que l'analyse n'est pas parfaite à 100 %",
    ],
  },
  {
    domaine: "Résolution de problème",
    q: "On vous demande d'analyser « la performance des agents commerciaux ». Quelle est la question la plus utile à poser avant de commencer ?",
    opts: [
      "Combien d'agents ont un diplôme universitaire ?",
      "Quelle est la couleur du logo de l'entreprise ?",
      "Comment la performance est-elle mesurée concrètement (ventes, satisfaction client, ponctualité) et sur quelle période ?",
      "Depuis combien de temps l'entreprise existe-t-elle ?",
    ],
  },
];
