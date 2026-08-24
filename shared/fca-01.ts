/**
 * Contenu du cours FCA-01 — Analyse du risque climatique appliquée au crédit agricole.
 *
 * Parcours « analyste » : tout se calcule à la main ou dans un tableur. Aucun code. C'est
 * délibéré, et ce n'est pas une version au rabais du parcours quantitatif qui suivra.
 *
 * ── Pourquoi ce cours existe ──
 *
 * L'examen des termes de référence réellement publiés dans la sous-région — AGRHYMET, ARAA
 * de la CEDEAO, PNUE, PNUD — montre que les institutions ne recrutent pas des modélisateurs.
 * Elles cherchent des critères de bancabilité, des plans d'investissement adossés aux CDN, de
 * la mobilisation de ressources. Le Fonds Vert pour le Climat compte 62 entités accréditées
 * en accès direct contre 173 bloquées : le goulot est le dossier, pas la science.
 *
 * Ce cours vise donc ce marché-là, avec un parti pris : ce qui distingue un dossier qui passe
 * la diligence d'un dossier qui échoue, ce sont les chiffres derrière. « Le portefeuille est
 * exposé à la sécheresse » ne vaut rien. « Une saison à −30 % de cumul fait passer la perte
 * attendue de 4,2 % à 11,8 % » se défend.
 *
 * ── Sur les chiffres ──
 *
 * Deux natures de chiffres cohabitent ici, et la distinction est tenue partout :
 *   — les données RÉGLEMENTAIRES sont datées et sourcées (taux d'usure UEMOA, 24 % TAEG
 *     pour les SFD depuis le 1er juin 2026, décision n°19/29-12-2025/CM/UMOA) ;
 *   — les données de PORTEFEUILLE des exercices sont fictives, construites pour être
 *     réalistes et calculables. Elles sont annoncées comme telles dans chaque énoncé.
 *
 * Aucun seuil agronomique n'est avancé sans être présenté comme une hypothèse de travail :
 * ces valeurs relèvent de l'expertise de l'auteur du cours, pas de la rédaction.
 */

export type Cellule =
  | { type: "md"; content: string }
  | { type: "callout"; title: string; content: string; variant: "info" | "warning" | "success" | "tip" }
  | { type: "quiz"; question: string; opts: string[]; ans: number }
  | {
      type: "exercise"; id: string; kind: "number" | "choice" | "text";
      title: string; prompt: string; answer: any;
      opts?: string[]; accept?: string[]; tolerance?: number; unit?: string;
      hint?: string; explain: string;
    }
  | { type: "resource"; title: string; url: string; desc: string; provider: string };

export interface LeconFca {
  ordre: number;
  titre: string;
  points: number;
  cellules: Cellule[];
}

export const FCA_01 = {
  code: "FCA-01",
  titre: "Analyse du risque climatique appliquée au crédit agricole",
  description:
    "Chiffrer ce qu'une mauvaise saison coûte à un portefeuille de crédit agricole, et le "
    + "défendre par écrit. Perte attendue, seuil de rentabilité sous plafond d'usure, "
    + "concentration, risque de base d'un produit indiciel, note de bancabilité. "
    + "Tout se calcule à la main ou dans un tableur — aucun code n'est requis.",
  niveau: "intermediaire",
  outils: ["Tableur", "Calcul financier", "Note d'analyse"],
};

export const LECONS_FCA_01: LeconFca[] = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    ordre: 1,
    titre: "Le risque climatique est un risque de crédit",
    points: 100,
    cellules: [
      {
        type: "md",
        content:
          "## Pourquoi ce cours commence par une confusion à défaire\n\n"
          + "Dans la plupart des institutions de la sous-région, le risque climatique est traité "
          + "par le département environnement, et le risque de crédit par le département des "
          + "engagements. Les deux ne se parlent pas. C'est une erreur d'organisation qui a une "
          + "conséquence chiffrable : **personne ne calcule ce qu'une mauvaise saison fait à "
          + "l'encours**.\n\n"
          + "Or une sécheresse ne détruit pas seulement des récoltes. Elle transforme un "
          + "portefeuille sain en portefeuille dégradé, en une saison, sans qu'aucun signal de "
          + "crédit classique ne se soit allumé avant. L'emprunteur n'a pas changé de "
          + "comportement : il a manqué de pluie.",
      },
      {
        type: "md",
        content:
          "## Deux familles de risque, deux horizons\n\n"
          + "### Le risque physique\n\n"
          + "C'est l'événement lui-même et ses conséquences directes : déficit pluviométrique, "
          + "démarrage tardif de la saison, séquence sèche en pleine floraison, inondation, "
          + "attaque de ravageurs favorisée par des conditions inhabituelles.\n\n"
          + "On le distingue en deux temps :\n\n"
          + "- **Aigu** — un événement daté : une inondation en septembre.\n"
          + "- **Chronique** — une dérive lente : un décalage progressif de la date d'installation "
          + "des pluies sur dix ans, qui rend le calendrier cultural habituel progressivement faux.\n\n"
          + "Le risque chronique est le plus dangereux pour un prêteur, parce qu'il ne déclenche "
          + "aucune alerte. Il n'y a pas de « jour de la catastrophe ». Il y a une PD qui monte "
          + "d'un demi-point par an pendant que le comité de crédit regarde ailleurs.\n\n"
          + "### Le risque de transition\n\n"
          + "C'est le risque que fait peser le changement des règles, des marchés et des "
          + "technologies. Dans les économies industrielles, c'est la taxe carbone. Ici, c'est "
          + "surtout **l'accès au marché d'export**.\n\n"
          + "Un producteur de cacao dont la parcelle n'est pas traçable, ou soupçonnée d'être "
          + "issue d'une conversion forestière, peut perdre son acheteur européen sans que rien "
          + "n'ait changé sur sa parcelle. Sa capacité de remboursement s'effondre pour une "
          + "raison réglementaire décidée à 5 000 km.\n\n"
          + "**C'est un risque de crédit pur.** Il ne relève ni de l'agronomie ni de la météo.",
      },
      {
        type: "callout",
        title: "L'erreur d'analyse la plus fréquente",
        variant: "warning",
        content:
          "Croire que le risque de transition ne concerne pas l'Afrique de l'Ouest parce que "
          + "la région émet peu. Le risque de transition ne dépend pas de ce que vous émettez, "
          + "mais de ce qu'exigent vos acheteurs. Une filière d'export est exposée à la "
          + "réglementation de son marché de destination, quelle que soit son empreinte propre.",
      },
      {
        type: "md",
        content:
          "## La chaîne de transmission — et le nœud que personne ne regarde\n\n"
          + "Le choc climatique ne frappe pas le prêteur directement. Il traverse une chaîne :\n\n"
          + "```\nAléa climatique\n   ↓\nRendement de la parcelle\n   ↓\nRevenu du ménage producteur\n"
          + "   ↓\nCapacité de remboursement\n   ↓\nPortefeuille du SFD\n   ↓\nBanque de refinancement / fonds de garantie\n```\n\n"
          + "Chaque flèche est un endroit où le risque peut être amorti — ou transmis intact.\n\n"
          + "Le nœud décisif est le troisième : **entre le revenu et le remboursement**. Un ménage "
          + "dont la récolte a chuté de 40 % ne réduit pas ses remboursements de 40 %. Il "
          + "arbitre : il mange d'abord, il scolarise ensuite, il rembourse en dernier. La "
          + "relation entre perte de rendement et défaut n'est donc **ni linéaire ni "
          + "proportionnelle** — elle est brutale au-delà d'un seuil.\n\n"
          + "Retenez cette non-linéarité : elle explique pourquoi un portefeuille peut absorber "
          + "une mauvaise saison et s'effondrer à la suivante.",
      },
      {
        type: "quiz",
        question:
          "Un décalage progressif de la date d'installation des pluies sur dix ans relève :",
        opts: [
          "Du risque physique aigu",
          "Du risque physique chronique",
          "Du risque de transition",
          "Ce n'est pas un risque de crédit",
        ],
        ans: 1,
      },
      {
        type: "quiz",
        question:
          "Une coopérative de cacao perd son acheteur européen faute de traçabilité de ses parcelles. Pour le SFD qui l'a financée, c'est :",
        opts: [
          "Un risque physique",
          "Un risque de transition, donc un risque de crédit",
          "Un risque opérationnel",
          "Un risque hors du champ climatique",
        ],
        ans: 1,
      },
      {
        type: "exercise",
        id: "fca1e1",
        kind: "choice",
        title: "Identifier la nature du risque",
        prompt:
          "Une inondation en septembre détruit les stocks entreposés d'une union de producteurs, "
          + "juste avant la commercialisation. De quel risque s'agit-il ?",
        opts: [
          "Risque physique aigu",
          "Risque physique chronique",
          "Risque de transition",
          "Risque de contrepartie classique, sans dimension climatique",
        ],
        answer: 0,
        explain:
          "Événement daté, soudain, aux conséquences directes : **risque physique aigu**. "
          + "Le chronique désignerait une dérive lente ; la transition, un changement de règle "
          + "ou de marché.",
      },
      {
        type: "exercise",
        id: "fca1e2",
        kind: "choice",
        title: "Le maillon le plus mal compris",
        prompt:
          "Dans la chaîne de transmission, à quel maillon la relation entre le choc et son effet "
          + "cesse-t-elle d'être proportionnelle ?",
        opts: [
          "Entre l'aléa climatique et le rendement",
          "Entre le revenu du ménage et sa capacité de remboursement",
          "Entre le portefeuille du SFD et la banque de refinancement",
          "La relation est proportionnelle tout au long de la chaîne",
        ],
        answer: 1,
        explain:
          "Un ménage arbitre entre se nourrir, scolariser et rembourser. Une perte de rendement "
          + "de 40 % ne produit pas une baisse de remboursement de 40 % : l'effet est faible "
          + "sous un certain seuil, puis brutal au-delà. **C'est cette non-linéarité qui rend un "
          + "portefeuille capable d'absorber une mauvaise saison et de s'effondrer à la suivante.**",
      },
      {
        type: "exercise",
        id: "fca1e3",
        kind: "text",
        title: "Le terme exact",
        prompt:
          "Comment nomme-t-on la famille de risque qui provient du changement des règles, des "
          + "marchés et des technologies, par opposition à l'événement climatique lui-même ?",
        answer: "transition",
        accept: ["risque de transition", "transitionnel"],
        explain:
          "**Risque de transition.** Il se distingue du risque physique, qui désigne l'aléa "
          + "climatique et ses conséquences directes.",
      },
      {
        type: "resource",
        title: "Taux d'usure applicable aux SFD dans l'UMOA",
        url: "https://www.bceao.int/fr/documents/taux-dusure-pour-les-operations-de-credit-des-sfd-dans-la-zone-umoa",
        desc:
          "La référence réglementaire de la BCEAO. Elle servira dès la leçon 3 : c'est le "
          + "plafond qui décide si un crédit agricole reste finançable.",
        provider: "BCEAO",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    ordre: 2,
    titre: "La perte attendue : EAD, PD, LGD",
    points: 100,
    cellules: [
      {
        type: "md",
        content:
          "## Une formule, et rien de plus\n\n"
          + "Toute l'analyse de risque de crédit tient dans une multiplication :\n\n"
          + "```\nEL = EAD × PD × LGD\n```\n\n"
          + "- **EAD** — *Exposure at Default*, l'encours exposé au moment du défaut. Pour un prêt "
          + "de campagne, c'est le capital restant dû à l'échéance.\n"
          + "- **PD** — *Probability of Default*, la probabilité que l'emprunteur fasse défaut sur "
          + "la période.\n"
          + "- **LGD** — *Loss Given Default*, la part de l'exposition réellement perdue une fois "
          + "les recouvrements et garanties déduits.\n"
          + "- **EL** — *Expected Loss*, la perte attendue.\n\n"
          + "### Pourquoi cette formule est vraie\n\n"
          + "Ce n'est pas une convention : c'est une espérance mathématique. Deux issues "
          + "possibles, pondérées par leur probabilité.\n\n"
          + "Prenons un prêt de **500 000 FCFA**, avec une probabilité de défaut de **6 %** et une "
          + "perte en cas de défaut de **40 %**.\n\n"
          + "- Avec 94 % de chances : pas de défaut, perte nulle.\n"
          + "- Avec 6 % de chances : défaut, et l'on perd 40 % de 500 000, soit 200 000 FCFA.\n\n"
          + "```\nEL = 0,94 × 0  +  0,06 × 200 000  =  12 000 FCFA\n```\n\n"
          + "Ce qui revient exactement à `500 000 × 0,06 × 0,40`. **La formule n'est qu'une "
          + "espérance écrite de façon compacte.**",
      },
      {
        type: "callout",
        title: "Ce que la perte attendue n'est pas",
        variant: "warning",
        content:
          "Ce n'est pas ce que vous allez perdre. Aucun prêt individuel ne perd 12 000 FCFA : "
          + "il perd 0 ou 200 000. La perte attendue n'a de sens que sur un ensemble de prêts, "
          + "ou répétée sur de nombreuses saisons. Sur un portefeuille de mille prêts, elle "
          + "devient une prévision fiable ; sur un prêt, elle ne prédit rien.",
      },
      {
        type: "md",
        content:
          "## Ce qui rend un prêt agricole différent\n\n"
          + "### La LGD dépend de garanties qui n'existent souvent pas\n\n"
          + "En crédit d'entreprise, la LGD se réduit par la saisie d'un actif. En crédit agricole "
          + "de campagne, l'actif est une récolte qui n'existe plus, sur une terre souvent détenue "
          + "en droit coutumier, non hypothécable. La LGD est donc **structurellement élevée** — et "
          + "elle monte précisément quand elle ne devrait pas.\n\n"
          + "Une caution solidaire de groupe, par exemple, protège très bien contre un défaut "
          + "individuel : les autres membres couvrent. Elle ne protège pas du tout contre une "
          + "sécheresse : tous les membres du groupe sont frappés en même temps, et le mécanisme "
          + "qui devait amortir se révèle inopérant au moment exact où l'on en a besoin.\n\n"
          + "### La PD n'est pas une donnée d'agence\n\n"
          + "Aucune agence ne note un producteur de maïs. La PD s'estime à partir de l'historique "
          + "de l'institution : taux de défaut observé par produit, par zone, par culture. C'est "
          + "imparfait, et c'est ce dont vous disposez.\n\n"
          + "### Le différé change l'EAD\n\n"
          + "Un crédit de campagne comporte un différé : on ne rembourse rien avant la récolte. "
          + "L'exposition reste donc **maximale jusqu'à l'échéance**, au lieu de décroître mois "
          + "après mois comme un crédit à la consommation. À montant égal, un crédit de campagne "
          + "expose davantage qu'un crédit amortissable.",
      },
      {
        type: "quiz",
        question:
          "Un prêt de 800 000 FCFA, PD = 5 %, LGD = 50 %. Quelle est la perte attendue ?",
        opts: ["4 000 FCFA", "20 000 FCFA", "40 000 FCFA", "400 000 FCFA"],
        ans: 1,
      },
      {
        type: "exercise",
        id: "fca2e1",
        kind: "number",
        title: "Perte attendue d'un prêt",
        prompt:
          "Un SFD accorde un crédit de campagne de 750 000 FCFA. Sur ce produit et cette zone, "
          + "il observe historiquement un taux de défaut de 8 %. En cas de défaut, il récupère "
          + "en moyenne 35 % de l'encours. Quelle est la perte attendue, en FCFA ?",
        answer: 39000,
        tolerance: 500,
        unit: "FCFA",
        hint: "Attention : on vous donne le taux de RECOUVREMENT, pas la LGD.",
        explain:
          "Le piège est le taux de recouvrement. Si l'on récupère 35 %, alors **LGD = 65 %**.\n\n"
          + "`EL = 750 000 × 0,08 × 0,65 = 39 000 FCFA`\n\n"
          + "Confondre recouvrement et LGD conduit ici à annoncer 21 000 FCFA — une "
          + "sous-estimation de 46 %.",
      },
      {
        type: "exercise",
        id: "fca2e2",
        kind: "number",
        title: "Perte attendue d'un portefeuille, en pourcentage",
        prompt:
          "Portefeuille agricole fictif : 1 200 prêts, encours total 480 millions FCFA, "
          + "PD moyenne 7 %, LGD moyenne 60 %. Exprimez la perte attendue en pourcentage de "
          + "l'encours.",
        answer: 4.2,
        tolerance: 0.05,
        unit: "%",
        explain:
          "En pourcentage, l'encours se simplifie : `EL% = PD × LGD = 0,07 × 0,60 = 4,2 %`.\n\n"
          + "Soit **20,16 millions FCFA** sur 480 millions. Le raisonnement en pourcentage est "
          + "celui à privilégier : il se compare d'une institution à l'autre, et il se branche "
          + "directement sur la tarification, comme on le verra à la leçon suivante.",
      },
      {
        type: "exercise",
        id: "fca2e3",
        kind: "number",
        title: "L'effet d'une mauvaise saison",
        prompt:
          "Même portefeuille. Une saison déficitaire fait passer la PD de 7 % à 18 %, et la LGD "
          + "de 60 % à 75 % — les garanties se déprécient au moment même où l'on doit les "
          + "actionner. Quelle est la nouvelle perte attendue, en pourcentage de l'encours ?",
        answer: 13.5,
        tolerance: 0.1,
        unit: "%",
        explain:
          "`0,18 × 0,75 = 13,5 %`, contre 4,2 % en saison normale — **plus du triple**.\n\n"
          + "Notez que la PD a été multipliée par 2,6 et la LGD par 1,25 seulement, mais que "
          + "l'effet se multiplie : c'est le produit des deux dégradations. C'est pourquoi une "
          + "analyse qui ne fait varier que la PD sous-estime systématiquement le choc.",
      },
      {
        type: "exercise",
        id: "fca2e4",
        kind: "choice",
        title: "La caution solidaire face à la sécheresse",
        prompt:
          "Un SFD couvre ses crédits agricoles par caution solidaire de groupe. Face à une "
          + "sécheresse généralisée sur la zone, ce mécanisme :",
        opts: [
          "Réduit fortement la LGD, car le groupe rembourse pour le défaillant",
          "N'a presque aucun effet, car tous les membres sont frappés simultanément",
          "Réduit la PD mais pas la LGD",
          "Transfère le risque à la banque de refinancement",
        ],
        answer: 1,
        explain:
          "La caution solidaire mutualise un risque **idiosyncrasique** — la maladie ou l'accident "
          + "d'un membre. Elle est inopérante contre un risque **systématique** qui frappe tout le "
          + "groupe en même temps.\n\n"
          + "C'est le cœur du problème du risque climatique en crédit agricole : **il détruit la "
          + "diversification au moment précis où on en a besoin.**",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    ordre: 3,
    titre: "Le seuil de rentabilité sous plafond d'usure",
    points: 120,
    cellules: [
      {
        type: "md",
        content:
          "## Le fait qui rend cette leçon urgente\n\n"
          + "Par la décision **n°19/29-12-2025/CM/UMOA**, le Conseil des Ministres de l'UMOA a "
          + "abaissé les plafonds de taux d'usure applicables dans les huit pays de l'Union, avec "
          + "effet au **1er juin 2026** :\n\n"
          + "| Catégorie | Ancien plafond | Nouveau plafond |\n"
          + "|---|---|---|\n"
          + "| Banques | 15 % | **14 %** |\n"
          + "| Systèmes financiers décentralisés (SFD) | 27 % | **24 %** |\n\n"
          + "Ces plafonds s'entendent en **TAEG** — taux annuel effectif global — c'est-à-dire tous "
          + "frais compris, et non au seul taux d'intérêt nominal.\n\n"
          + "Trois points de marge en moins pour les SFD, au moment même où le risque climatique "
          + "pousse la perte attendue vers le haut. **Ces deux mouvements vont en sens contraire, "
          + "et leur rencontre se calcule.**",
      },
      {
        type: "md",
        content:
          "## La décomposition d'un taux\n\n"
          + "Le taux facturé à l'emprunteur doit couvrir quatre choses, et une seule est du profit :\n\n"
          + "```\nTAEG  =  coût des ressources\n       +  coût opérationnel\n       +  perte attendue (EL%)\n       +  marge\n```\n\n"
          + "Le **coût des ressources** est ce que l'institution paie pour l'argent qu'elle prête. "
          + "Le **coût opérationnel** est ce que coûte le fait de prêter : agents de crédit, "
          + "déplacements en zone rurale, suivi. Il est structurellement élevé en agriculture — "
          + "des petits montants dispersés sur de longues distances.\n\n"
          + "La **perte attendue** est ce que vous avez appris à calculer à la leçon 2.\n\n"
          + "La **marge** est ce qui reste.\n\n"
          + "### D'où sort le seuil\n\n"
          + "Réarrangeons. Si le TAEG ne peut pas dépasser le plafond réglementaire, alors :\n\n"
          + "```\nEL%_max  =  plafond − ressources − opérationnel − marge minimale\n```\n\n"
          + "Au-delà de cette perte attendue, **le crédit n'est plus finançable dans les règles**. "
          + "L'institution ne peut pas répercuter le risque dans le prix. Elle a trois options, "
          + "et trois seulement : réduire son coût opérationnel, transférer le risque, ou sortir "
          + "de l'agriculture.\n\n"
          + "C'est cette troisième option qui explique pourquoi le crédit agricole reste rare dans "
          + "la région — et ce n'est pas un manque de volonté, c'est une contrainte arithmétique.",
      },
      {
        type: "callout",
        title: "L'argument qui fait la différence dans une note",
        variant: "tip",
        content:
          "La plupart des notes plaident « il faut plus de crédit agricole ». Celle qui pose "
          + "l'équation ci-dessus montre POURQUOI il n'y en a pas, et rend chiffrable ce que "
          + "coûterait de le rendre possible : combien de points de garantie, ou combien de "
          + "points de coût opérationnel en moins. C'est ce passage du vœu au chiffre qui fait "
          + "qu'un dossier passe la diligence.",
      },
      {
        type: "quiz",
        question:
          "Le plafond d'usure applicable aux SFD dans l'UMOA depuis le 1er juin 2026 est de :",
        opts: ["15 % TAEG", "24 % TAEG", "27 % TAEG", "14 % TAEG"],
        ans: 1,
      },
      {
        type: "quiz",
        question: "Le plafond de taux d'usure s'apprécie sur :",
        opts: [
          "Le taux d'intérêt nominal seul",
          "Le TAEG, tous frais compris",
          "Le taux après subvention publique",
          "La marge nette de l'institution",
        ],
        ans: 1,
      },
      {
        type: "exercise",
        id: "fca3e1",
        kind: "number",
        title: "La perte attendue maximale finançable",
        prompt:
          "Un SFD fictif supporte un coût des ressources de 6 %, un coût opérationnel de 9 %, et "
          + "s'impose une marge minimale de 2 %. Sous le plafond d'usure de 24 % TAEG, quelle est "
          + "la perte attendue maximale qu'il peut absorber, en pourcentage ?",
        answer: 7,
        tolerance: 0.1,
        unit: "%",
        explain:
          "`24 − 6 − 9 − 2 = 7 %`.\n\n"
          + "Au-delà de 7 % de perte attendue, ce SFD ne peut plus tarifer le risque dans les "
          + "règles. Rapprochez ce chiffre de la leçon 2 : le portefeuille y affichait 4,2 % en "
          + "saison normale — **il tient**, avec de la marge.",
      },
      {
        type: "exercise",
        id: "fca3e2",
        kind: "choice",
        title: "La saison déficitaire",
        prompt:
          "Même SFD, seuil de 7 %. Survient la saison déficitaire de la leçon 2, qui porte la "
          + "perte attendue à 13,5 %. Que peut-on conclure ?",
        opts: [
          "Le portefeuille reste finançable, la marge absorbe le choc",
          "La perte attendue dépasse de 6,5 points ce que le plafond permet de tarifer",
          "Il suffit d'augmenter le taux pour couvrir la perte",
          "Le plafond d'usure ne s'applique pas en cas de sinistre climatique",
        ],
        answer: 1,
        explain:
          "13,5 % contre 7 % finançables : **un dépassement de 6,5 points**. Augmenter le taux "
          + "est illégal au-delà de 24 % TAEG, et aucune dérogation climatique n'existe.\n\n"
          + "L'institution ne peut donc que réduire son coût opérationnel, transférer le risque "
          + "(garantie, assurance, refinancement concessionnel), ou cesser de prêter à "
          + "l'agriculture. **C'est exactement le calcul qui doit figurer dans une demande de "
          + "fonds de garantie** — il transforme une demande en démonstration.",
      },
      {
        type: "exercise",
        id: "fca3e3",
        kind: "number",
        title: "Ce qu'a coûté le resserrement",
        prompt:
          "Le plafond SFD est passé de 27 % à 24 %. Toutes choses égales par ailleurs, de combien "
          + "de points de pourcentage la perte attendue maximale finançable a-t-elle été réduite ?",
        answer: 3,
        tolerance: 0.01,
        unit: "points",
        explain:
          "**3 points.** Le seuil de notre SFD est passé de 10 % à 7 %.\n\n"
          + "Autrement dit, un portefeuille à 8 % de perte attendue était finançable avant le "
          + "1er juin 2026 et ne l'est plus. La réforme n'a pas visé l'agriculture, mais c'est "
          + "l'agriculture — dont la perte attendue est la plus élevée — qui en absorbe l'essentiel "
          + "de l'effet.",
      },
      {
        type: "exercise",
        id: "fca3e4",
        kind: "number",
        title: "Combien de garantie faut-il",
        prompt:
          "Le portefeuille est à 13,5 % de perte attendue, le seuil finançable à 7 %. Un fonds de "
          + "garantie couvre une part des pertes. Quelle part de la perte attendue doit-il "
          + "absorber, en pourcentage de cette perte, pour que le portefeuille redevienne "
          + "finançable ?",
        answer: 48.1,
        tolerance: 1.5,
        unit: "%",
        hint: "Quelle fraction de 13,5 faut-il retirer pour tomber à 7 ?",
        explain:
          "Il faut ramener 13,5 % à 7 %, soit retirer 6,5 points.\n\n"
          + "`6,5 / 13,5 = 48,1 %`\n\n"
          + "**Une garantie couvrant environ la moitié des pertes rend le portefeuille "
          + "finançable.** Cette phrase, avec ce chiffre, vaut mieux que dix pages sur "
          + "l'importance de soutenir l'agriculture : elle dit exactement ce qu'on demande et "
          + "pourquoi ce montant-là.",
      },
      {
        type: "resource",
        title: "Décision de recalibrage des taux d'usure dans l'UEMOA",
        url: "https://www.financialafrik.com/2026/07/27/taux-dusure-dans-luemoa-le-recalibrage-opere-par-la-decision-n19-29-12-2025-cm-umoa/",
        desc:
          "Analyse de la décision n°19/29-12-2025/CM/UMOA et de ses effets sur les banques et "
          + "les SFD. À lire avant de rédiger toute note de tarification.",
        provider: "Financial Afrik",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    ordre: 4,
    titre: "La concentration : pourquoi mille prêts ne font pas mille risques",
    points: 100,
    cellules: [
      {
        type: "md",
        content:
          "## L'illusion du grand nombre\n\n"
          + "Un comité de crédit se rassure volontiers : « nous avons mille emprunteurs, le risque "
          + "est dilué ». C'est vrai pour la maladie, l'accident, la mauvaise gestion — des "
          + "événements **indépendants** d'un emprunteur à l'autre.\n\n"
          + "C'est faux pour la pluie.\n\n"
          + "Si mille emprunteurs cultivent le maïs dans la même zone, ils ne constituent pas mille "
          + "risques indépendants : ils constituent **un seul risque, souscrit mille fois**. Une "
          + "saison déficitaire les frappe ensemble.\n\n"
          + "### Deux natures de risque\n\n"
          + "- **Idiosyncrasique** — propre à un emprunteur. Se dilue dans le nombre. C'est ce que "
          + "la caution solidaire couvre bien.\n"
          + "- **Systématique** — commun à tous les emprunteurs exposés au même facteur. **Ne se "
          + "dilue pas**, quel que soit le nombre de prêts.\n\n"
          + "Le risque climatique est systématique par nature. Ajouter des emprunteurs dans la "
          + "même zone et la même culture n'améliore rien : cela augmente l'exposition sans "
          + "réduire la probabilité que tout tombe en même temps.",
      },
      {
        type: "callout",
        title: "La question à poser en comité",
        variant: "tip",
        content:
          "« Combien perdons-nous si la saison est mauvaise dans notre principale zone ? » "
          + "Un portefeuille qui ne sait pas répondre à cette question ne connaît pas son "
          + "risque, quel que soit le nombre de ses emprunteurs.",
      },
      {
        type: "md",
        content:
          "## Mesurer la concentration\n\n"
          + "### La part de la plus grosse exposition\n\n"
          + "La mesure la plus simple, et souvent suffisante : quelle part de l'encours est "
          + "exposée au même facteur ? Même zone, même culture, même calendrier cultural.\n\n"
          + "### L'indice de Herfindahl (HHI)\n\n"
          + "Quand on veut un chiffre unique qui résume la répartition, on somme les carrés des "
          + "parts :\n\n"
          + "```\nHHI = Σ (part_i)²\n```\n\n"
          + "où chaque part est exprimée en fraction de l'encours total.\n\n"
          + "- Concentration totale sur une seule zone : `HHI = 1² = 1`\n"
          + "- Quatre zones parfaitement égales : `HHI = 4 × 0,25² = 0,25`\n\n"
          + "**L'inverse du HHI donne un nombre d'expositions équivalentes.** Un HHI de 0,25 "
          + "signifie que le portefeuille se comporte comme s'il était réparti sur 4 zones "
          + "indépendantes ; un HHI de 0,5 comme s'il n'y en avait que 2.\n\n"
          + "C'est cette lecture qui parle à un comité : « nos onze zones se comportent comme "
          + "trois ».",
      },
      {
        type: "md",
        content:
          "## La diversification qui n'en est pas une\n\n"
          + "Trois pièges classiques, tous rencontrés sur le terrain :\n\n"
          + "**Diversifier les cultures sans diversifier le calendrier.** Maïs, sorgho et niébé "
          + "dans la même zone dépendent tous de la même saison des pluies. Trois cultures, un "
          + "seul facteur.\n\n"
          + "**Diversifier les zones sans regarder la distance.** Deux zones voisines de vingt "
          + "kilomètres partagent le même régime pluviométrique. Deux lignes dans le tableau, "
          + "une seule exposition.\n\n"
          + "**Compter les emprunteurs au lieu de l'encours.** Neuf cents petits prêts dans une "
          + "zone et cent gros prêts dans une autre peuvent représenter le même encours. C'est "
          + "l'encours qui se perd, pas le nombre de dossiers.",
      },
      {
        type: "quiz",
        question:
          "Un portefeuille réparti à parts égales sur cinq zones a un HHI de :",
        opts: ["0,05", "0,20", "0,25", "0,50"],
        ans: 1,
      },
      {
        type: "exercise",
        id: "fca4e1",
        kind: "number",
        title: "Calculer un HHI",
        prompt:
          "Portefeuille fictif réparti ainsi : zone A 50 % de l'encours, zone B 30 %, zone C 20 %. "
          + "Calculez l'indice de Herfindahl. Donnez trois décimales.",
        answer: 0.38,
        tolerance: 0.005,
        explain:
          "`0,50² + 0,30² + 0,20² = 0,25 + 0,09 + 0,04 = 0,38`\n\n"
          + "L'inverse vaut `1 / 0,38 ≈ 2,6`. Malgré ses trois zones, ce portefeuille se comporte "
          + "comme s'il n'en comptait que **2,6 indépendantes**.",
      },
      {
        type: "exercise",
        id: "fca4e2",
        kind: "number",
        title: "La perte dans le scénario concentré",
        prompt:
          "Encours total 480 millions FCFA, réparti 50 / 30 / 20 sur trois zones. Une saison "
          + "déficitaire frappe la seule zone A et y porte la perte attendue à 13,5 %, tandis que "
          + "B et C restent à 4,2 %. Quelle est la perte attendue du portefeuille entier, en "
          + "pourcentage de l'encours ?",
        answer: 8.85,
        tolerance: 0.1,
        unit: "%",
        hint: "Moyenne pondérée par les parts d'encours.",
        explain:
          "`0,50 × 13,5 + 0,30 × 4,2 + 0,20 × 4,2 = 6,75 + 1,26 + 0,84 = 8,85 %`\n\n"
          + "Un choc sur une seule zone — mais celle qui pèse la moitié de l'encours — porte "
          + "l'ensemble du portefeuille de 4,2 % à 8,85 %. Rapproché du seuil finançable de 7 % "
          + "de la leçon 3 : **le portefeuille bascule hors des règles alors que deux zones sur "
          + "trois vont bien.** C'est la démonstration qu'aucun comptage d'emprunteurs ne peut "
          + "produire.",
      },
      {
        type: "exercise",
        id: "fca4e3",
        kind: "choice",
        title: "Reconnaître une fausse diversification",
        prompt:
          "Un SFD annonce avoir diversifié : il finance désormais le maïs, le sorgho et le niébé, "
          + "tous dans le même bassin de production. Que vaut cette diversification face au risque "
          + "climatique ?",
        opts: [
          "Elle divise le risque systématique par trois",
          "Elle réduit le risque de prix, mais pas le risque climatique",
          "Elle élimine le risque de concentration",
          "Elle n'a aucun effet sur aucun risque",
        ],
        answer: 1,
        explain:
          "Trois cultures aux débouchés différents amortissent effectivement un choc de **prix** "
          + "sur l'une d'elles. Mais elles dépendent de **la même saison des pluies dans le même "
          + "bassin** : le facteur climatique reste unique.\n\n"
          + "Diversifier contre le climat suppose de diversifier ce qui fait le climat — les "
          + "zones, les régimes pluviométriques, les calendriers culturaux — pas les espèces.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    ordre: 5,
    titre: "Lire un produit d'assurance indicielle",
    points: 120,
    cellules: [
      {
        type: "md",
        content:
          "## Le produit qu'on vous proposera\n\n"
          + "L'assurance indicielle paie sur la base d'un **indice mesurable** — un cumul "
          + "pluviométrique, un indice de végétation satellitaire — et non sur la constatation "
          + "d'une perte chez l'assuré.\n\n"
          + "L'avantage est réel et il explique le succès du concept : pas d'expertise sur chaque "
          + "parcelle, donc des coûts de gestion faibles, un paiement rapide, et aucune incitation "
          + "à négliger sa culture pour toucher l'indemnité.\n\n"
          + "Le prix de cet avantage porte un nom.",
      },
      {
        type: "md",
        content:
          "## Le risque de base\n\n"
          + "**Le risque de base est l'écart entre ce que dit l'indice et ce qui s'est réellement "
          + "passé sur la parcelle.** Il se décline en deux fautes, très inégales :\n\n"
          + "| | L'indice déclenche | L'indice ne déclenche pas |\n"
          + "|---|---|---|\n"
          + "| **Le producteur a perdu** | Correct | **Faux négatif** |\n"
          + "| **Le producteur n'a pas perdu** | Faux positif | Correct |\n\n"
          + "Le **faux positif** coûte de l'argent à l'assureur. Désagréable, mais gérable.\n\n"
          + "Le **faux négatif** est autre chose. Le producteur a perdu sa récolte, il a payé sa "
          + "prime, et il ne reçoit rien. Il ne renouvellera pas, et il le dira au village. "
          + "**Un seul faux négatif visible détruit la confiance de toute une zone**, et c'est la "
          + "cause principale des abandons de produits indiciels documentés en Afrique de l'Ouest.\n\n"
          + "### D'où vient l'écart\n\n"
          + "- **Spatial** — la station ou le pixel satellitaire est à quinze kilomètres de la "
          + "parcelle. En zone soudano-sahélienne, un orage peut tomber sur un village et pas sur "
          + "le suivant.\n"
          + "- **Temporel** — l'indice mesure un cumul mensuel, mais ce qui a tué la culture est "
          + "une séquence sèche de douze jours en pleine floraison. Le cumul peut être normal et "
          + "la récolte perdue.\n"
          + "- **De produit** — l'indice mesure la pluie, alors que la perte venait des ravageurs, "
          + "d'un semis tardif ou d'un manque d'intrants.",
      },
      {
        type: "callout",
        title: "La question que personne ne pose à l'assureur",
        variant: "warning",
        content:
          "« Sur les dix dernières saisons dans MA zone, combien de fois votre indice aurait-il "
          + "payé alors qu'il n'y avait pas de perte, et combien de fois n'aurait-il PAS payé "
          + "alors qu'il y avait perte ? » Si l'assureur ne peut pas répondre avec des chiffres, "
          + "il ne connaît pas le risque de base de son propre produit — et vous ne devriez pas "
          + "l'acheter pour vos emprunteurs.",
      },
      {
        type: "md",
        content:
          "## Les trois questions à poser\n\n"
          + "**1. Où est mesuré l'indice, et à quelle distance de mes emprunteurs ?**\n"
          + "Une station de référence à cinquante kilomètres rend le produit douteux. Demandez "
          + "les coordonnées, mesurez la distance.\n\n"
          + "**2. Sur quelle fenêtre temporelle, et correspond-elle au cycle de la culture ?**\n"
          + "Un indice de cumul saisonnier ignore les séquences sèches. Un indice qui découpe le "
          + "cycle en phases — installation, floraison, remplissage — colle mieux à la biologie de "
          + "la plante.\n\n"
          + "**3. Quel est le taux de faux négatifs observé, et sur quelles données de terrain ?**\n"
          + "C'est la question décisive. Y répondre exige des rendements observés à la parcelle — "
          + "une vérité terrain que presque personne ne collecte. **C'est précisément pourquoi ce "
          + "chiffre n'est presque jamais publié.**\n\n"
          + "Un prêteur qui collecte lui-même cette vérité terrain sur ses propres emprunteurs "
          + "détient une information que l'assureur n'a pas. Cela change le rapport de force dans "
          + "la négociation, et cela change le produit qu'on vous vendra.",
      },
      {
        type: "quiz",
        question: "Le risque de base, dans un produit indiciel, désigne :",
        opts: [
          "Le risque que l'assureur fasse faillite",
          "L'écart entre ce que dit l'indice et la perte réelle sur la parcelle",
          "Le taux de prime de base avant chargements",
          "Le risque que la prime augmente d'une année sur l'autre",
        ],
        ans: 1,
      },
      {
        type: "exercise",
        id: "fca5e1",
        kind: "choice",
        title: "Quelle erreur tue le produit",
        prompt:
          "Des deux erreurs possibles d'un indice, laquelle compromet le plus durablement "
          + "l'adoption du produit, et pourquoi ?",
        opts: [
          "Le faux positif, car il coûte de l'argent à l'assureur",
          "Le faux négatif, car le producteur sinistré ne reçoit rien et la confiance se perd",
          "Les deux ont exactement le même effet",
          "Aucune, tant que la prime reste subventionnée",
        ],
        answer: 1,
        explain:
          "Le faux positif coûte à l'assureur, qui peut l'absorber ou le tarifer. Le **faux "
          + "négatif** frappe un producteur sinistré qui avait payé : il ne renouvelle pas, et il "
          + "le fait savoir.\n\n"
          + "C'est la cause principale des abandons documentés de produits indiciels dans la "
          + "région. Un produit techniquement correct en moyenne peut mourir de quelques faux "
          + "négatifs très visibles.",
      },
      {
        type: "exercise",
        id: "fca5e2",
        kind: "number",
        title: "Chiffrer le risque de base",
        prompt:
          "Données fictives de vérité terrain sur dix saisons dans une zone. Il y a eu perte "
          + "significative lors de 4 saisons. L'indice a déclenché lors de 3 saisons, dont "
          + "2 correspondaient à une perte réelle. Combien de faux négatifs compte-t-on ?",
        answer: 2,
        tolerance: 0.01,
        explain:
          "4 saisons de perte réelle, dont 2 seulement ont été couvertes : il reste **2 faux "
          + "négatifs**.\n\n"
          + "Sur 4 sinistres, l'indice en a manqué la moitié. Autrement dit, **un producteur "
          + "sinistré avait une chance sur deux de ne rien toucher.** Aucun argumentaire "
          + "commercial ne survit à ce chiffre — encore faut-il l'avoir calculé.",
      },
      {
        type: "exercise",
        id: "fca5e3",
        kind: "number",
        title: "Le taux de détection",
        prompt:
          "Mêmes données. Quel pourcentage des pertes réelles l'indice a-t-il effectivement "
          + "couvertes ?",
        answer: 50,
        tolerance: 0.5,
        unit: "%",
        explain:
          "`2 pertes couvertes / 4 pertes réelles = 50 %`.\n\n"
          + "C'est le taux de détection. Un produit qui couvre la moitié des sinistres n'est pas "
          + "une assurance : c'est une loterie dont la prime est certaine et l'indemnité "
          + "aléatoire. **Exigez ce chiffre avant de signer, pour votre zone.**",
      },
      {
        type: "exercise",
        id: "fca5e4",
        kind: "text",
        title: "L'origine de l'écart",
        prompt:
          "Un indice fondé sur le cumul pluviométrique mensuel ne détecte pas une séquence sèche "
          + "de douze jours survenue pendant la floraison, alors que la récolte est perdue. "
          + "Quelle dimension du risque de base est ici en cause : spatiale, temporelle ou de "
          + "produit ?",
        answer: "temporelle",
        accept: ["temporel", "temporelle", "risque de base temporel"],
        explain:
          "**Temporelle.** Le cumul mensuel peut être parfaitement normal tout en masquant une "
          + "séquence sèche destructrice au moment critique du cycle.\n\n"
          + "Le remède connu est de découper l'indice par phase phénologique — installation, "
          + "floraison, remplissage — au lieu de sommer la saison entière.",
      },
      {
        type: "resource",
        title: "Assurance indicielle et risque de base en Afrique subsaharienne",
        url: "https://link.springer.com/article/10.1186/s40100-015-0044-3",
        desc:
          "Revue des enseignements et implications de politique publique. Documente le risque de "
          + "base comme principal frein à la diffusion des produits indiciels.",
        provider: "Agricultural and Food Economics",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    ordre: 6,
    titre: "Écrire la note qui débloque le financement",
    points: 140,
    cellules: [
      {
        type: "md",
        content:
          "## Ce que les institutions achètent réellement\n\n"
          + "Les appels publiés dans la sous-région — AGRHYMET, ARAA de la CEDEAO, PNUE, PNUD — "
          + "demandent des **critères de bancabilité**, des **plans d'investissement adossés aux "
          + "contributions déterminées au niveau national**, de la **mobilisation de ressources**. "
          + "Aucun ne demande de modélisation.\n\n"
          + "Le Fonds Vert pour le Climat compte **62 entités accréditées en accès direct contre "
          + "173 encore engagées dans le processus**. Le goulot n'est ni la science ni la volonté "
          + "politique : c'est le dossier.\n\n"
          + "Ce que vous produisez à la fin de ce cours n'est donc pas un modèle. C'est **une note "
          + "de trois pages qui transforme un besoin en demande chiffrée**.",
      },
      {
        type: "md",
        content:
          "## La structure qui passe la diligence\n\n"
          + "### 1. Le problème, en un chiffre\n\n"
          + "Pas « l'agriculture est vulnérable au changement climatique ». Plutôt : *« une saison "
          + "déficitaire porte la perte attendue de notre portefeuille agricole de 4,2 % à 13,5 %, "
          + "au-delà des 7 % que le plafond d'usure permet de tarifer. »*\n\n"
          + "Le premier énoncé se retrouve dans mille dossiers. Le second dans aucun.\n\n"
          + "### 2. L'exposition, cartographiée\n\n"
          + "Encours par zone et par culture, part de la principale exposition, indice de "
          + "concentration. Une carte vaut ici plus qu'un tableau : elle montre en un coup d'œil "
          + "que le portefeuille a souscrit trois fois le même risque.\n\n"
          + "### 3. Le mécanisme demandé, dimensionné\n\n"
          + "Pas « un appui ». Plutôt : *« une garantie couvrant 48 % des pertes ramène le "
          + "portefeuille sous le seuil finançable »*. On demande un montant, on montre le calcul, "
          + "on montre ce qui se passe sans.\n\n"
          + "### 4. Ce qui se passe si rien n'est fait\n\n"
          + "Le contrefactuel. Combien d'emprunteurs perdent l'accès au crédit, quel encours "
          + "agricole se retire. C'est la section que la plupart des notes omettent, et c'est "
          + "celle qui décide.\n\n"
          + "### 5. Comment on saura que ça a marché\n\n"
          + "Deux ou trois indicateurs vérifiables, avec leur base de référence. Un bailleur qui "
          + "ne voit pas comment il mesurera le résultat ne finance pas.",
      },
      {
        type: "callout",
        title: "La règle qui distingue les deux moitiés du dossier",
        variant: "warning",
        content:
          "Toute donnée réglementaire doit être datée et sourcée. Toute donnée de portefeuille "
          + "doit indiquer sa provenance et sa période. Une note qui mélange un plafond d'usure "
          + "sans date et des chiffres de portefeuille sans origine se fait écarter dès la "
          + "première lecture technique — non parce qu'elle est fausse, mais parce qu'elle est "
          + "invérifiable.",
      },
      {
        type: "md",
        content:
          "## Les trois fautes qui font écarter un dossier\n\n"
          + "**Le chiffre orphelin.** « Le rendement baissera de 20 % d'ici 2050. » D'où vient-il, "
          + "sous quel scénario, à quelle résolution spatiale ? Un chiffre sans provenance affaiblit "
          + "tout ce qui l'entoure, y compris ce qui était solide.\n\n"
          + "**L'échelle qui ne correspond pas à la décision.** Les projections climatiques "
          + "globales sont produites à des mailles de plusieurs dizaines de kilomètres. Une "
          + "décision de crédit se prend à la parcelle. Utiliser la première pour justifier la "
          + "seconde sans le dire est la faute la plus fréquente — et la plus facile à repérer "
          + "pour un évaluateur compétent.\n\n"
          + "**L'adaptation qui n'en est pas.** Un crédit de campagne ordinaire relabellisé "
          + "« adaptation » ne résiste pas à un examen sérieux. La question à laquelle il faut "
          + "pouvoir répondre est simple : *en quoi ce financement change-t-il la vulnérabilité, "
          + "par rapport à ce qui se serait passé sans lui ?*",
      },
      {
        type: "quiz",
        question:
          "Quelle formulation a le plus de chances de survivre à une diligence technique ?",
        opts: [
          "« L'agriculture de la zone est fortement vulnérable au changement climatique. »",
          "« Une saison à déficit marqué porte la perte attendue de 4,2 % à 13,5 %, au-delà des 7 % tarifables. »",
          "« Le changement climatique menace la sécurité alimentaire régionale. »",
          "« Les producteurs ont besoin d'un accompagnement renforcé. »",
        ],
        ans: 1,
      },
      {
        type: "exercise",
        id: "fca6e1",
        kind: "choice",
        title: "Repérer le chiffre orphelin",
        prompt:
          "Dans une note, laquelle de ces affirmations pose un problème de vérifiabilité ?",
        opts: [
          "« Plafond d'usure SFD : 24 % TAEG depuis le 1er juin 2026, décision n°19/29-12-2025/CM/UMOA. »",
          "« Encours agricole au 31 décembre 2025 : 480 millions FCFA, source : états financiers du SFD. »",
          "« Les rendements chuteront de 20 % d'ici 2050. »",
          "« Taux de défaut observé sur le produit campagne 2023-2025 : 7 %, source : système d'information de gestion. »",
        ],
        answer: 2,
        explain:
          "Les trois autres énoncés portent leur date et leur source. Le troisième n'a **ni "
          + "provenance, ni scénario d'émission, ni échelle spatiale, ni culture précisée**.\n\n"
          + "Un évaluateur qui bute sur ce chiffre se met à douter des autres — y compris de ceux "
          + "qui étaient solides. **Un chiffre orphelin contamine la note entière.**",
      },
      {
        type: "exercise",
        id: "fca6e2",
        kind: "number",
        title: "Le contrefactuel, chiffré",
        prompt:
          "Sans garantie, le SFD fictif décide de réduire son encours agricole pour ramener sa "
          + "perte attendue sous le seuil finançable. Il retire les 50 % d'encours de la zone la "
          + "plus exposée. Sur 1 200 emprunteurs répartis proportionnellement à l'encours, combien "
          + "perdent l'accès au crédit ?",
        answer: 600,
        tolerance: 1,
        explain:
          "`1 200 × 0,50 = 600 emprunteurs`.\n\n"
          + "C'est la phrase qui fait bouger un bailleur : **« sans ce mécanisme, 600 producteurs "
          + "perdent l'accès au crédit de campagne dès la prochaine saison. »** Elle ne relève ni "
          + "du plaidoyer ni de l'émotion — c'est une conséquence arithmétique de la décision "
          + "rationnelle du prêteur sous contrainte réglementaire.",
      },
      {
        type: "exercise",
        id: "fca6e3",
        kind: "choice",
        title: "L'adaptation, vraiment ?",
        prompt:
          "Un dossier présente comme « financement d'adaptation » un crédit de campagne classique, "
          + "aux mêmes conditions et pour les mêmes cultures qu'auparavant. Quelle objection un "
          + "évaluateur soulèvera-t-il ?",
        opts: [
          "Le montant demandé est trop faible",
          "Rien ne démontre en quoi la vulnérabilité change par rapport à la situation sans projet",
          "Le crédit de campagne n'est jamais éligible aux financements climatiques",
          "Il faudrait un cofinancement public obligatoire",
        ],
        answer: 1,
        explain:
          "Le test de l'adaptation est le **contrefactuel** : qu'est-ce qui change par rapport à "
          + "ce qui se serait passé sans le financement ?\n\n"
          + "Un crédit identique aux mêmes conditions ne réduit aucune vulnérabilité — il "
          + "reconduit l'existant. Ce serait de l'adaptation si les conditions étaient liées à "
          + "une pratique résiliente, si le calendrier de remboursement absorbait un choc "
          + "climatique, ou si le crédit était couplé à un transfert de risque.\n\n"
          + "Ce n'est pas une objection de forme : c'est ce qui distingue un financement "
          + "d'adaptation d'un relabellisage.",
      },
      {
        type: "exercise",
        id: "fca6e4",
        kind: "text",
        title: "La section qu'on oublie",
        prompt:
          "Quelle section, souvent absente des notes de demande de financement, décrit ce qui se "
          + "produirait en l'absence de l'intervention et pèse lourd dans la décision ? "
          + "Donnez le terme.",
        answer: "contrefactuel",
        accept: ["le contrefactuel", "scénario sans projet", "situation sans projet"],
        explain:
          "**Le contrefactuel** — la situation sans projet. Sans lui, rien ne permet d'attribuer "
          + "un effet au financement demandé, et le dossier ne se distingue pas d'une demande de "
          + "subvention ordinaire.",
      },
      {
        type: "resource",
        title: "Améliorer l'accès direct au Fonds Vert pour le Climat",
        url: "https://www.wri.org/technical-perspectives/insider-three-ways-improve-direct-access-green-climate-fund",
        desc:
          "Analyse des goulots d'étranglement de l'accréditation et du montage de projets pour "
          + "les entités des pays en développement. Utile pour comprendre ce qu'attend un "
          + "évaluateur.",
        provider: "World Resources Institute",
      },
    ],
  },
];
