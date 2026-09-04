/**
 * Contenu du cours COOP-02 — organiser les acteurs et structurer la filière.
 *
 * Second des deux cours du parcours « Coopératives et organisation des acteurs ».
 * COOP-01 donne la structure juridique ; celui-ci apprend à décider LAQUELLE, à quel
 * maillon, et pour rendre quel service. Sans lui, le parcours formerait des gens capables
 * de rédiger des statuts conformes pour une coopérative dont personne n'a vérifié qu'elle
 * avait une raison économique d'exister.
 *
 * ── La source ──
 *
 * Les « Directives opérationnelles sur le développement des filières agricoles en faveur
 * des pauvres » du FIDA, Division production durable, marchés et institutions, version
 * française de septembre 2026 : définition de la chaîne de valeur, les trois niveaux du
 * système, les trois piliers de l'approche, les trois trajectoires pro-pauvres, et les
 * exercices de ciblage, de priorisation et de cartographie.
 *
 * Le choix de cette méthode-là n'est pas neutre et il est assumé : c'est celle qu'emploient
 * les projets qui recruteront les titulaires du certificat. Apprendre un vocabulaire
 * maison obligerait à en apprendre un second le jour de l'embauche.
 *
 * ── Le cas fictif ──
 *
 * Le territoire, les cinq groupes de ménages et les trois filières (café, miel, maraîchage)
 * viennent des fiches d'exercice du FIDA et sont annoncés comme fictifs par leurs auteurs.
 * Ils sont repris tels quels plutôt que réinventés : un cas travaillé collectivement dans
 * des dizaines de sessions a été éprouvé, et le refabriquer n'aurait produit qu'un cas
 * plus faible avec l'illusion de l'originalité.
 *
 * ── Cinq leçons, et pas six ──
 *
 * Contrainte dure : la fenêtre d'admission est de trois mois, soit treize semaines, et
 * COOP-01 en occupe huit à une leçon par semaine. Une sixième leçon ne tiendrait pas.
 * C'est visible dans shared/programs.ts, et c'est vérifié par npm run verify:rythme.
 */

import type { Cellule, LeconCoop } from "./coop-01.js";

export const COOP_02 = {
  code: "COOP-02",
  titre: "Organiser les acteurs et structurer la filière",
  description:
    "Décider quelle organisation monter, à quel maillon, et pour rendre quel service. "
    + "Lire une filière comme un système à trois niveaux, désagréger un territoire avant "
    + "de choisir qui appuyer, arbitrer entre plusieurs filières sans se mentir, "
    + "cartographier les acteurs et les circuits, puis traduire la carte en structure "
    + "juridique. Méthode des directives opérationnelles du FIDA sur le développement des "
    + "filières en faveur des pauvres.",
  niveau: "intermediaire",
  outils: ["Analyse de filière", "Ciblage et désagrégation", "Cartographie des acteurs"],
};

export const LECONS_COOP_02: LeconCoop[] = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    ordre: 1,
    titre: "La filière est un système, pas une file d'attente",
    points: 100,
    cellules: [
      {
        type: "md",
        content:
          "## Ce que COOP-01 ne dit pas\n\n"
          + "Vous savez maintenant monter une société coopérative conforme : choisir la forme, "
          + "rédiger les dix-huit mentions, immatriculer, affecter les excédents, vous fédérer.\n\n"
          + "Reste la question que le droit ne pose jamais : **cette coopérative-là, pour faire "
          + "quoi, et à quel endroit de la filière ?**\n\n"
          + "C'est la question qui décide si la structure vivra. Des statuts irréprochables sur "
          + "une activité que personne ne demande produisent une coopérative morte-née — et "
          + "l'article 178 a) prévoit précisément son cas : n'avoir pas commencé ses opérations "
          + "dans les deux ans de l'immatriculation est une cause de dissolution.\n\n"
          + "Ce cours répond à cette question avec la méthode qu'emploient les projets qui vous "
          + "recruteront.",
      },
      {
        type: "md",
        content:
          "## La définition, et les quatre mots qui comptent\n\n"
          + "> Une chaîne de valeur est une **alliance verticale d'acteurs et d'entreprises** qui "
          + "collaborent à des degrés divers, dans un **ensemble d'activités** nécessaires au "
          + "développement d'un produit, depuis la fourniture d'intrants, à travers les étapes de "
          + "production, jusqu'à sa **destination finale sur le marché**.\n\n"
          + "Quatre mots portent tout le reste :\n\n"
          + "| Le mot | Ce qu'il implique |\n"
          + "|---|---|\n"
          + "| **alliance** | ce sont des relations, pas seulement des transactions |\n"
          + "| **verticale** | entre maillons différents, pas entre pairs |\n"
          + "| **activités** | on analyse des fonctions, pas des personnes |\n"
          + "| **marché final** | sans demande, il n'y a pas de filière |\n\n"
          + "Cette dernière ligne est la plus dure et la plus utile :\n\n"
          + "> **Des agriculteurs sans consommateurs, ce n'est pas une filière. C'est de "
          + "l'agriculture de subsistance.**\n\n"
          + "Et si un acteur clé manque — pas de transformateur, pas de collecteur — il n'y a pas "
          + "non plus de filière. S'il n'existe aucun lien entre les étapes, il n'y a pas "
          + "d'intégration : juste une succession d'acteurs qui s'ignorent.",
      },
      {
        type: "callout",
        title: "Chaîne d'approvisionnement et chaîne de valeur : deux outils, deux métiers",
        variant: "info",
        content:
          "Les deux termes s'échangent dans les conversations et ce sont pourtant deux outils "
          + "distincts.\n\n"
          + "La **chaîne d'approvisionnement** est un outil de gestion d'entreprise : elle est "
          + "orientée vers l'efficacité opérationnelle, se concentre sur une entreprise ou un "
          + "ensemble d'entreprises reliées, et analyse principalement les flux physiques.\n\n"
          + "La **chaîne de valeur** est une approche de développement : elle est orientée vers "
          + "la création ET la distribution de la valeur, prend en compte tous les acteurs, et "
          + "analyse aussi les flux d'**information**, d'**argent** et de **pouvoir**.\n\n"
          + "Confondre les deux a une conséquence concrète : on optimise la logistique d'un "
          + "acteur et on appelle ça du développement de filière, alors que la part captée par "
          + "les producteurs n'a pas bougé d'un franc.",
      },
      {
        type: "md",
        content:
          "## Quatre flux, dont deux qu'on ne regarde jamais\n\n"
          + "Le long de la filière circulent :\n\n"
          + "- le **produit**, du champ vers le consommateur ;\n"
          + "- l'**argent**, en sens inverse ;\n"
          + "- l'**information** — qualité attendue, prix, exigences, traçabilité ;\n"
          + "- le **pouvoir** — qui fixe le prix, qui décide des normes, qui peut se passer de "
          + "l'autre.\n\n"
          + "Les deux premiers se voient. Les deux derniers expliquent presque tout.\n\n"
          + "**Sur l'information** : celui qui ne sait pas ce que l'acheteur exige ne peut pas "
          + "améliorer sa position. Un producteur qui ignore qu'une prime existe pour un taux "
          + "d'humidité donné ne la touchera jamais — non par incompétence, par ignorance "
          + "entretenue.\n\n"
          + "**Sur l'argent** : les déséquilibres de flux financiers créent des inégalités et "
          + "maintiennent certains acteurs dans la précarité. La valeur du produit augmente à "
          + "chaque étape ; la question est de savoir où elle s'arrête de redescendre.",
      },
      {
        type: "md",
        content:
          "## L'iceberg : ce que vous voyez n'est pas le problème\n\n"
          + "```\n"
          + "  ──────────────────────────────────  surface\n"
          + "        prix bas · exclusion              SYMPTÔMES\n"
          + "        faible qualité · pertes\n"
          + "  ─────────────────────────────────────────────\n"
          + "     un seul acheteur · route coupée      CAUSES IMMÉDIATES\n"
          + "     pas de séchoir · pas de crédit\n"
          + "\n"
          + "     services absents · règles            CONTRAINTES\n"
          + "     inadaptées · information captée      STRUCTURELLES\n"
          + "\n"
          + "     rapports de pouvoir · normes         CAUSES PROFONDES\n"
          + "     sociales · absence d'organisation\n"
          + "```\n\n"
          + "**Les problèmes visibles — prix bas, exclusion, faible qualité — sont des "
          + "symptômes, pas le problème de fond.**\n\n"
          + "Le travail consiste à trouver les **points de levier** : les endroits où une action "
          + "petite mais bien placée produit un changement disproportionné. Traiter un symptôme "
          + "consomme un budget et laisse le système intact ; l'année suivante, le symptôme "
          + "revient et l'on conclut que « les producteurs ne suivent pas ».",
      },
      {
        type: "md",
        content:
          "## Les trois niveaux : micro, méso, macro\n\n"
          + "```\n"
          + "  MACRO   environnement favorable\n"
          + "          institutions formelles · normes sociales informelles\n"
          + "          infrastructures · organisations\n"
          + "            ▲\n"
          + "  MÉSO    services d'appui\n"
          + "          intrants · services · financement\n"
          + "            ▲\n"
          + "  MICRO   producteurs → agrégateurs → transformateurs\n"
          + "                     → commerçants → consommateurs\n"
          + "```\n\n"
          + "### Le niveau méso\n"
          + "Intrants, services techniques, financement. Ils peuvent être **indisponibles ou "
          + "inaccessibles** — à cause du prix, de la qualité ou de la distance.\n\n"
          + "> **Services défaillants → filière défaillante.**\n\n"
          + "### Le niveau macro\n"
          + "Quatre familles d'éléments : institutions **formelles** (politiques, "
          + "réglementations, lois, normes) ; éléments **socioculturels informels** (normes "
          + "sociales, règles non écrites, pratiques) ; **infrastructures** (électricité, routes, "
          + "réseaux) ; **organisations** (ministères, agences, associations "
          + "interprofessionnelles, centres de recherche, projets en cours).\n\n"
          + "Devant un environnement macro inadapté, deux réponses seulement : **s'adapter au "
          + "niveau micro**, ou **agir pour ajuster le macro**. La seconde est plus lente et "
          + "c'est souvent la seule qui dure.\n\n"
          + "**La règle qui en découle** : les problèmes s'expliquent rarement au seul niveau "
          + "micro. Une intervention efficace agit à plusieurs niveaux, de façon complémentaire.",
      },
      {
        type: "md",
        content:
          "## Qui est dans la filière, et comment ils se lient\n\n"
          + "**Acteurs directs** : les entreprises et les individus qui produisent ou "
          + "transforment le produit. Le critère est net — **ce sont ceux qui possèdent le "
          + "produit à un moment donné**, brut, semi-transformé ou fini.\n\n"
          + "**Parties prenantes** : terme plus large, qui englobe tout le monde — acteurs "
          + "directs, prestataires de services d'appui, institutions publiques.\n\n"
          + "Deux types de liens, et la distinction commande tout ce cours :\n\n"
          + "- **liens verticaux** — transactions entre opérateurs de maillons différents. Le "
          + "producteur qui vend à l'agrégateur ;\n"
          + "- **liens horizontaux** — relations entre acteurs **du même maillon**. Vingt "
          + "producteurs qui se regroupent.\n\n"
          + "**Une coopérative est un lien horizontal.** C'est exactement ce qu'elle est : des "
          + "acteurs du même maillon, unis par un lien commun (art. 8 de l'Acte uniforme), qui "
          + "se donnent une force de négociation dans les liens verticaux.\n\n"
          + "Retenez cette phrase, tout le cours en découle : **on organise horizontalement pour "
          + "peser verticalement.**",
      },
      {
        type: "exercise",
        id: "c1e1",
        kind: "choice",
        title: "Filière ou pas filière",
        prompt:
          "Quarante producteurs de maïs d'un même canton produisent chacun pour leur "
          + "consommation familiale et vendent occasionnellement un surplus sur le marché "
          + "hebdomadaire, sans acheteur régulier. Un projet veut « développer la chaîne de "
          + "valeur maïs ». Que répondez-vous ?",
        opts: [
          "C'est une chaîne de valeur : il y a des producteurs, un produit et un marché",
          "Il n'y a pas encore de chaîne de valeur faute de demande structurée — c'est de l'agriculture de subsistance avec écoulement de surplus, et c'est la demande qu'il faut d'abord établir",
          "C'est une chaîne d'approvisionnement, pas une chaîne de valeur",
          "C'est une chaîne de valeur incomplète, qu'il suffit de cartographier",
        ],
        answer: 1,
        hint: "Reprenez la définition : quel élément est indispensable, et non simplement souhaitable ?",
        explain:
          "Sans demande, il n'y a pas de chaîne de valeur : la définition du FIDA fait de la "
          + "destination finale sur le marché un élément constitutif, pas un aboutissement "
          + "espéré. Des agriculteurs sans consommateurs, c'est de l'agriculture de subsistance. "
          + "La conséquence pratique est lourde : monter une coopérative de commercialisation ici "
          + "produirait une structure sans activité, exposée à l'article 178 a) de l'Acte "
          + "uniforme — n'avoir pas commencé ses opérations dans les deux ans de "
          + "l'immatriculation est une cause de dissolution. Le premier travail n'est pas "
          + "juridique, il est commercial : trouver ou construire l'acheteur.",
      },
      {
        type: "exercise",
        id: "c1e2",
        kind: "choice",
        title: "Le symptôme et la cause",
        prompt:
          "Dans une zone de production de miel, les producteurs se plaignent d'un prix d'achat "
          + "très bas. Un projet propose une formation à la négociation commerciale. "
          + "L'enquête montre par ailleurs : un seul collecteur dessert la zone, la piste est "
          + "coupée quatre mois par an, et aucun producteur ne connaît le prix pratiqué en "
          + "ville. Que dit l'analyse ?",
        opts: [
          "La formation est le bon levier : mieux négocier fera monter le prix",
          "Le prix bas est un symptôme ; les causes sont l'absence d'alternative à un acheteur unique, l'enclavement saisonnier et l'absence d'information sur les prix — négocier mieux face à un acheteur unique ne change presque rien",
          "Il faut d'abord réhabiliter la piste, puis reposer la question",
          "Le problème est le manque de qualité du miel",
        ],
        answer: 1,
        hint: "Demandez-vous ce que la formation change au rapport de force, une fois qu'elle est finie.",
        explain:
          "Le prix bas est la partie visible de l'iceberg. Sous la surface : un acheteur unique "
          + "(le producteur n'a pas d'alternative, donc pas de pouvoir de négociation), un "
          + "enclavement quatre mois par an (contrainte macro, niveau infrastructure), une "
          + "absence d'information sur les prix (flux d'information capté). Former à la "
          + "négociation quelqu'un qui n'a qu'un seul acheteur et ignore le prix du marché ne "
          + "déplace aucun de ces trois blocages — l'argent est dépensé, le symptôme revient, et "
          + "l'on conclut que « les producteurs ne suivent pas ». Le levier est ailleurs : "
          + "ouvrir une seconde voie de commercialisation, ou faire circuler l'information de "
          + "prix, ce qui coûte souvent moins cher qu'une formation.",
      },
      {
        type: "exercise",
        id: "c1e3",
        kind: "choice",
        title: "À quel niveau se situe la contrainte",
        prompt:
          "Dans un bassin maraîcher, les producteurs perdent régulièrement une partie de leur "
          + "récolte parce qu'aucun service de transport réfrigéré n'existe et qu'aucun "
          + "prestataire n'en propose à un prix accessible. À quel niveau du système se situe "
          + "cette contrainte ?",
        opts: [
          "Micro : c'est un problème de gestion des producteurs",
          "Méso : c'est un service d'appui indisponible ou inaccessible",
          "Macro : c'est une question d'infrastructure publique",
          "Ce n'est pas une contrainte de filière mais un aléa climatique",
        ],
        answer: 1,
        hint: "Les trois niveaux se distinguent par la NATURE de ce qui manque, pas par la gravité.",
        explain:
          "Niveau méso : les services d'appui — intrants, services techniques, financement — "
          + "peuvent être indisponibles ou inaccessibles à cause du prix, de la qualité ou de la "
          + "localisation. C'est exactement le cas ici. La formule à retenir est « services "
          + "défaillants, filière défaillante ». La distinction n'est pas académique : elle dit "
          + "où intervenir. Au micro, on formerait les producteurs à mieux conditionner, sans "
          + "effet sur le froid manquant. Au macro, on plaiderait pour une politique de la "
          + "chaîne du froid, ce qui prendra des années. Au méso, on peut faire émerger un "
          + "prestataire, ou mutualiser un moyen — et c'est précisément ce qu'une union de "
          + "coopératives peut porter (art. 136 de l'Acte uniforme).",
      },
      {
        type: "exercise",
        id: "c1e4",
        kind: "text",
        title: "Le lien qu'est une coopérative",
        prompt:
          "Vingt productrices de karité d'un même village se regroupent pour vendre ensemble. "
          + "S'agit-il d'un lien vertical ou d'un lien horizontal ? Répondez en un mot.",
        answer: "horizontal",
        accept: ["lien horizontal", "un lien horizontal", "horizontale"],
        hint: "Verticale entre maillons différents, horizontale entre acteurs du même maillon.",
        explain:
          "Horizontal. Les liens horizontaux relient des acteurs situés au MÊME stade de la "
          + "chaîne ; les liens verticaux sont des transactions entre maillons différents. Une "
          + "coopérative est par définition un lien horizontal — c'est même sa définition "
          + "juridique, l'article 8 de l'Acte uniforme la décrivant comme des coopérateurs unis "
          + "par un lien commun. Et c'est là toute son utilité : **on organise horizontalement "
          + "pour peser verticalement**. Vingt productrices isolées font face à un acheteur "
          + "chacune de leur côté ; regroupées, elles négocient un volume, et le rapport de "
          + "force change sans qu'aucune n'ait changé de métier.",
      },
      {
        type: "exercise",
        id: "c1e5",
        kind: "choice",
        title: "Acteur direct ou partie prenante",
        prompt:
          "Dans la filière café d'un territoire, on recense : les producteurs, un service "
          + "public de vulgarisation agricole, des intermédiaires acheteurs, une institution de "
          + "microfinance, une coopérative régionale qui achète et revend, un transporteur. "
          + "Lesquels sont des acteurs DIRECTS ?",
        opts: [
          "Tous : ils participent tous à la filière",
          "Les producteurs, les intermédiaires acheteurs et la coopérative régionale — ceux qui possèdent le produit à un moment donné",
          "Les producteurs seulement",
          "Tous sauf le service public de vulgarisation",
        ],
        answer: 1,
        hint: "Le critère est la propriété du produit, pas l'importance du rôle.",
        explain:
          "Le critère est net : les acteurs directs sont ceux qui **possèdent le produit à un "
          + "moment donné**, brut, semi-transformé ou fini. Producteurs, intermédiaires et "
          + "coopérative régionale achètent et revendent : ils sont acteurs directs. Le service "
          + "de vulgarisation, l'institution de microfinance et le transporteur ne possèdent "
          + "jamais le café — ce sont des prestataires de services d'appui, donc des parties "
          + "prenantes, au niveau méso. La distinction n'est pas une étiquette : elle dit où "
          + "chacun peut être organisé. Un maillon d'acteurs directs peut se constituer en "
          + "coopérative sur un lien commun de métier (art. 8) ; un prestataire de service, non.",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    ordre: 2,
    titre: "Cibler : désagréger avant de choisir qui on appuie",
    points: 100,
    cellules: [
      {
        type: "md",
        content:
          "## « Les producteurs » n'existent pas\n\n"
          + "C'est la formule qui ouvre la plupart des notes de projet, et c'est une erreur "
          + "d'analyse avant d'être une maladresse de langage. Un territoire ne contient pas "
          + "« les producteurs ». Il contient des ménages dont les actifs, l'accès aux services, "
          + "les conditions sociales et l'exposition aux aléas diffèrent au point qu'une même "
          + "intervention en aidera certains et en exclura d'autres.\n\n"
          + "**Désagréger, c'est refuser de traiter un territoire comme un bloc.** Et cela se "
          + "fait AVANT de choisir la filière, pas après : on ne peut pas juger si une filière "
          + "est accessible aux plus pauvres tant qu'on ne sait pas qui ils sont.",
      },
      {
        type: "md",
        content:
          "## Vulnérabilité : deux composantes, pas une\n\n"
          + "Le développement d'une filière ne garantit **pas** l'inclusion des populations "
          + "pauvres : leur potentiel économique est souvent trop limité par une vulnérabilité "
          + "structurelle. Cette vulnérabilité se décompose en deux termes qu'il faut savoir "
          + "distinguer, parce qu'ils appellent des réponses différentes :\n\n"
          + "| | Ce que c'est | Exemples |\n"
          + "|---|---|---|\n"
          + "| **Capacités limitées** | capacité réduite à répondre aux risques ou à saisir les opportunités | peu d'actifs productifs, faible épargne, connaissances techniques limitées |\n"
          + "| **Forte sensibilité** | exposition directe à des risques physiques ou sociaux | terrains en pente, éloignement des routes, isolement social |\n\n"
          + "**Vulnérabilité = capacités limitées + forte sensibilité.**\n\n"
          + "L'intérêt de la distinction est opérationnel. Une capacité limitée se travaille par "
          + "l'apport — formation, équipement, crédit adapté. Une forte sensibilité se travaille "
          + "par la réduction de l'exposition — mutualiser un transport, stocker au plus près, "
          + "étaler un calendrier. Confondre les deux, c'est former quelqu'un dont le problème "
          + "est qu'il habite à quatre heures de piste.",
      },
      {
        type: "md",
        content:
          "## Le territoire de travail\n\n"
          + "Tout ce cours s'appuie sur un cas fictif, construit à partir d'expériences de "
          + "terrain réelles. Il vaut la peine d'être lu attentivement une fois : les leçons 3, "
          + "4 et 5 y reviennent.\n\n"
          + "**Région rurale montagneuse**, 13 communautés agricoles, minorités ethniques. "
          + "Trois activités principales : **café, miel, maraîchage**.\n\n"
          + "### Défis systémiques — communs à toutes les communautés\n\n"
          + "- une seule route principale ; certaines communautés sont isolées lors de fortes pluies ;\n"
          + "- réseau irrégulier : **7 communautés sur 13** ont un signal stable ;\n"
          + "- assistance technique limitée : **2 techniciens** pour tout le territoire ;\n"
          + "- faible coordination entre la municipalité, les associations et les programmes nationaux.\n\n"
          + "### Opportunités systémiques\n\n"
          + "- élargissement du programme d'approvisionnement des écoles publiques ;\n"
          + "- coopérative régionale active sur le café et le miel ;\n"
          + "- marché numérique pilote, opérationnel dans **3 communautés connectées** ;\n"
          + "- projet départemental d'amélioration des routes secondaires.\n\n"
          + "**Notez la nature de ces listes** : ce sont des contraintes et des opportunités "
          + "*systémiques*, c'est-à-dire qu'elles pèsent sur tout le monde. Elles ne servent pas "
          + "à distinguer les groupes — elles servent à comprendre le décor dans lequel les "
          + "différences entre groupes vont jouer.",
      },
      {
        type: "md",
        content:
          "## Cinq groupes de ménages\n\n"
          + "### Groupe A — petits exploitants, parcelles d'environ 0,5 ha\n"
          + "Moyenne altitude (900–1 200 m), sécheresses de 4 à 6 semaines. 0,4–0,6 ha, outils "
          + "manuels, aucune irrigation, cultures vivrières mixtes. Routes rurales dégradées, "
          + "**aucun accès au crédit faute de titre foncier**, assistance technique une fois par "
          + "an. Faible participation communautaire, revenus saisonniers instables, capacité "
          + "limitée à prendre des risques.\n"
          + "→ *Vulnérabilité dominante : pauvreté multidimensionnelle et exposition climatique.*\n\n"
          + "### Groupe B — jeunes ruraux, microentreprises\n"
          + "Communautés d'accessibilité moyenne. **Aucune propriété foncière**, petit "
          + "équipement, smartphone, compétences numériques de base. Formation numérique "
          + "disponible mais coûteuse, crédit seulement avec garant. Faible représentation dans "
          + "les espaces communautaires, migrations saisonnières.\n"
          + "→ *Vulnérabilité dominante : obstacles institutionnels et financiers.*\n\n"
          + "### Groupe C — ménages des zones élevées (1 500–1 800 m)\n"
          + "Glissements de terrain pendant les pluies, isolement temporaire. Sols fertiles mais "
          + "accès difficile. **Aucun réseau mobile**, assistance technique quasi inexistante, "
          + "logistique coûteuse et rare.\n"
          + "→ *Vulnérabilité dominante : isolement géographique, accès au marché et aux services.*\n\n"
          + "### Groupe D — associations de femmes rurales\n"
          + "Moyenne altitude. **Groupes déjà organisés**, outils de base, petits espaces de "
          + "production communautaires. Transport dépendant d'intermédiaires, soutien "
          + "institutionnel irrégulier. Forte cohésion interne, leadership féminin émergent, "
          + "mobilité limitée par la distance, le coût du transport et les responsabilités de soins.\n"
          + "→ *Vulnérabilité dominante : dépendance aux intermédiaires, contraintes de temps et de mobilité.*\n\n"
          + "### Groupe E — ménages à actifs productifs intermédiaires\n"
          + "Plaine, climat stable, fortes pluies affectant le post-récolte et le transport. "
          + "Équipements, petit élevage, **organisation communautaire consolidée**. Encadrement "
          + "tous les 1 à 2 mois, crédit occasionnel, bonne connectivité, proximité d'un centre "
          + "de collecte. Capacité d'investissement modérée.\n"
          + "→ *Vulnérabilité dominante : lacunes d'infrastructure, dépendance à peu d'acheteurs.*",
      },
      {
        type: "callout",
        title: "Le piège du groupe E",
        variant: "warning",
        content:
          "Le groupe E est celui avec lequel il est le plus agréable de travailler : organisé, "
          + "équipé, connecté, proche d'un centre de collecte, capable d'investir. Les résultats "
          + "arrivent vite et les indicateurs du projet sont beaux.\n\n"
          + "C'est aussi celui qui avait le moins besoin de vous.\n\n"
          + "Ce n'est pas une raison de l'écarter : il tire souvent la filière, absorbe les "
          + "volumes et sert de démonstrateur. C'est une raison de **le nommer** dans la note "
          + "de ciblage, plutôt que de le laisser devenir par défaut le bénéficiaire réel d'un "
          + "projet annoncé pour les plus pauvres. Le glissement se fait tout seul, sans "
          + "mauvaise foi, par la simple facilité de mise en œuvre.\n\n"
          + "La question à écrire noir sur blanc : **qui, dans ce ciblage, n'aurait rien obtenu "
          + "sans nous ?**",
      },
      {
        type: "md",
        content:
          "## Les services du territoire, et ce qu'ils excluent\n\n"
          + "| Service | Ce qu'il fait | Qui il laisse dehors |\n"
          + "|---|---|---|\n"
          + "| Bureau agricole municipal | 2 techniciens | les zones reculées, faute de couverture |\n"
          + "| Coopérative régionale | forme et achète café et miel | ceux qui ne produisent ni l'un ni l'autre |\n"
          + "| Programme public de crédit rural | crédit | **exige un titre foncier individuel → exclut A et C** |\n"
          + "| Centre municipal pour la jeunesse | formation numérique | pas de mobilité vers les communautés reculées |\n"
          + "| Entreprise de logistique | un seul camion | itinéraires coûteux vers la montagne |\n"
          + "| Marché numérique pilote | vente en ligne | les 10 communautés non connectées |\n\n"
          + "La ligne du crédit rural est la plus instructive : **une règle administrative "
          + "apparemment neutre — exiger un titre foncier — exclut mécaniquement deux des cinq "
          + "groupes**, dont celui qui en aurait le plus besoin. Aucune intention n'est en jeu. "
          + "C'est une contrainte de niveau macro, institutionnelle et formelle, et c'est le "
          + "genre de constat qu'on ne fait qu'en désagrégeant.\n\n"
          + "**Repérer ces exclusions par construction est le produit principal d'un exercice de "
          + "ciblage.** Pas la liste des bénéficiaires : la liste de ce qui les tient dehors.",
      },
      {
        type: "exercise",
        id: "c2e1",
        kind: "number",
        title: "La couverture réelle du numérique",
        prompt:
          "Sur les 13 communautés du territoire, combien n'ont PAS de signal mobile stable ? "
          + "(La réponse conditionne tout appui reposant sur un outil connecté.)",
        answer: 6,
        tolerance: 0,
        hint: "Le nombre de communautés couvertes figure dans les défis systémiques.",
        explain:
          "Six. Sept communautés sur treize disposent d'un signal stable, donc six n'en ont pas "
          + "— soit 46 % du territoire. Et le marché numérique pilote, lui, n'est opérationnel "
          + "que dans trois communautés : c'est là le chiffre décisif. Un appui bâti sur l'outil "
          + "numérique atteindrait au mieux trois communautés sur treize, et exclurait "
          + "intégralement le groupe C, qui n'a aucun réseau. Le constat ne condamne pas l'outil "
          + "numérique — il oblige à écrire dans la note de ciblage qui il laisse dehors, et à "
          + "prévoir autre chose pour ceux-là.",
      },
      {
        type: "exercise",
        id: "c2e2",
        kind: "choice",
        title: "Une règle neutre qui exclut",
        prompt:
          "Le programme public de crédit rural exige un titre foncier individuel. Quels groupes "
          + "cela exclut-il, et de quelle nature est cette contrainte ?",
        opts: [
          "Les groupes A et C ; contrainte de niveau micro, liée aux capacités des ménages",
          "Les groupes A et C ; contrainte de niveau macro, institutionnelle et formelle",
          "Le groupe B seulement, puisqu'il n'a aucune propriété foncière",
          "Aucun : le titre foncier peut s'obtenir",
        ],
        answer: 1,
        hint: "Cherchez qui, dans les fiches, n'a pas accès au crédit et pour quel motif exact.",
        explain:
          "Les groupes A et C. La fiche du groupe A l'énonce mot pour mot — « aucun accès au "
          + "crédit faute de titres fonciers » — et le groupe C, isolé en altitude, est dans la "
          + "même situation. La contrainte est de niveau **macro** : c'est une règle "
          + "institutionnelle formelle, pas une insuffisance des ménages. La distinction commande "
          + "la réponse. Au micro, on formerait les ménages à monter un dossier de crédit qu'ils "
          + "ne peuvent de toute façon pas déposer. Au macro, on négocie une garantie "
          + "alternative — caution solidaire, warrantage, aval d'une organisation — et c'est "
          + "précisément un service qu'une coopérative peut porter. Le groupe B est bien sans "
          + "propriété foncière lui aussi, mais sa fiche indique un accès au crédit « avec "
          + "garant » : il n'est pas exclu, il est conditionné.",
      },
      {
        type: "exercise",
        id: "c2e3",
        kind: "choice",
        title: "Capacité ou sensibilité",
        prompt:
          "Le groupe C cultive des sols fertiles mais subit des glissements de terrain qui "
          + "l'isolent pendant les pluies, sans réseau mobile ni assistance technique. Sa "
          + "contrainte dominante relève-t-elle des capacités limitées ou de la forte "
          + "sensibilité ?",
        opts: [
          "Des capacités limitées : il lui manque des compétences techniques",
          "De la forte sensibilité : exposition directe à des risques physiques — pente, éloignement, isolement",
          "Des deux à parts égales",
          "D'aucune des deux : c'est un aléa climatique, pas une vulnérabilité",
        ],
        answer: 1,
        hint: "Les exemples donnés pour chacune des deux composantes sont très concrets.",
        explain:
          "De la forte sensibilité. Les exemples canoniques en sont précisément « terrains en "
          + "pente, éloignement des routes, isolement social » — la fiche du groupe C les "
          + "cumule. Ses sols sont fertiles : ce n'est pas un problème de capacité productive. "
          + "La conséquence est directe sur le choix de l'intervention. Une réponse en "
          + "capacités — former, équiper — ne réduit pas l'exposition. Une réponse en "
          + "sensibilité la réduit : mutualiser un transport, stocker au plus près, décaler un "
          + "calendrier de collecte pour éviter la saison des glissements. Confondre les deux, "
          + "c'est former quelqu'un dont le problème est qu'il habite à quatre heures de piste.",
      },
      {
        type: "exercise",
        id: "c2e4",
        kind: "choice",
        title: "Le groupe déjà organisé",
        prompt:
          "Le groupe D — associations de femmes rurales — présente une forte cohésion interne "
          + "et un leadership émergent, mais dépend d'intermédiaires pour le transport. En quoi "
          + "cette organisation préexistante change-t-elle la stratégie ?",
        opts: [
          "Elle ne change rien : la cohésion sociale n'est pas un actif économique",
          "Elle réduit le coût d'entrée d'une structuration formelle : le lien commun existe déjà, ce qui manque est le service — ici la logistique — et non le collectif",
          "Elle impose de commencer par une formation en leadership",
          "Elle en fait le groupe le moins prioritaire, puisqu'il est déjà organisé",
        ],
        answer: 1,
        hint: "Ce qu'une coopérative est le plus difficile à fabriquer, ce ne sont pas les statuts.",
        explain:
          "Le collectif est ce qu'une structuration met des années à produire, et le groupe D "
          + "l'a déjà : cohésion interne, leadership émergent, espaces de production communs. Ce "
          + "qui manque est un SERVICE — la logistique, dont la dépendance aux intermédiaires "
          + "est nommée comme sa vulnérabilité dominante. C'est exactement la configuration où "
          + "une organisation formelle a le meilleur rendement : le lien commun de l'article 8 "
          + "de l'Acte uniforme est déjà là, il reste à lui donner une forme juridique et un "
          + "objet précis. Attention toutefois à la contrainte de mobilité citée dans la fiche : "
          + "des assemblées générales éloignées ou tardives excluraient les membres qu'on "
          + "prétend organiser.",
      },
      {
        type: "exercise",
        id: "c2e5",
        kind: "text",
        title: "Ce que produit un exercice de ciblage",
        prompt:
          "Au-delà de la liste des bénéficiaires, quel est le produit le plus utile d'un "
          + "exercice de désagrégation : la liste de ce qui tient certains groupes … quoi ? "
          + "Répondez en un mot.",
        answer: "dehors",
        accept: ["a l'ecart", "exclus", "exclusion", "en dehors"],
        hint: "Relisez le tableau des services du territoire : chaque ligne a une dernière colonne.",
        explain:
          "Dehors. Le produit principal d'un ciblage n'est pas la liste des bénéficiaires — elle "
          + "s'écrit toujours — mais la liste des mécanismes d'exclusion : le titre foncier "
          + "exigé qui écarte les groupes A et C, la couverture réseau qui écarte dix "
          + "communautés sur treize, l'absence de mobilité des services qui écarte les zones "
          + "reculées. Ces exclusions ne se voient qu'en désagrégeant, et aucune n'est "
          + "intentionnelle : ce sont des règles neutres aux effets sélectifs. Les nommer est ce "
          + "qui distingue une note de ciblage d'une liste de villages.",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    ordre: 3,
    titre: "Prioriser : choisir une filière, et savoir dire non",
    points: 100,
    cellules: [
      {
        type: "md",
        content:
          "## Pourquoi il faut choisir\n\n"
          + "Le territoire compte trois filières : café, miel, maraîchage. Un projet a un "
          + "budget, deux techniciens et trois ans. Vouloir les traiter toutes revient à n'en "
          + "traiter aucune — et cette décision-là se prend rarement de façon explicite : elle "
          + "se subit, filière après filière, jusqu'à ce que les moyens soient dispersés.\n\n"
          + "**Prioriser, c'est écrire pourquoi on ne fait pas les deux autres.** C'est la partie "
          + "impopulaire du métier, et celle qui distingue un professionnel d'un exécutant.",
      },
      {
        type: "md",
        content:
          "## Les sept critères d'évaluation\n\n"
          + "Chaque fiche de filière est jugée sur les mêmes sept angles. Les employer dans le "
          + "même ordre pour toutes les filières est ce qui rend la comparaison honnête — sinon "
          + "on argumente pour la filière qu'on a déjà choisie.\n\n"
          + "| Critère | La question qu'il pose |\n"
          + "|---|---|\n"
          + "| **Accessibilité** | par quels maillons un ménage peu doté peut-il entrer ? |\n"
          + "| **Femmes et jeunes** | quels rôles existent, et mènent-ils quelque part ? |\n"
          + "| **Demande** | est-elle stable, saisonnière, garantie, à construire ? |\n"
          + "| **Revenus** | fréquents ou annuels ? complémentaires ou principaux ? |\n"
          + "| **Logistique et services** | de quoi le résultat dépend-il hors du champ ? |\n"
          + "| **Mise en œuvre territoriale** | quelle coordination le dispositif exige-t-il ? |\n"
          + "| **Environnement réglementaire et fiscal** | les règles encouragent-elles ou découragent-elles l'investissement ? |\n\n"
          + "Le septième est le plus souvent oublié, et il peut à lui seul disqualifier une "
          + "filière — la fiche café le montre.",
      },
      {
        type: "md",
        content:
          "## Café\n\n"
          + "**La chaîne** : pépinières, producteurs, collecteurs, transport, coopérative "
          + "régionale, acheteurs externes. Production de plants, conduite des cultures, "
          + "récolte, séchage, tri, stockage, contrôle qualité, logistique, commercialisation.\n\n"
          + "**Participation** : entrée possible par des segments peu capitalistiques — "
          + "pépinières, séchage, tri. Les ménages peu dotés ou éloignés peuvent participer, "
          + "mais sont **plus exposés au risque de ne pas tenir les normes de qualité ni la "
          + "régularité des livraisons**. Femmes et jeunes participent au post-récolte et aux "
          + "pépinières ; la montée en gamme dépend de la coordination et d'un appui soutenu.\n\n"
          + "**Revenus et demande** : demande relativement stable. L'amélioration des revenus "
          + "dépend de la qualité et de la régularité, et elle est **progressive plutôt "
          + "qu'immédiate**.\n\n"
          + "**Contraintes** : caféiers âgés (productivité et qualité en baisse), routes et "
          + "infrastructures dégradées, **absence d'incitations réglementaires et fiscales**, "
          + "parfois insécurité — rien n'encourage à investir. Assistance technique et services "
          + "de la coopérative inégalement répartis, plus faibles en zone reculée.\n\n"
          + "**Sur le septième critère, la fiche est explicite** : un environnement marqué par "
          + "la prédation et la fuite informelle de la production hors du pays est défavorable et "
          + "appelle des actions réglementaires. Autrement dit, une partie du problème ne se "
          + "règle pas sur le terrain.",
      },
      {
        type: "md",
        content:
          "## Miel\n\n"
          + "**La chaîne** : fournisseurs d'équipements, groupements d'apiculteurs, conduite des "
          + "ruches, récolte, filtration, conditionnement, transport, collecte, vente aux "
          + "coopératives, parfois transformation différenciée.\n\n"
          + "**Participation** : suppose un **équipement de base**, que certains acquièrent "
          + "progressivement et d'autres pas sans appui. La chaîne offre des rôles au-delà de la "
          + "conduite des ruches — filtration, mise en bouteille, conditionnement, stockage, "
          + "coordination des ventes — qui constituent des **points d'entrée pour les femmes et "
          + "les jeunes**, particulièrement en groupements organisés.\n\n"
          + "**Revenus et demande** : revenus **irréguliers**, fortement dépendants des cycles "
          + "de floraison et du climat. Les bonnes années, la contribution est significative ; "
          + "le miel **remplace rarement une source principale de revenus**. Marchés de niche "
          + "réels mais exigeant régularité et organisation.\n\n"
          + "**Contraintes** : transport coûteux depuis les zones reculées, qui **ronge les "
          + "marges en l'absence de logistique mutualisée ou de volumes suffisants**. Appui "
          + "technique intermittent.",
      },
      {
        type: "md",
        content:
          "## Maraîchage\n\n"
          + "**La chaîne** : production de plants, conduite des cultures, récolte continue, "
          + "lavage, tri, conditionnement, livraison aux marchés locaux, aux acheteurs informels "
          + "et **aux programmes d'approvisionnement public**. Cycles courts, chaîne dynamique.\n\n"
          + "**Participation** : production possible avec **peu de terre et peu d'actifs**, à "
          + "condition d'un accès de base à l'eau. Exige une main-d'œuvre continue et une "
          + "planification fréquente. Femmes et jeunes peuvent intervenir à plusieurs étapes — "
          + "production, post-récolte, gestion des livraisons, coordination avec les acheteurs.\n\n"
          + "**Revenus et demande** : revenus **fréquents**, grâce au cycle court. Prix "
          + "saisonniers, revenus très variables sans acheteur stable. Les programmes publics "
          + "offrent une demande **plus prévisible**, mais exigent des **volumes réguliers et le "
          + "respect de normes**.\n\n"
          + "**Contraintes** : la périssabilité amplifie le risque dès que les routes sont "
          + "mauvaises ou le transport mal coordonné — pertes post-récolte directes. La chaîne "
          + "dépend fortement de la coordination logistique et du respect des délais.",
      },
      {
        type: "callout",
        title: "Croissance absolue, équité relative, ou les deux",
        variant: "info",
        content:
          "Trois trajectoires pro-pauvres, et il faut savoir laquelle on vise avant de choisir "
          + "la filière — sinon on la découvre à l'évaluation finale.\n\n"
          + "**1. Croissance absolue.** On augmente la valeur totale créée dans la filière. La "
          + "part des pauvres reste à 15 %, mais 15 % d'un gâteau doublé, c'est deux fois plus "
          + "en francs. Leur revenu absolu monte, leur position relative ne bouge pas.\n\n"
          + "**2. Équité relative.** On augmente la part captée par les pauvres — de 15 % à "
          + "40 % — sans que la filière grossisse. Leur position dans le rapport de force "
          + "change.\n\n"
          + "**3. Combinée.** Les deux à la fois : la valeur totale augmente ET la part captée "
          + "aussi. C'est la plus difficile, la plus durable, et celle qui a la meilleure "
          + "acceptabilité sociale — parce que personne ne perd en valeur absolue.\n\n"
          + "**La croissance seule ne garantit pas l'inclusion.** Une filière qui double sans que "
          + "la répartition change laisse les acteurs pauvres exactement là où ils étaient dans "
          + "la hiérarchie — avec un peu plus d'argent, et toujours aucun pouvoir de négociation.",
      },
      {
        type: "md",
        content:
          "## Deux stratégies d'inclusion, et elles ne s'excluent pas\n\n"
          + "**Option 1 — sélection stratégique de la filière.** Choisir une filière où les "
          + "ménages pauvres ont déjà des conditions relativement favorables : forte demande "
          + "locale, faibles barrières à l'entrée. Le manioc ou l'aviculture familiale en sont "
          + "les exemples types.\n\n"
          + "**Option 2 — interventions ciblées sur leurs contraintes.** Garder la filière et "
          + "concevoir des actions qui lèvent les obstacles : dispositifs de financement adaptés "
          + "quand le titre foncier bloque, assistance technique mobile quand la distance bloque.\n\n"
          + "La première est plus économe, la seconde plus ambitieuse. Le choix se fait avec les "
          + "moyens réels du projet, pas avec ceux qu'on aimerait avoir — et il s'écrit.",
      },
      {
        type: "exercise",
        id: "c3e1",
        kind: "choice",
        title: "Entrer avec peu d'actifs",
        prompt:
          "Le groupe A dispose de 0,4 à 0,6 ha, d'outils manuels, d'aucune irrigation et "
          + "d'aucun accès au crédit. Sur le seul critère de l'accessibilité, quelle filière lui "
          + "ouvre l'entrée la plus large ?",
        opts: [
          "Le café : l'entrée par les pépinières et le séchage demande peu d'investissement",
          "Le miel : les rôles de filtration et de conditionnement sont accessibles",
          "Le maraîchage : la production est possible avec peu de terre et peu d'actifs, sous réserve d'un accès de base à l'eau",
          "Aucune : ce groupe ne peut entrer dans aucune filière",
        ],
        answer: 2,
        hint: "Comparez ce que chaque fiche pose comme condition d'entrée matérielle.",
        explain:
          "Le maraîchage. Sa fiche est la seule à énoncer que la production est possible « avec "
          + "un accès limité à la terre et à des actifs », à la seule condition d'un accès de "
          + "base à l'eau. Le café offre bien des segments peu capitalistiques — pépinières, "
          + "séchage, tri — mais sa fiche prévient que les ménages peu dotés y sont plus exposés "
          + "au risque de ne pas tenir les normes de qualité et la régularité des livraisons. Le "
          + "miel, lui, exige un équipement de base que le groupe A n'a pas et ne peut pas "
          + "financer, faute d'accès au crédit. Réserve à écrire : le maraîchage demande une "
          + "main-d'œuvre continue et une planification fréquente, ce qui suppose une "
          + "disponibilité que les revenus saisonniers instables du groupe A ne garantissent pas.",
      },
      {
        type: "exercise",
        id: "c3e2",
        kind: "choice",
        title: "Le critère qu'on oublie",
        prompt:
          "La fiche café signale un environnement marqué par la prédation et par la fuite "
          + "informelle de la production hors du pays. À quel critère cela se rattache-t-il, et "
          + "qu'est-ce que cela implique ?",
        opts: [
          "À la logistique : il faut améliorer les routes",
          "À l'environnement réglementaire et fiscal : une partie du problème ne se règle pas sur le terrain et appelle des actions réglementaires, donc au niveau macro",
          "À la demande : le marché est instable",
          "Aux revenus : les producteurs sont mal payés",
        ],
        answer: 1,
        hint: "C'est le septième critère, celui que les notes de projet omettent le plus souvent.",
        explain:
          "L'environnement réglementaire et fiscal. La fiche l'énonce elle-même : cet "
          + "environnement « est défavorable et nécessite des actions réglementaires ». C'est "
          + "une contrainte de niveau macro, institutionnelle et formelle, et elle a une "
          + "conséquence directe sur le montage d'un projet : aucune formation, aucun "
          + "équipement, aucune organisation de producteurs ne fera disparaître une fuite "
          + "informelle de production hors du pays. On peut choisir le café malgré cela — mais "
          + "alors il faut soit prévoir un volet de plaidoyer, soit écrire dans le document que "
          + "cette part du problème restera entière. Ne pas la mentionner, c'est promettre un "
          + "résultat qu'on sait hors d'atteinte. Le critère a par ailleurs une suite juridique "
          + "directe : si la filière retenue est réglementée, l'article 20 de l'Acte uniforme "
          + "impose que l'objet social s'y conforme — choisir une filière, c'est déjà écrire "
          + "une partie des statuts.",
      },
      {
        type: "exercise",
        id: "c3e3",
        kind: "choice",
        title: "Régularité contre revenu fréquent",
        prompt:
          "Un projet vise le groupe A, dont les revenus sont saisonniers et instables et la "
          + "capacité à prendre des risques faible. Entre le café et le maraîchage, que dit "
          + "l'analyse des revenus ?",
        opts: [
          "Le café : sa demande stable protège mieux un ménage fragile",
          "Le maraîchage : le cycle court génère des revenus fréquents, ce qui correspond mieux à une trésorerie fragile — mais sa volatilité de prix et sa dépendance à un acheteur stable doivent être traitées, sinon le gain de fréquence est annulé",
          "Les deux se valent : la demande est stable dans les deux cas",
          "Le café : l'amélioration des revenus y est progressive, donc plus sûre",
        ],
        answer: 1,
        hint: "Un ménage à trésorerie fragile n'a pas le même besoin qu'un ménage capable d'attendre la récolte.",
        explain:
          "Le maraîchage, avec une réserve qu'il faut écrire. Sa fiche indique des revenus "
          + "fréquents grâce au cycle court, ce qui convient à une trésorerie qui ne peut pas "
          + "attendre une campagne entière. Celle du café annonce au contraire une amélioration "
          + "« progressive plutôt qu'immédiate » : excellent pour un ménage capable d'attendre, "
          + "difficile pour le groupe A. Mais la même fiche maraîchère prévient que les prix "
          + "varient selon les saisons et que les revenus peuvent fortement varier en l'absence "
          + "d'acheteurs stables. La fréquence ne sert à rien si chaque vente se fait au prix du "
          + "jour face à un intermédiaire. C'est là que le programme d'approvisionnement des "
          + "écoles publiques prend son sens : il offre une demande plus prévisible — au prix de "
          + "volumes réguliers et de normes à respecter, donc d'une organisation.",
      },
      {
        type: "exercise",
        id: "c3e4",
        kind: "choice",
        title: "Croissance sans inclusion",
        prompt:
          "Une intervention double la valeur totale de la filière café. La part captée par les "
          + "acteurs pauvres reste à 15 %. Quelle trajectoire pro-pauvre a été suivie, et que "
          + "faut-il en dire ?",
        opts: [
          "L'équité relative : la part des pauvres a été préservée",
          "La croissance absolue : leur revenu en francs a doublé, mais leur position relative dans la filière est inchangée — la croissance seule ne garantit pas l'inclusion",
          "L'approche combinée, puisque tout le monde gagne",
          "Aucune : sans changement de part, il n'y a pas d'effet pro-pauvre",
        ],
        answer: 1,
        hint: "Trois trajectoires existent ; celle-ci est la première, et elle a un mérite réel et une limite réelle.",
        explain:
          "La croissance absolue. C'est une trajectoire pro-pauvre légitime : 15 % d'une valeur "
          + "doublée, c'est deux fois plus d'argent réel dans les ménages, et il serait faux de "
          + "dire qu'il ne s'est rien passé. Mais sa limite doit être nommée : la position "
          + "relative n'a pas bougé. Les acteurs pauvres restent exactement au même rang dans le "
          + "rapport de force, avec le même défaut d'information et le même nombre d'acheteurs "
          + "en face d'eux. La croissance économique, à elle seule, ne garantit pas l'inclusion "
          + "sociale — c'est la raison d'être des stratégies délibérées, sélection stratégique "
          + "de la filière ou interventions ciblées sur les contraintes.",
      },
      {
        type: "exercise",
        id: "c3e5",
        kind: "text",
        title: "Ce qu'une note de priorisation doit contenir",
        prompt:
          "Une note de priorisation qui ne recommande qu'une filière est incomplète tant qu'elle "
          + "n'explique pas une chose. Laquelle ? Complétez : « pourquoi on ne fait pas les … ». "
          + "Répondez en un mot.",
        answer: "autres",
        accept: ["les autres", "autres filieres"],
        hint: "Le mot vise ce qu'on écarte, pas ce qu'on retient.",
        explain:
          "Les autres. Prioriser n'est pas recommander une filière, c'est écrire pourquoi on "
          + "écarte les autres — sur les mêmes sept critères, appliqués dans le même ordre. "
          + "Sans cela, la note est une justification a posteriori d'un choix déjà fait, et elle "
          + "ne résiste pas à la première question d'un comité : « et le miel ? ». Écrire le "
          + "refus protège aussi le projet : le jour où quelqu'un demandera pourquoi le café n'a "
          + "pas été retenu, la réponse existera, datée, avec ses critères — au lieu d'une "
          + "reconstruction de mémoire.",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    ordre: 4,
    titre: "Cartographier : acteurs, circuits, points de levier",
    points: 100,
    cellules: [
      {
        type: "md",
        content:
          "## Ce qu'une carte de filière n'est pas\n\n"
          + "Ce n'est pas un organigramme. Ce n'est pas une jolie flèche de gauche à droite avec "
          + "cinq boîtes.\n\n"
          + "Une carte de filière est un **outil d'analyse** dont la valeur tient à trois choses "
          + "qu'un schéma linéaire ne montre jamais : les **circuits multiples** que le même "
          + "produit peut emprunter, **qui participe à quel circuit**, et **où se situent les "
          + "points de levier**.\n\n"
          + "> La chaîne de valeur est un outil d'analyse, et non simplement une succession "
          + "d'acteurs ou d'activités.\n\n"
          + "La règle de méthode qui en découle : **on liste les acteurs sans présumer des "
          + "étapes ni de leur ordre**. C'est en observant les circuits réels qu'on découvre "
          + "l'ordre — et souvent qu'il y en a plusieurs.",
      },
      {
        type: "md",
        content:
          "## Café : une filière, plusieurs circuits\n\n"
          + "**Comment elle fonctionne.** Les producteurs récoltent des volumes et des qualités "
          + "différents selon leur accès aux outils, à la vulgarisation et à la main-d'œuvre. "
          + "Une partie du café est vendue en **cerises**, une autre en **parche** — le choix "
          + "dépend de la capacité de séchage, de la distance et de la météo. Plusieurs "
          + "acheteurs opèrent avec des prix et des exigences différents.\n\n"
          + "**Les acteurs**, sans ordre présumé : petits et moyens producteurs, et quelques-uns "
          + "de plus grande capacité ; intermédiaires locaux et acheteurs à la ferme ; "
          + "agrégateurs régionaux ; coopérative régionale ; torréfacteurs et "
          + "micro-transformateurs locaux ; acheteurs externes en période de pointe.\n\n"
          + "**Les circuits** :\n\n"
          + "```\n"
          + "  A ─ cerises vendues à la ferme ──────────────► intermédiaire\n"
          + "  B ─ dépulpage + séchage ─► café parche ─────► coopérative (meilleure qualité)\n"
          + "  C ─ zones reculées : intermédiaire regroupe ─► agrégateur ou coopérative\n"
          + "  D ─ saison pluvieuse : vente humide ────────► acheteur qui prend l'humide\n"
          + "```\n\n"
          + "**Qui prend quel circuit** — et c'est ici que la carte devient utile :\n\n"
          + "- les ménages **peu dotés** vendent des cerises, ou de très faibles volumes ;\n"
          + "- les **zones reculées** dépendent davantage des intermédiaires ;\n"
          + "- les **femmes** participent au post-récolte, avec des contraintes de temps et de "
          + "mobilité ;\n"
          + "- les **jeunes** sont peu présents en production traditionnelle, mais des rôles "
          + "existent en contrôle qualité, micro-transformation et logistique numérique **quand "
          + "les conditions le permettent** ;\n"
          + "- les ménages à **actifs intermédiaires** ayant accès à la vulgarisation obtiennent "
          + "une meilleure qualité et de meilleurs prix.\n\n"
          + "La coopérative achète le café de meilleure qualité ; les intermédiaires locaux "
          + "interviennent plus souvent dans les zones reculées. **La qualité et la distance "
          + "trient les gens entre les circuits, et les circuits n'ont pas le même prix.**",
      },
      {
        type: "md",
        content:
          "## Miel et maraîchage : les mêmes questions\n\n"
          + "### Miel\n"
          + "Production à petite et moyenne échelle, conduite des ruches très variable d'une "
          + "communauté à l'autre. Une partie du miel est vendue **non filtrée**, une autre "
          + "après transformation de base. La coopérative achète et forme, mais **sa couverture "
          + "est limitée** ; plusieurs intermédiaires achètent de petits volumes à des "
          + "producteurs dispersés.\n\n"
          + "Circuits : vente directe de rayons ou de miel non filtré ; miel filtré et mis en "
          + "bouteille par les producteurs ou par des ateliers locaux ; livraison à des "
          + "intermédiaires qui regroupent ; livraison à la coopérative pour filtration, "
          + "contrôle et revente. **Selon les communautés, la chaîne apparaît très simple ou "
          + "beaucoup plus complexe** — et c'est un renseignement en soi.\n\n"
          + "Participation : les ménages peu dotés peuvent commencer avec quelques ruches, mais "
          + "**le coût initial de l'équipement est l'obstacle** ; les femmes participent en "
          + "groupes organisés ou en transformation légère ; les jeunes en conduite de ruches, "
          + "tenue de registres numériques ou vente locale ; les zones reculées supportent des "
          + "coûts logistiques élevés pour de petits volumes.\n\n"
          + "### Maraîchage\n"
          + "Chaîne dynamique, gestion continue, périssabilité qui pèse sur la coordination de "
          + "la récolte, du conditionnement et du transport. Une partie de la production se vend "
          + "**informellement dans la communauté** ; le reste va aux marchés locaux, aux "
          + "intermédiaires ou aux programmes publics.\n\n"
          + "Acteurs : producteurs, intermédiaires locaux achetant vite et en petits volumes, "
          + "agrégateurs ou centres municipaux de collecte, organisations qui regroupent les "
          + "volumes pour l'alimentation scolaire, commerçants et étals, parfois acheteurs "
          + "numériques.\n\n"
          + "Circuits : vente informelle immédiate ; vente à la ferme aux intermédiaires ; "
          + "livraison au centre municipal **lorsque le transport est disponible** ; livraison "
          + "coordonnée pour les marchés publics **lorsque les groupes satisfont aux exigences "
          + "de volume et de régularité**.\n\n"
          + "Ces deux « lorsque » sont les points de levier de la filière. Tout le reste en "
          + "dépend.",
      },
      {
        type: "callout",
        title: "Lire une carte : les trois questions qui produisent les conclusions",
        variant: "tip",
        content:
          "**1. Quel circuit paie le mieux, et qui n'y a pas accès ?**\n"
          + "Café : la coopérative achète la meilleure qualité, donc paie mieux ; y accéder "
          + "suppose une capacité de séchage. Ceux qui vendent en cerises n'y accèdent pas — non "
          + "par choix, faute de séchoir.\n\n"
          + "**2. Quel acteur est incontournable, et pourquoi ?**\n"
          + "Dans les zones reculées, l'intermédiaire l'est. Non parce qu'il serait puissant, "
          + "mais parce qu'il est le seul à venir. Le levier n'est pas de le supprimer — c'est "
          + "d'offrir une alternative, ce qui n'est pas la même chose.\n\n"
          + "**3. Qu'est-ce qui bascule un ménage d'un circuit vers un autre ?**\n"
          + "Un séchoir. Un transport groupé. Un volume atteint collectivement. **Ce sont des "
          + "services, et un service peut être porté par une organisation.** C'est le pont vers "
          + "la leçon 5.",
      },
      {
        type: "md",
        content:
          "## Ce que la carte permet enfin de dire\n\n"
          + "Une carte bien faite produit trois phrases qu'on ne pouvait pas écrire avant :\n\n"
          + "1. **« Voici les circuits, et voici lequel prend qui. »** Ce n'est plus une "
          + "intuition : c'est une observation, avec des groupes nommés.\n"
          + "2. **« Voici le point de bascule. »** L'endroit précis où une action modeste fait "
          + "passer un ménage d'un circuit mal payé à un circuit mieux payé.\n"
          + "3. **« Voici ce qui manque, et à quel niveau. »** Un séchoir est un actif, niveau "
          + "micro ou méso selon qu'il est individuel ou partagé ; une route est macro ; un "
          + "acheteur alternatif est un lien vertical à construire.\n\n"
          + "Sans carte, on écrit « améliorer la qualité du café ». Avec, on écrit « installer "
          + "trois aires de séchage collectives dans les communautés X, Y, Z, ce qui fait passer "
          + "environ soixante ménages du circuit cerises au circuit parche ». La seconde phrase "
          + "se chiffre, se suit et se défend devant un bailleur.",
      },
      {
        type: "exercise",
        id: "c4e1",
        kind: "choice",
        title: "Pourquoi vendre en cerises",
        prompt:
          "Dans la filière café, une partie des ménages vend du café cerise plutôt que du café "
          + "parche, alors que la coopérative paie mieux la seconde forme. Comment "
          + "l'interprétez-vous ?",
        opts: [
          "Ils préfèrent un revenu immédiat et acceptent un prix plus bas",
          "La capacité de séchage, la distance et la météo décident du circuit : vendre en cerises est le plus souvent une contrainte, pas une préférence",
          "Ils ignorent que la coopérative paie mieux",
          "La qualité de leur café ne permet pas la vente en parche",
        ],
        answer: 1,
        hint: "La fiche nomme trois facteurs qui déterminent la forme sous laquelle le café est vendu.",
        explain:
          "La fiche est explicite : le choix entre cerises et parche « dépend de la capacité de "
          + "séchage, de la distance et des conditions météorologiques ». Ce sont des "
          + "contraintes matérielles, pas des préférences — et pendant les périodes pluvieuses, "
          + "les ménages dépendent même davantage des acheteurs qui prennent le café humide. "
          + "L'interprétation compte parce qu'elle désigne le levier : si l'on croit à une "
          + "préférence, on fait de la sensibilisation ; si l'on voit une contrainte, on "
          + "installe une capacité de séchage. Le second est un service, et un service peut être "
          + "porté par une organisation de producteurs.",
      },
      {
        type: "exercise",
        id: "c4e2",
        kind: "choice",
        title: "L'intermédiaire incontournable",
        prompt:
          "Dans les zones reculées, les ménages dépendent des intermédiaires locaux, qui "
          + "regroupent les volumes et les revendent aux agrégateurs ou à la coopérative. Quel "
          + "levier l'analyse suggère-t-elle ?",
        opts: [
          "Interdire ou contourner les intermédiaires, qui captent une marge indue",
          "Offrir une alternative de collecte — ce qui n'est pas la même chose que supprimer l'intermédiaire : il est incontournable parce qu'il est le seul à venir, et une alternative rétablit un choix",
          "Négocier collectivement un prix plancher avec les intermédiaires",
          "Déplacer la production vers les zones accessibles",
        ],
        answer: 1,
        hint: "Demandez-vous d'abord POURQUOI il est incontournable, avant de décider quoi en faire.",
        explain:
          "L'intermédiaire est incontournable parce qu'il assure une fonction que personne "
          + "d'autre n'assure : venir chercher de petits volumes, loin, souvent. Le supprimer "
          + "sans le remplacer laisserait les ménages sans acheteur du tout — ce qui est arrivé "
          + "à plus d'un projet. Le levier est d'offrir une alternative, c'est-à-dire de créer "
          + "un choix là où il n'y en avait pas ; c'est le flux de pouvoir qui se déplace, pas "
          + "le flux de produit, et il se déplace sans qu'on ait eu à interdire quoi que ce "
          + "soit. La négociation collective d'un prix plancher "
          + "(réponse 2) est utile mais suppose déjà une alternative crédible : sans elle, "
          + "négocier face à un acheteur unique reste peu efficace, comme la leçon 1 l'a montré.",
      },
      {
        type: "exercise",
        id: "c4e3",
        kind: "choice",
        title: "Les deux « lorsque » du maraîchage",
        prompt:
          "Deux circuits du maraîchage sont conditionnels : la livraison au centre municipal "
          + "« lorsque le transport est disponible », et la livraison aux marchés publics "
          + "« lorsque les groupes satisfont aux exigences de volume et de régularité ». "
          + "Qu'est-ce que cela désigne ?",
        opts: [
          "Des circuits secondaires, à ignorer dans la cartographie",
          "Les deux points de levier de la filière : ce sont des conditions, donc des choses sur lesquelles une action peut porter",
          "Des risques à mentionner dans l'analyse des contraintes",
          "Des circuits réservés au groupe E",
        ],
        answer: 1,
        hint: "Un point de levier est un endroit où une action petite mais bien placée débloque beaucoup.",
        explain:
          "Ce sont les points de levier. Un circuit conditionnel est un circuit qui EXISTE déjà "
          + "et qui n'attend qu'une condition — c'est très différent d'un circuit à créer. "
          + "Rendre le transport disponible ouvre le premier ; atteindre le volume et la "
          + "régularité ouvre le second, et le programme d'approvisionnement des écoles "
          + "publiques offre alors une demande plus prévisible que le marché local. Or ces deux "
          + "conditions ont la même nature : elles se lèvent par l'organisation collective, pas "
          + "par l'effort individuel. Un producteur seul ne fait pas venir un camion ni ne tient "
          + "un volume régulier. C'est exactement ce qu'une coopérative existe pour faire.",
      },
      {
        type: "exercise",
        id: "c4e4",
        kind: "choice",
        title: "Une filière simple ou complexe",
        prompt:
          "La fiche du miel indique que, selon les communautés, la chaîne « peut apparaître très "
          + "simple ou plus complexe ». Que faut-il en conclure pour la cartographie ?",
        opts: [
          "Qu'il faut cartographier la version moyenne, pour simplifier",
          "Qu'une carte unique pour tout le territoire serait fausse : la structure varie selon les communautés, et cette variation est elle-même un résultat d'analyse",
          "Que la filière miel est trop instable pour être cartographiée",
          "Qu'il faut cartographier la version la plus complexe, qui contient les autres",
        ],
        answer: 1,
        hint: "La variation entre communautés dit quelque chose sur ce qui manque à certaines d'entre elles.",
        explain:
          "Une carte unique masquerait l'essentiel. Là où la chaîne est simple — vente directe "
          + "de miel non filtré à un intermédiaire — c'est généralement qu'il manque quelque "
          + "chose : un atelier de filtration accessible, la couverture de la coopérative, un "
          + "volume suffisant pour intéresser un transporteur. Là où elle est complexe, ces "
          + "maillons existent. La variation n'est donc pas un désordre à lisser : c'est une "
          + "comparaison naturelle, qui montre à la fois ce qui manque et que c'est possible "
          + "ailleurs sur le même territoire. C'est l'argument le plus solide qu'on puisse porter "
          + "devant un financeur.",
      },
      {
        type: "exercise",
        id: "c4e5",
        kind: "text",
        title: "De la carte à l'action",
        prompt:
          "Les trois questions de lecture d'une carte aboutissent toutes au même type de "
          + "réponse : ce qui fait basculer un ménage d'un circuit vers un autre est un … quoi ? "
          + "Répondez en un mot.",
        answer: "service",
        accept: ["un service", "des services"],
        hint: "Séchoir, transport groupé, volume atteint collectivement : quel est leur point commun ?",
        explain:
          "Un service. Un séchoir accessible, un transport groupé, un volume atteint "
          + "collectivement, une information de prix qui circule : ce sont tous des services, et "
          + "c'est le point commun décisif. Un service a un porteur possible, et l'organisation "
          + "de producteurs en est un — c'est même sa raison d'être économique, distincte de sa "
          + "forme juridique. L'article 4 de l'Acte uniforme le dit dans son vocabulaire : la "
          + "coopérative satisfait des besoins communs « au moyen d'une entreprise ». "
          + "L'entreprise, ici, c'est le service ; la carte sert à savoir lequel. Elle ne dit "
          + "donc pas « il faut une coopérative » ; elle dit « il "
          + "manque tel service à tel maillon », et c'est ensuite qu'on se demande qui peut le "
          + "porter. La leçon 5 traite exactement cette question.",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    ordre: 5,
    titre: "Organiser : de la carte à la structure",
    points: 100,
    cellules: [
      {
        type: "md",
        content:
          "## La leçon qui relie les deux cours\n\n"
          + "COOP-01 vous a appris à monter une société coopérative conforme. Les quatre leçons "
          + "précédentes vous ont appris à lire une filière. Celle-ci fait la jonction, et c'est "
          + "elle qui justifie que les deux cours forment un seul parcours.\n\n"
          + "La question est toujours la même, dans cet ordre, et **jamais dans l'autre** :\n\n"
          + "```\n"
          + "  1. Quel SERVICE manque ?          ← la carte le dit\n"
          + "  2. À quel MAILLON ?               ← la carte le dit aussi\n"
          + "  3. Qui peut le PORTER ?           ← une organisation, parfois\n"
          + "  4. Sous quelle FORME juridique ?  ← COOP-01 répond\n"
          + "```\n\n"
          + "L'erreur la plus commune du secteur consiste à commencer par 4. Un bailleur finance "
          + "« la structuration de vingt coopératives », on immatricule vingt coopératives, et "
          + "l'on cherche ensuite ce qu'elles pourraient bien faire. L'Acte uniforme a prévu la "
          + "suite : **l'article 178 a) permet de dissoudre une société coopérative qui n'a pas "
          + "commencé ses opérations dans les deux ans de son immatriculation.**",
      },
      {
        type: "md",
        content:
          "## Le service décide du maillon, le maillon décide du lien commun\n\n"
          + "C'est l'enchaînement à retenir, et il a une conséquence juridique directe.\n\n"
          + "**L'article 8** de l'Acte uniforme définit la coopérative comme composée de "
          + "coopérateurs « unis par le **lien commun** sur la base duquel la société a été "
          + "créée ». Et **l'article 18, 5°** impose de faire figurer ce lien commun dans les "
          + "statuts.\n\n"
          + "Or le lien commun n'est pas décoratif : il détermine **qui peut adhérer**. Un lien "
          + "commun mal choisi ferme la porte à ceux qu'on voulait servir, ou l'ouvre si large "
          + "que le groupe n'a plus rien à faire ensemble.\n\n"
          + "| Le service manquant | Le maillon | Le lien commun cohérent |\n"
          + "|---|---|---|\n"
          + "| séchage du café | post-récolte, producteurs | producteurs de café d'un même bassin |\n"
          + "| transport groupé de légumes | logistique, producteurs | maraîchers livrant un même centre de collecte |\n"
          + "| filtration et mise en bouteille du miel | transformation | apiculteurs d'une même zone de floraison |\n"
          + "| volume régulier pour l'alimentation scolaire | agrégation | producteurs engagés sur un cahier des charges |\n\n"
          + "Notez la dernière ligne : le lien commun peut être un **engagement** et pas "
          + "seulement un métier ou un territoire. L'article 8 admet « une profession, une "
          + "identité d'objectif, d'activité, ou de forme juridique ».",
      },
      {
        type: "md",
        content:
          "## L'objet statutaire doit décrire l'activité réelle\n\n"
          + "**L'article 18, 3°** exige que les statuts portent « la nature et le domaine de son "
          + "activité, qui forment son objet social », et **l'article 20** ajoute que l'objet "
          + "doit être **déterminé, décrit et licite**.\n\n"
          + "Un objet rédigé en une ligne vague — « toute activité agricole » — est une "
          + "invitation au refus au guichet du registre. Mais le vrai problème est ailleurs : "
          + "**un objet vague signale presque toujours qu'on n'a pas fait le travail des leçons "
          + "1 à 4.** Quand la carte a désigné le service et le maillon, l'objet s'écrit tout "
          + "seul.\n\n"
          + "Comparez :\n\n"
          + "> ✗ « La coopérative a pour objet toute activité de production et de "
          + "commercialisation agricole. »\n\n"
          + "> ✓ « La coopérative a pour objet la collecte, le séchage, le tri et la "
          + "commercialisation groupée du café produit par ses membres, ainsi que "
          + "l'approvisionnement de ceux-ci en intrants et en petit matériel de post-récolte. »\n\n"
          + "La seconde formulation est plus longue, et elle dit à un banquier, à un acheteur et "
          + "à un agent du registre exactement ce que la structure fait.",
      },
      {
        type: "callout",
        title: "Coopérative de base ou union : ce que la subsidiarité impose",
        variant: "warning",
        content:
          "Deux services ne se logent pas au même étage, et se tromper d'étage produit un "
          + "conflit garanti.\n\n"
          + "**Au niveau de la coopérative de base** : ce que les membres ne peuvent pas faire "
          + "seuls mais qui reste local — une aire de séchage, un magasin, un groupage de "
          + "commandes.\n\n"
          + "**Au niveau de l'union** (art. 133 : au moins deux coopératives ayant le ou les "
          + "mêmes objets) : ce qui exige une échelle qu'aucune coopérative n'atteint seule — "
          + "une centrale d'achat d'intrants, un camion, un contrat cadre avec un acheteur "
          + "institutionnel.\n\n"
          + "**Et la limite, qui est écrite** : l'article 136 autorise l'union à exercer toutes "
          + "activités économiques, « toutefois, ces activités s'exercent dans le respect du "
          + "**principe de subsidiarité** par rapport aux activités des sociétés coopératives "
          + "affiliées ». L'union fait ce que la base ne peut pas faire — elle ne la concurrence "
          + "pas.\n\n"
          + "C'est l'une des causes de conflit les plus fréquentes entre une faîtière et ses "
          + "membres, et le texte donne aux affiliées un argument juridique, pas seulement "
          + "politique.",
      },
      {
        type: "md",
        content:
          "## Quand la réponse n'est PAS une coopérative\n\n"
          + "Un praticien honnête doit savoir dire non. Trois situations où monter une "
          + "coopérative est le mauvais outil :\n\n"
          + "**1. Il n'y a pas de demande.** La leçon 1 l'a posé : sans marché final, il n'y a "
          + "pas de filière. Une coopérative de commercialisation sans acheteur est une "
          + "structure sans opérations, exposée à l'article 178 a).\n\n"
          + "**2. Le service manquant relève du niveau macro.** Une route, un cadre "
          + "réglementaire, une norme nationale : aucune coopérative ne les produit. Elle peut "
          + "les porter en plaidoyer — c'est même une mission des confédérations (art. 155) — "
          + "mais elle ne les remplace pas.\n\n"
          + "**3. Le collectif n'existe pas et rien ne le fera exister.** Cinq personnes "
          + "suffisent en droit pour une SCOOPS (art. 204), mais l'article 47 impose à chaque "
          + "coopérateur de faire des transactions avec sa coopérative, et l'article 13 b) rend "
          + "exclusible celui qui n'en fait aucune pendant deux années consécutives. Des membres "
          + "recrutés pour atteindre un seuil sont des membres exclusibles — et leur départ "
          + "ramènerait la société sous le minimum légal, ouvrant l'article 51.\n\n"
          + "Dans ces cas, la réponse professionnelle est un diagnostic écrit, pas une "
          + "immatriculation.",
      },
      {
        type: "md",
        content:
          "## L'ordre de montage d'une filière\n\n"
          + "Repris de la leçon 8 de COOP-01, et maintenant justifié par tout ce qui précède :\n\n"
          + "**1.** Les **coopératives de base**, une par bassin, en SCOOPS — cinq membres "
          + "minimum, libération du capital étalée possible (art. 204 et 207). Objet précis, "
          + "lien commun explicite, adossés au service que la carte a désigné.\n\n"
          + "**2.** L'**union**, dès que deux coopératives de même objet existent (art. 133), "
          + "pour ce qui exige l'échelle, sous subsidiarité (art. 136). Prévoir trois délégués "
          + "mandatés par coopérative (art. 134) et des administrateurs qui ne le sont pas déjà "
          + "ailleurs dans le même État (art. 300).\n\n"
          + "**3.** La **fédération**, quand deux unions existent (art. 141) : le niveau du "
          + "contrôle par les pairs et de l'arbitrage des valeurs de remboursement de parts "
          + "(art. 50).\n\n"
          + "**4.** Le **réseau**, pour un projet à durée déterminée ou transfrontalier "
          + "(art. 160-163).\n\n"
          + "**5.** L'**interprofession** — dossier séparé, droit national, une fois le collège "
          + "producteur constitué.\n\n"
          + "Le piège reste le même : commencer par le haut parce qu'un bailleur finance la "
          + "faîtière. Une union sans coopératives immatriculées n'a pas de membres fondateurs "
          + "valables, l'article 134 exigeant des délégués mandatés **par des sociétés "
          + "coopératives**.",
      },
      {
        type: "callout",
        title: "Ce que vous savez faire au bout de ce parcours",
        variant: "success",
        content:
          "Lire un territoire sans le traiter comme un bloc, et nommer ce qui exclut certains "
          + "groupes par construction.\n\n"
          + "Arbitrer entre plusieurs filières sur sept critères explicites, et écrire pourquoi "
          + "vous écartez les autres.\n\n"
          + "Cartographier des circuits multiples, dire qui prend lequel, et désigner le point "
          + "où une action modeste fait basculer un ménage vers un circuit mieux payé.\n\n"
          + "Traduire ce point en service, ce service en maillon, ce maillon en lien commun, et "
          + "ce lien commun en statuts conformes — ou dire, avec des arguments, qu'il ne faut "
          + "pas monter de structure.\n\n"
          + "C'est ce que décrit le titre délivré : **Spécialiste en Organisation des Acteurs et "
          + "Structuration des Filières**.",
      },
      {
        type: "exercise",
        id: "c5e1",
        kind: "choice",
        title: "L'ordre des questions",
        prompt:
          "Un projet vous confie une mission : « structurer vingt coopératives de producteurs "
          + "dans le département ». Par quoi commencez-vous ?",
        opts: [
          "Par identifier vingt groupes de cinq producteurs et préparer vingt jeux de statuts",
          "Par établir, filière par filière, quel service manque et à quel maillon — le nombre de structures et leur forme en découlent, ils ne se décident pas d'avance",
          "Par choisir entre SCOOPS et COOP-CA selon la taille des groupes",
          "Par vérifier la disponibilité des dénominations au registre",
        ],
        answer: 1,
        hint: "Le nombre « vingt » est-il un résultat d'analyse ou une commande ?",
        explain:
          "« Vingt coopératives » est un objectif de moyens déguisé en objectif de résultat. "
          + "L'ordre professionnel est : quel service manque, à quel maillon, qui peut le "
          + "porter, sous quelle forme. Le nombre de structures en découle — il peut être de "
          + "trois, ou de vingt-cinq. Commencer par la forme juridique produit des coquilles "
          + "sans activité, et l'Acte uniforme a prévu leur sort : l'article 178 a) permet à la "
          + "juridiction compétente de dissoudre une société coopérative qui n'a pas commencé "
          + "ses opérations dans les deux ans de son immatriculation. Dire cela au commanditaire "
          + "fait partie du travail, et se dit mieux au début qu'à l'évaluation finale.",
      },
      {
        type: "exercise",
        id: "c5e2",
        kind: "choice",
        title: "Le service et son étage",
        prompt:
          "La cartographie a montré qu'un camion de collecte manque pour desservir quatre "
          + "communautés maraîchères, chacune dotée d'une coopérative de base de trente "
          + "membres. Où loger ce service ?",
        opts: [
          "Dans chaque coopérative de base : chacune achète un quart de camion",
          "Dans une union des quatre coopératives : le service exige une échelle qu'aucune n'atteint seule, et l'article 133 permet à deux coopératives de même objet de la constituer",
          "Dans une fédération, qui a plus de moyens",
          "Chez un prestataire privé, une coopérative ne pouvant pas exercer d'activité de transport",
        ],
        answer: 1,
        hint: "Le critère n'est pas la taille de la structure mais l'échelle que le service exige.",
        explain:
          "L'union. L'article 133 permet à au moins deux sociétés coopératives ayant le ou les "
          + "mêmes objets de constituer une union pour la gestion de leurs intérêts communs, et "
          + "l'article 136 l'autorise à exercer toutes activités économiques — sous réserve du "
          + "principe de subsidiarité, respecté ici puisque aucune coopérative de base ne peut "
          + "porter un camion seule. La fédération (réponse 2) suppose au préalable deux unions "
          + "(art. 141) : on ne saute pas un étage. Et rien n'interdit à une coopérative "
          + "d'exercer une activité de transport, l'article 5 disposant que les coopératives "
          + "exercent leur action dans toutes les branches de l'activité humaine ; l'article 20 "
          + "rappelle seulement que si l'activité est réglementée, il faut s'y conformer.",
      },
      {
        type: "exercise",
        id: "c5e3",
        kind: "choice",
        title: "Le lien commun qui exclut",
        prompt:
          "Une coopérative doit porter une aire de séchage collective du café. On propose comme "
          + "lien commun statutaire : « les producteurs de café livrant à la coopérative "
          + "régionale ». Qu'en pensez-vous ?",
        opts: [
          "C'est un bon lien commun : il est précis et objectif",
          "Il exclut par construction ceux qu'on voulait servir : les ménages qui vendent en cerises ne livrent pas à la coopérative régionale, précisément faute de séchage — le lien commun doit porter sur le bassin de production, pas sur le débouché actuel",
          "Il est trop large : il faudrait le restreindre à une communauté",
          "Le lien commun n'a pas d'effet sur l'adhésion, seulement sur l'objet",
        ],
        answer: 1,
        hint: "Relisez la leçon 4 : qui livre à la coopérative régionale, et pourquoi les autres n'y livrent pas.",
        explain:
          "Le lien commun détermine qui peut adhérer (art. 8, et art. 18, 5° qui impose de le "
          + "faire figurer aux statuts). Celui-ci est défini par le débouché ACTUEL — livrer à "
          + "la coopérative régionale — or c'est exactement ce que les ménages sans capacité de "
          + "séchage ne font pas : ils vendent en cerises aux intermédiaires. Le lien commun "
          + "exclurait donc les bénéficiaires visés, tout en admettant ceux qui n'ont pas besoin "
          + "de l'aire de séchage. Un lien commun fondé sur le bassin de production — « les "
          + "producteurs de café des communautés X, Y et Z » — inclut les uns et les autres et "
          + "reste un critère objectif au sens de l'article 8.",
      },
      {
        type: "exercise",
        id: "c5e4",
        kind: "choice",
        title: "Savoir dire non",
        prompt:
          "Dans une zone enclavée, l'analyse conclut que le blocage principal est l'état de la "
          + "piste, coupée quatre mois par an, et qu'aucun acheteur ne s'y déplace en saison des "
          + "pluies. Le projet demande de monter une coopérative de commercialisation. Que "
          + "répondez-vous ?",
        opts: [
          "On la monte : elle pourra ensuite plaider pour la réhabilitation de la piste",
          "On ne monte pas une structure de commercialisation là où la contrainte est macro et où le débouché n'existe pas quatre mois par an ; on l'écrit, et on cherche soit un service que le collectif peut réellement porter, soit une action sur la piste",
          "On monte une union directement, plus solide face aux pouvoirs publics",
          "On monte la coopérative avec un objet plus large pour couvrir d'autres activités",
        ],
        answer: 1,
        hint: "Une coopérative peut porter un plaidoyer ; peut-elle produire une route ?",
        explain:
          "Une contrainte de niveau macro — une infrastructure — ne se règle pas par une "
          + "structure juridique. La coopérative peut porter un plaidoyer, et c'est même une "
          + "mission reconnue aux niveaux supérieurs (art. 155 pour les confédérations), mais "
          + "elle ne construit pas la piste et ne fera pas venir d'acheteur quatre mois par an. "
          + "Monter quand même produit une société sans opérations, exposée à l'article 178 a), "
          + "et abîme la confiance des membres pour dix ans. Élargir l'objet (réponse 3) "
          + "aggraverait le problème : l'article 20 exige un objet déterminé et décrit, et un "
          + "objet fourre-tout est le symptôme d'une analyse qui n'a pas été faite. La réponse "
          + "professionnelle est un diagnostic écrit, avec l'alternative : soit un service que le "
          + "collectif peut réellement rendre malgré l'enclavement — stockage, transformation "
          + "sur place, étalement des ventes — soit une action sur la piste elle-même.",
      },
      {
        type: "exercise",
        id: "c5e5",
        kind: "text",
        title: "L'enchaînement du métier",
        prompt:
          "Résumez l'ordre des quatre questions du parcours en donnant le PREMIER terme : on "
          + "part toujours du … qui manque, avant de parler de maillon, de porteur et de forme "
          + "juridique. Répondez en un mot.",
        answer: "service",
        accept: ["du service", "le service"],
        hint: "C'est le mot qui concluait déjà la leçon 4.",
        explain:
          "Le service. L'enchaînement est : quel SERVICE manque, à quel MAILLON, qui peut le "
          + "PORTER, sous quelle FORME juridique. Prendre les questions dans cet ordre est ce "
          + "qui sépare une structuration qui tient d'une immatriculation qui meurt. Et l'ordre "
          + "a une traduction juridique directe : le service désigne le maillon, le maillon "
          + "commande le lien commun (art. 8 et art. 18, 5°), et le lien commun avec l'objet "
          + "social (art. 18, 3° et art. 20) constituent ensemble ce qu'un agent du registre, un "
          + "banquier et un acheteur liront pour décider s'ils vous font confiance.",
      },
    ],
  },
];
