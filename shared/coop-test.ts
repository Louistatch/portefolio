/**
 * Test d'admission du parcours « droit coopératif OHADA » (SCOOPS).
 *
 * Ce fichier ne contient QUE les énoncés et les options — il part dans le navigateur. La clé
 * de correction vit dans api/scoops-answers.ts et n'en sort jamais.
 *
 * ── Ce que ce test vérifie, et ce qu'il ne vérifie pas ──
 *
 * Il ne pose AUCUNE question sur l'Acte uniforme. Un candidat n'a pas à connaître l'article
 * 114 ni le sigle COOP-CA avant d'avoir suivi le cours : le lui demander à l'entrée ferait un
 * test que seuls les anciens élèves pourraient réussir, et écarterait précisément le public
 * visé — responsables de groupements, agents d'ONG, conseillers d'unions, agents de
 * l'administration chargée des coopératives.
 *
 * Ce qu'il faut posséder pour suivre huit semaines de droit sans décrocher :
 *   — savoir ce qu'est une personne morale et distinguer les formes juridiques courantes ;
 *   — savoir LIRE un texte réglementaire et en tirer une conséquence, y compris quand il
 *     renvoie à autre chose ou pose une exception. C'est la compétence centrale du parcours ;
 *   — connaître le fonctionnement ordinaire d'une assemblée : convocation, quorum, mandat,
 *     procès-verbal ;
 *   — calculer un pourcentage, une part, un seuil ;
 *   — lire un compte simple de recettes et de dépenses.
 *
 * Les extraits réglementaires cités dans la partie « Lecture d'un texte » sont FICTIFS et
 * annoncés comme tels : il s'agit d'évaluer la lecture, pas la mémoire. Aucun n'est tiré de
 * l'Acte uniforme, pour la même raison.
 *
 * ── Position des bonnes réponses ──
 *
 * Réparties à dessein, cinq par position, sans séquence périodique ni série de plus de deux.
 * Contrôlé par script/verify-program-tests.ts, qui refuse toute clé permettant de réussir en
 * répondant la même lettre partout.
 */

export interface QuestionCoop {
  domaine: string;
  q: string;
  opts: string[];
}

export const QUESTIONS_COOP: QuestionCoop[] = [
  // ── Formes juridiques ──
  {
    domaine: "Formes juridiques",
    q: "Qu'est-ce qu'une « personne morale » ?",
    opts: [
      "Un dirigeant reconnu pour son intégrité",
      "Une personne physique agissant au nom d'un groupe",
      "Un groupement doté d'une existence juridique propre, distincte de celle de ses membres",
      "Un membre fondateur d'une organisation",
    ],
  },
  {
    domaine: "Formes juridiques",
    q: "Un groupement de fait, jamais enregistré, veut ouvrir un compte bancaire à son nom. Quel obstacle rencontre-t-il ?",
    opts: [
      "Il n'a pas de personnalité juridique, donc il ne peut être titulaire d'un compte",
      "Il doit d'abord réunir un capital minimum imposé par la banque",
      "Il doit désigner un commissaire aux comptes",
      "Aucun : un cahier de comptes tenu à jour suffit",
    ],
  },
  {
    domaine: "Formes juridiques",
    q: "Quelle différence essentielle sépare une société commerciale ordinaire d'une organisation dont le but est de rendre service à ses membres ?",
    opts: [
      "La première tient une comptabilité, la seconde non",
      "La première a un siège social, la seconde non",
      "La première peut employer du personnel, la seconde non",
      "La première vise à dégager et partager un bénéfice, la seconde vise d'abord à servir ses membres",
    ],
  },
  {
    domaine: "Formes juridiques",
    q: "Dans une organisation où chaque membre dispose d'une voix quel que soit son apport, comment se prend une décision ?",
    opts: [
      "Par le membre ayant le plus contribué financièrement",
      "Par un vote où toutes les voix ont le même poids",
      "Par le fondateur, en dernier ressort",
      "Par consensus obligatoire, tout vote étant exclu",
    ],
  },

  // ── Lecture d'un texte ──
  {
    domaine: "Lecture d'un texte",
    q: "Extrait fictif : « Les présentes dispositions sont d'ordre public, sauf dans les cas où elles autorisent expressément les parties à y déroger. » Que peut-on en conclure ?",
    opts: [
      "On ne peut écarter ces dispositions par un accord privé, sauf là où le texte le permet lui-même",
      "Les parties peuvent toujours convenir d'autre chose entre elles",
      "Ces dispositions ne s'appliquent qu'aux administrations publiques",
      "Ces dispositions cessent de s'appliquer en cas de litige",
    ],
  },
  {
    domaine: "Lecture d'un texte",
    q: "Extrait fictif : « La demande est déposée dans le mois de la constitution. Y sont jointes, sous peine de rejet, les pièces suivantes : … » Que signifie « sous peine de rejet » ?",
    opts: [
      "Les pièces peuvent être fournies plus tard, sur demande du service",
      "Le rejet est une sanction facultative laissée à l'appréciation de l'agent",
      "Un dossier auquel manque l'une de ces pièces doit être refusé",
      "Le rejet ne concerne que les demandes déposées hors délai",
    ],
  },
  {
    domaine: "Lecture d'un texte",
    q: "Extrait fictif : « À défaut de détermination par les statuts, la part de l'apporteur est égale à celle du membre qui a le moins apporté. » Comment qualifier cette règle ?",
    opts: [
      "Elle est impérative : les statuts ne peuvent pas en disposer autrement",
      "Elle est supplétive : elle ne s'applique que si les statuts sont muets",
      "Elle est transitoire : elle cesse au bout de deux ans",
      "Elle est facultative : elle ne s'applique que si les statuts la reprennent",
    ],
  },
  {
    domaine: "Lecture d'un texte",
    q: "Extrait fictif : « L'organisme est tenu de désigner un contrôleur lorsqu'il réunit les conditions suivantes : plus de mille membres ; un chiffre d'affaires supérieur à cent millions ; un total de bilan supérieur à cinq millions. » Un organisme de 1 500 membres réalisant 60 millions de chiffre d'affaires est-il concerné ?",
    opts: [
      "Oui, dès que l'une des conditions est remplie",
      "Oui, le nombre de membres étant le critère déterminant",
      "On ne peut pas répondre sans connaître la date de sa création",
      "Non : les conditions sont cumulatives et le chiffre d'affaires reste sous le seuil",
    ],
  },

  // ── Vie associative ──
  {
    domaine: "Vie associative",
    q: "À quoi sert le quorum d'une assemblée générale ?",
    opts: [
      "À limiter la durée des débats",
      "À fixer le nombre de résolutions inscrites à l'ordre du jour",
      "À déterminer la majorité nécessaire pour élire le président",
      "À exiger qu'un nombre minimum de membres soit présent ou représenté pour délibérer valablement",
    ],
  },
  {
    domaine: "Vie associative",
    q: "Un membre empêché souhaite qu'un autre vote à sa place. Comment appelle-t-on l'acte par lequel il l'y autorise ?",
    opts: [
      "Une délégation de signature",
      "Un mandat, ou procuration",
      "Une caution",
      "Une résolution spéciale",
    ],
  },
  {
    domaine: "Vie associative",
    q: "Que doit contenir, au minimum, le procès-verbal d'une assemblée générale ?",
    opts: [
      "Le seul texte des résolutions adoptées",
      "La liste des membres à jour de leurs cotisations",
      "La date et le lieu, les membres présents ou représentés, l'ordre du jour, les résolutions mises aux voix et le résultat des votes",
      "Le bilan financier de l'exercice écoulé",
    ],
  },
  {
    domaine: "Vie associative",
    q: "Une organisation n'a plus tenu d'assemblée générale depuis trois ans et n'a plus d'organe de direction en fonction. Quel est le risque principal ?",
    opts: [
      "Que sa dissolution puisse être demandée en justice pour défaut de fonctionnement",
      "Que ses membres perdent individuellement leurs droits civiques",
      "Que ses comptes bancaires soient automatiquement transférés à l'État",
      "Aucun risque juridique : seule l'activité économique compte",
    ],
  },

  // ── Calcul et pourcentages ──
  {
    domaine: "Calcul et pourcentages",
    q: "Un groupement dégage 8 400 000 F d'excédent. Il doit en affecter 20 % à une réserve et 20 % à une autre. Quel montant total part en réserves ?",
    opts: [
      "1 680 000 F",
      "3 360 000 F",
      "4 200 000 F",
      "840 000 F",
    ],
  },
  {
    domaine: "Calcul et pourcentages",
    q: "Une organisation compte 96 membres. Combien faut-il de membres pour atteindre 25 % de l'effectif ?",
    opts: [
      "19",
      "20",
      "32",
      "24",
    ],
  },
  {
    domaine: "Calcul et pourcentages",
    q: "Un membre a souscrit 80 000 F de parts et n'en a versé que 20 000 F. Son engagement peut atteindre cinq fois le montant souscrit. Quel est ce maximum ?",
    opts: [
      "400 000 F",
      "100 000 F",
      "300 000 F",
      "80 000 F",
    ],
  },
  {
    domaine: "Calcul et pourcentages",
    q: "Deux membres livrent respectivement 2 tonnes et 20 tonnes. Une somme de 1 100 000 F est répartie proportionnellement aux quantités livrées. Que reçoit celui qui a livré 2 tonnes ?",
    opts: [
      "550 000 F",
      "220 000 F",
      "100 000 F",
      "50 000 F",
    ],
  },

  // ── Gestion et comptes ──
  {
    domaine: "Gestion et comptes",
    q: "Une caisse de groupement affiche : recettes 3 200 000 F, dépenses 2 750 000 F. Que représente la différence de 450 000 F ?",
    opts: [
      "Le montant des cotisations restant à recouvrer",
      "La valeur du stock détenu en fin d'exercice",
      "Le montant des dettes du groupement",
      "L'excédent de l'exercice, avant toute affectation",
    ],
  },
  {
    domaine: "Gestion et comptes",
    q: "Un responsable rembourse ses frais de déplacement sans produire de justificatif. Quelle est la principale objection ?",
    opts: [
      "Le remboursement de frais est toujours interdit",
      "Une dépense non justifiée n'est pas contrôlable et expose le responsable à devoir en rendre compte",
      "Les frais de déplacement doivent être payés par l'intéressé lui-même",
      "Le montant doit obligatoirement être voté membre par membre",
    ],
  },
  {
    domaine: "Gestion et comptes",
    q: "Pourquoi un prêteur demande-t-il des comptes annuels avant d'accorder un financement à un groupement ?",
    opts: [
      "Pour apprécier sa capacité à rembourser et la régularité de sa gestion",
      "Parce que la loi lui interdit de prêter sans pièce comptable",
      "Pour déterminer le montant des cotisations de ses membres",
      "Pour choisir lui-même les dirigeants du groupement",
    ],
  },
  {
    domaine: "Gestion et comptes",
    q: "Que signifie « impartageable », s'agissant d'une réserve constituée par une organisation ?",
    opts: [
      "Qu'elle ne peut être placée en banque",
      "Qu'elle doit être répartie chaque année entre les membres",
      "Qu'aucun membre ne peut en obtenir une part, ni en cours de vie ni en partant",
      "Qu'elle ne peut servir qu'à payer les salaires",
    ],
  },
];
