/**
 * Contenu du livret de révision du test d'admission.
 *
 * Source unique : le PDF (script/generate-livret-revision.ts) et la section « Ressources »
 * de la page de présentation lisent tous deux ce fichier. Une première intention était de
 * n'écrire que le PDF ; le sommaire affiché sur le site en aurait été une recopie, et le jour
 * où l'un des deux aurait changé, c'est l'étudiant qui aurait découvert l'écart.
 *
 * ── Ce que ce livret n'est pas ──
 *
 * Ce n'est pas un corrigé. Les trente questions du test ne figurent nulle part ici, et les
 * dix questions d'entraînement sont différentes de celles du test. Un livret qui donnerait
 * les réponses ferait entrer des gens que la formation perdrait en deux semaines : le test
 * ne sert pas à filtrer pour filtrer, il vérifie qu'on a les bases pour suivre.
 *
 * ── Chiffres à tenir à jour ──
 *
 * Le livret annonce des seuils qui vivent dans le code. Si l'un change, corriger ici :
 *   21 bonnes réponses sur 30  → ADMISSION_PASS_SCORE, api/index.ts
 *   accès valable 3 mois       → ADMISSION_MONTHS, api/index.ts
 *   70 % pour valider une leçon → EXERCISE_PASS_PCT, shared/exercises.ts
 */

export interface Notion {
  terme: string;
  texte: string;
}

export interface Chapitre {
  numero: number;
  titre: string;
  /** Domaine du test couvert, et nombre de questions qui en relèvent. */
  domaine: string;
  questionsAuTest: number;
  objectif: string;
  notions: Notion[];
  aRetenir: string[];
  /** L'erreur que font la plupart des candidats sur ce domaine. */
  piege?: string;
}

export interface QuestionEntrainement {
  q: string;
  options: string[];
  /** Index de la bonne réponse dans `options`. */
  bonne: number;
  pourquoi: string;
}

export const LIVRET_TITRE = "Réussir le test d'admission";
export const LIVRET_SOUS_TITRE = "Livret de révision — MEAL, KoboCollect, Python et QGIS";
export const LIVRET_AUTEUR = "Louis TATCHIDA";
export const LIVRET_FONCTION = "Agronome, expert en suivi-évaluation et digitalisation";
export const LIVRET_FICHIER = "/academy/livret-revision.pdf";

export const CHAPITRES: Chapitre[] = [
  {
    numero: 1,
    titre: "Le MEAL : de quoi parle-t-on ?",
    domaine: "MEAL — concepts",
    questionsAuTest: 6,
    objectif:
      "Savoir nommer les quatre fonctions du MEAL, situer une information dans le cadre "
      + "logique, et distinguer le suivi de l'évaluation.",
    notions: [
      {
        terme: "MEAL",
        texte:
          "Monitoring, Evaluation, Accountability, Learning — Suivi, Évaluation, Redevabilité "
          + "et Apprentissage. Quatre fonctions distinctes, souvent portées par la même équipe.",
      },
      {
        terme: "Suivi et évaluation",
        texte:
          "Le suivi est continu et interne : « où en sommes-nous ? ». L'évaluation est "
          + "ponctuelle, souvent externe, et porte un jugement : « est-ce que cela a marché, "
          + "et pourquoi ? ». Confondre les deux est l'erreur la plus fréquente.",
      },
      {
        terme: "Théorie du changement",
        texte:
          "La logique causale qui relie les activités aux impacts. Elle explique pourquoi on "
          + "croit que faire ceci produira cela, et rend ce raisonnement discutable.",
      },
      {
        terme: "Cadre logique",
        texte:
          "Intrants (ressources) → activités → extrants (outputs) → effets (outcomes) → "
          + "impact. Les outputs sont les résultats DIRECTS des activités : « 40 agents "
          + "formés ». Les outcomes sont ce que cela change : « les données arrivent "
          + "complètes ».",
      },
      {
        terme: "Redevabilité",
        texte:
          "Donner aux personnes servies un moyen réel de faire un retour, une réclamation, et "
          + "d'obtenir une réponse. Elle regarde vers les bénéficiaires, pas vers le bailleur.",
      },
      {
        terme: "Moments de l'évaluation",
        texte:
          "Ex-ante avant le démarrage ; à mi-parcours pendant la mise en œuvre, pour ajuster ; "
          + "finale après la clôture, pour juger des résultats obtenus.",
      },
      {
        terme: "Learning review",
        texte:
          "Un temps collectif pour tirer les enseignements et améliorer la pratique. Ce n'est "
          + "ni un contrôle des agents, ni un rapport de plus.",
      },
    ],
    aRetenir: [
      "Suivi = continu et interne. Évaluation = ponctuelle et porte un jugement.",
      "Outputs : ce que le projet PRODUIT. Outcomes : ce que cela CHANGE chez les gens.",
      "La redevabilité s'adresse aux bénéficiaires ; l'audit s'adresse au bailleur.",
    ],
    piege:
      "Confondre redevabilité et audit financier. L'audit vérifie l'usage des fonds pour "
      + "celui qui les donne ; la redevabilité donne une voix à celui qui reçoit l'aide.",
  },
  {
    numero: 2,
    titre: "Mesurer : indicateurs, échantillonnage, seuils",
    domaine: "MEAL — mesure et terrain",
    questionsAuTest: 3,
    objectif:
      "Reconnaître un indicateur bien formulé, savoir à quoi sert le LQAS, et connaître les "
      + "seuils de malnutrition aiguë au périmètre brachial.",
    notions: [
      {
        terme: "Indicateur SMART",
        texte:
          "Spécifique, Mesurable, Atteignable, Réaliste, Temporel. Retenez « Spécifique » et "
          + "non « Simple » : c'est sur ce mot que se joue la question.",
      },
      {
        terme: "Base de référence et cible",
        texte:
          "La base de référence (baseline) est la valeur au départ ; la cible est la valeur "
          + "visée à l'échéance. Sans base de référence, aucune progression n'est démontrable.",
      },
      {
        terme: "Désagrégation",
        texte:
          "Ventiler un indicateur par sexe, âge, zone. Une moyenne globale masque les écarts, "
          + "et ce sont précisément ces écarts qui orientent l'action.",
      },
      {
        terme: "LQAS",
        texte:
          "Lot Quality Assurance Sampling : un petit échantillon pour trancher rapidement si "
          + "une zone atteint ou non un seuil de couverture. C'est une décision oui/non, pas "
          + "une mesure fine de prévalence.",
      },
      {
        terme: "Périmètre brachial (MUAC)",
        texte:
          "Chez l'enfant de 6 à 59 mois : moins de 115 mm signale une malnutrition aiguë "
          + "sévère (MAS) ; de 115 à moins de 125 mm, une malnutrition aiguë modérée (MAM) ; "
          + "125 mm et plus, un état normal.",
      },
      {
        terme: "Quantitatif et qualitatif",
        texte:
          "Le chiffre dit combien, l'entretien dit pourquoi. Un dispositif MEAL qui n'a que "
          + "des chiffres constate sans jamais expliquer.",
      },
    ],
    aRetenir: [
      "SMART commence par Spécifique, et se termine par Temporel : sans échéance, ce n'est pas SMART.",
      "MUAC < 115 mm = MAS. Entre 115 et 125 mm = MAM.",
      "Le LQAS répond « le seuil est-il atteint ? », pas « quelle est la prévalence ? ».",
    ],
    piege:
      "Croire qu'un indicateur chiffré est forcément SMART. « Former beaucoup d'agents » est "
      + "mesurable une fois compté, mais ni spécifique ni daté.",
  },
  {
    numero: 3,
    titre: "KoboCollect et XLSForm",
    domaine: "Collecte de données",
    questionsAuTest: 7,
    objectif:
      "Savoir lire un XLSForm, reconnaître le rôle de chaque colonne, et connaître les étapes "
      + "du déploiement sur un téléphone.",
    notions: [
      {
        terme: "Structure d'un XLSForm",
        texte:
          "Un classeur avec deux onglets indispensables : survey, qui porte les questions, et "
          + "choices, qui liste les options des questions à choix. Un troisième, settings, "
          + "porte le titre et l'identifiant du formulaire.",
      },
      {
        terme: "Les trois colonnes de survey",
        texte:
          "type définit la nature de la question ; name est l'identifiant technique, jamais "
          + "affiché, qui servira de nom de colonne dans les données ; label est le texte que "
          + "lit l'enquêteur.",
      },
      {
        terme: "Types de questions",
        texte:
          "text, integer, decimal, date, select_one, select_multiple, image, note, calculate, "
          + "et geopoint pour une position GPS (geotrace pour une ligne, geoshape pour une "
          + "surface).",
      },
      {
        terme: "relevant",
        texte:
          "Affiche une question sous condition, par exemple ${age} < 5 pour ne poser une "
          + "question qu'aux enfants. Elle conditionne l'AFFICHAGE.",
      },
      {
        terme: "constraint",
        texte:
          "Valide la réponse saisie. Le point désigne la valeur en cours de saisie : . > 0 "
          + "refuse zéro et les négatifs. constraint_message explique le refus à l'enquêteur.",
      },
      {
        terme: "required",
        texte:
          "Rend la réponse obligatoire — à ne pas confondre avec relevant ni constraint.",
      },
      {
        terme: "Déployer et collecter",
        texte:
          "Publier le formulaire sur KoboToolbox, puis dans KoboCollect renseigner l'URL du "
          + "serveur et le compte, télécharger le formulaire vide, collecter hors ligne, et "
          + "envoyer une fois le réseau retrouvé.",
      },
      {
        terme: "L'API KoboToolbox",
        texte:
          "On récupère les données déjà collectées en GET, et on envoie une soumission en "
          + "POST. C'est ce qui permet d'automatiser un rapport sans exporter à la main.",
      },
    ],
    aRetenir: [
      "Trois colonnes, trois rôles : relevant affiche, constraint valide, required oblige.",
      "geopoint capture une position GPS ; le point « . » désigne la valeur saisie.",
      "Le mode hors ligne est le mode normal sur le terrain : on synchronise au retour.",
    ],
    piege:
      "Traduire les noms de colonnes. « type », « name », « label », « relevant » sont des "
      + "mots réservés d'XLSForm : traduits, ils ne désignent plus rien et le formulaire casse.",
  },
  {
    numero: 4,
    titre: "Python et pandas pour les données MEAL",
    domaine: "Analyse de données",
    questionsAuTest: 7,
    objectif:
      "Lire un fichier, l'inspecter, le nettoyer, le filtrer et l'agréger — les cinq gestes "
      + "qui couvrent l'essentiel du travail d'analyse.",
    notions: [
      {
        terme: "Charger des données",
        texte:
          "import pandas as pd, puis df = pd.read_csv(\"donnees.csv\"). Pour un classeur "
          + "Excel, pd.read_excel(). Le résultat s'appelle un DataFrame : un tableau avec des "
          + "colonnes nommées.",
      },
      {
        terme: "Regarder avant de calculer",
        texte:
          "df.head() affiche les cinq premières lignes, df.shape donne (lignes, colonnes), "
          + "df.info() les types et les manquants, df.describe() les statistiques de base.",
      },
      {
        terme: "Une colonne, une statistique",
        texte:
          "df[\"age\"] sélectionne la colonne ; df[\"age\"].mean() en donne la moyenne. De "
          + "même sum(), median(), count(), value_counts() pour compter les modalités.",
      },
      {
        terme: "Valeurs manquantes",
        texte:
          "df.isna().sum() compte les manquants par colonne ; df.dropna() supprime les lignes "
          + "concernées ; df.fillna(0) les remplace. Supprimer n'est pas anodin : on perd des "
          + "observations, il faut savoir combien.",
      },
      {
        terme: "Filtrer",
        texte:
          "df[df[\"statut\"] == \"actif\"] garde les lignes voulues. Pour combiner, & et | "
          + "avec des parenthèses autour de chaque condition.",
      },
      {
        terme: "Agréger — le geste central du MEAL",
        texte:
          "df.groupby(\"district\")[\"muac\"].mean() donne la moyenne par district. C'est "
          + "ainsi qu'on produit un indicateur désagrégé par zone, par sexe ou par période.",
      },
      {
        terme: "Visualiser et exporter",
        texte:
          "matplotlib trace les graphiques (import matplotlib.pyplot as plt). "
          + "df.to_excel(\"rapport.xlsx\", index=False) écrit le résultat dans un classeur.",
      },
    ],
    aRetenir: [
      "pd.read_csv() pour lire, df.head() pour regarder, df.dropna() pour nettoyer.",
      "On sélectionne la colonne AVANT de calculer : df[\"age\"].mean().",
      "groupby() est ce qui transforme un tableau brut en indicateur par catégorie.",
    ],
    piege:
      "Inventer des noms de fonctions plausibles. pd.open_csv(), df.show(), df.avg() et "
      + "df.mean(\"age\") n'existent pas — ce sont les fausses réponses classiques.",
  },
  {
    numero: 5,
    titre: "QGIS et l'information géographique",
    domaine: "Cartographie et analyse spatiale",
    questionsAuTest: 7,
    objectif:
      "Distinguer vecteur et raster, comprendre ce qu'est une projection, et savoir ce que "
      + "font une jointure spatiale, une zone tampon et un Atlas.",
    notions: [
      {
        terme: "QGIS",
        texte:
          "Un système d'information géographique libre et gratuit, alternative complète aux "
          + "logiciels propriétaires.",
      },
      {
        terme: "Vecteur et raster",
        texte:
          "Le vecteur décrit des objets — points, lignes, polygones — avec une table "
          + "d'attributs. Le raster est une grille de pixels : image satellite, modèle de "
          + "terrain.",
      },
      {
        terme: "Formats",
        texte:
          "Le GeoPackage (.gpkg) est le format recommandé : un seul fichier, plusieurs "
          + "couches, pas de limite sur les noms de champs. Il remplace le Shapefile, qui "
          + "impose plusieurs fichiers solidaires et des noms tronqués à 10 caractères. Le "
          + "GeoJSON sert surtout à l'échange.",
      },
      {
        terme: "Système de coordonnées",
        texte:
          "WGS84, code EPSG:4326, exprime les positions en degrés de latitude et longitude — "
          + "c'est ce que renvoie un GPS. Les projections métriques, comme les zones UTM, "
          + "s'expriment en mètres.",
      },
      {
        terme: "Importer des données de terrain",
        texte:
          "Un export KoboCollect en CSV avec deux colonnes latitude et longitude se charge "
          + "par « Couche texte délimité ». Un GeoJSON s'ouvre directement.",
      },
      {
        terme: "Jointure attributaire ou spatiale",
        texte:
          "La jointure attributaire rapproche deux tables par un identifiant commun. La "
          + "jointure SPATIALE les rapproche par la position : quel village tombe dans quel "
          + "district.",
      },
      {
        terme: "Zone tampon",
        texte:
          "Un rayon autour d'une entité — les ménages à moins de 2 km d'un forage. À calculer "
          + "dans une projection métrique, sans quoi le rayon serait exprimé en degrés.",
      },
      {
        terme: "Atlas et PyQGIS",
        texte:
          "L'Atlas de la mise en page produit automatiquement une carte par entité : une "
          + "carte par district en un seul export. PyQGIS automatise le reste — "
          + "QgsVectorLayer(chemin, nom, \"ogr\") charge une couche vectorielle.",
      },
    ],
    aRetenir: [
      "EPSG:4326 = degrés. Pour mesurer en mètres, reprojeter d'abord.",
      "Jointure attributaire = par identifiant. Jointure spatiale = par position.",
      "L'Atlas sert à produire des cartes en série, une par entité.",
    ],
    piege:
      "Calculer une distance ou une surface en EPSG:4326. Le résultat sort en degrés, il "
      + "n'a aucun sens métrique, et rien ne signale l'erreur.",
  },
  {
    numero: 6,
    titre: "Méthode : le jour du test",
    domaine: "Déroulement de l'épreuve",
    questionsAuTest: 0,
    objectif:
      "Aborder l'épreuve sans perdre de points sur des questions dont vous connaissez la "
      + "réponse.",
    notions: [
      {
        terme: "Format",
        texte:
          "Trente questions à choix multiple, une seule bonne réponse par question. Il faut "
          + "21 bonnes réponses pour être admis, soit 70 %.",
      },
      {
        terme: "Aucune pénalité",
        texte:
          "Une mauvaise réponse ne retire aucun point. Ne laissez donc jamais une question "
          + "vide : même au jugé, une chance sur quatre vaut mieux que zéro.",
      },
      {
        terme: "Naviguer librement",
        texte:
          "Vous pouvez passer une question et y revenir. Traitez d'abord celles dont vous êtes "
          + "sûr, le reste se traite ensuite avec plus de temps et moins de doute.",
      },
      {
        terme: "Éliminer avant de choisir",
        texte:
          "Deux options sont souvent manifestement fausses. Les écarter transforme une chance "
          + "sur quatre en une chance sur deux, avant même de réfléchir au fond.",
      },
      {
        terme: "Se méfier des quasi-jumelles",
        texte:
          "Les fausses réponses ressemblent aux vraies à un mot près : « Simple » au lieu de "
          + "« Spécifique », open_csv au lieu de read_csv. Lisez l'option en entier.",
      },
      {
        terme: "Ne pas traduire la page",
        texte:
          "Si votre navigateur propose de traduire, refusez. Les termes techniques sont des "
          + "noms de colonnes et de fonctions ; traduits, les énoncés deviennent faux.",
      },
      {
        terme: "En cas d'échec",
        texte:
          "Une nouvelle tentative est possible après une semaine. Ce délai n'est pas une "
          + "sanction : il laisse le temps de reprendre les points faibles.",
      },
    ],
    aRetenir: [
      "21 bonnes réponses sur 30. Pas de point négatif : répondez à tout.",
      "Éliminez deux options avant de choisir entre les deux qui restent.",
      "Refusez la traduction automatique de la page.",
    ],
  },
];

export const ENTRAINEMENT: QuestionEntrainement[] = [
  {
    q: "Dans un XLSForm, quelle colonne rend une réponse obligatoire ?",
    options: ["relevant", "constraint", "required", "mandatory"],
    bonne: 2,
    pourquoi:
      "relevant conditionne l'affichage, constraint valide la valeur saisie, required rend "
      + "la réponse obligatoire. « mandatory » n'existe pas dans XLSForm.",
  },
  {
    q: "Quel format géographique regroupe plusieurs couches dans un seul fichier ?",
    options: ["Shapefile (.shp)", "GeoPackage (.gpkg)", "CSV", "GeoTIFF"],
    bonne: 1,
    pourquoi:
      "Le Shapefile impose plusieurs fichiers solidaires ; le GeoPackage n'en demande qu'un "
      + "et peut contenir plusieurs couches. Le GeoTIFF est un format raster.",
  },
  {
    q: "Que produit df.groupby(\"sexe\")[\"age\"].mean() ?",
    options: [
      "L'âge moyen de tout le tableau",
      "L'âge moyen pour chaque sexe",
      "Le nombre de personnes par sexe",
      "La liste des âges triés par sexe",
    ],
    bonne: 1,
    pourquoi:
      "groupby forme un groupe par modalité de la colonne « sexe », puis mean() calcule la "
      + "moyenne d'âge à l'intérieur de chaque groupe.",
  },
  {
    q: "Dans un cadre logique, « 40 agents formés » est :",
    options: ["Un intrant", "Une activité", "Un extrant (output)", "Un impact"],
    bonne: 2,
    pourquoi:
      "C'est le résultat direct et immédiat de l'activité de formation. L'intrant serait le "
      + "budget, l'impact la baisse durable de la malnutrition.",
  },
  {
    q: "Un enfant de 24 mois présente un MUAC de 118 mm. Cela indique :",
    options: [
      "Un état nutritionnel normal",
      "Une malnutrition aiguë modérée (MAM)",
      "Une malnutrition aiguë sévère (MAS)",
      "Une malnutrition chronique",
    ],
    bonne: 1,
    pourquoi:
      "118 mm se situe entre 115 et 125 mm : malnutrition aiguë modérée. En dessous de "
      + "115 mm, on serait en MAS.",
  },
  {
    q: "Pour compter les ménages situés à moins de 2 km d'un forage, on utilise :",
    options: [
      "Une jointure attributaire",
      "Une zone tampon dans une projection métrique",
      "Un Atlas",
      "Une table de calcul dans QGIS",
    ],
    bonne: 1,
    pourquoi:
      "La zone tampon dessine le rayon de 2 km. La projection doit être métrique, sinon le "
      + "rayon serait interprété en degrés.",
  },
  {
    q: "Que fait df.dropna() ?",
    options: [
      "Remplace les valeurs manquantes par zéro",
      "Supprime les lignes contenant des valeurs manquantes",
      "Compte les valeurs manquantes",
      "Supprime les colonnes en double",
    ],
    bonne: 1,
    pourquoi:
      "dropna supprime. Pour remplacer, fillna ; pour compter, isna().sum().",
  },
  {
    q: "Un mécanisme de plainte et de retour d'information s'adresse d'abord :",
    options: [
      "Au bailleur de fonds",
      "Aux personnes bénéficiaires du projet",
      "À l'équipe de direction",
      "Aux auditeurs externes",
    ],
    bonne: 1,
    pourquoi:
      "C'est le cœur de la redevabilité : donner une voix à ceux que le projet sert. Le "
      + "bailleur, lui, reçoit des rapports et des audits.",
  },
  {
    q: "Dans la colonne constraint, l'expression . < 150 signifie :",
    options: [
      "La question s'affiche si la valeur est inférieure à 150",
      "La valeur saisie doit être inférieure à 150",
      "La valeur par défaut est 150",
      "Le champ accepte au maximum 150 caractères",
    ],
    bonne: 1,
    pourquoi:
      "Le point désigne la valeur en cours de saisie, et constraint la valide. Conditionner "
      + "l'affichage serait le rôle de relevant.",
  },
  {
    q: "Les coordonnées d'un point relevé en EPSG:4326 sont exprimées en :",
    options: ["Mètres", "Kilomètres", "Degrés décimaux", "Pieds"],
    bonne: 2,
    pourquoi:
      "WGS84 (EPSG:4326) est un système géographique : latitude et longitude en degrés. Les "
      + "mètres supposent une projection, par exemple une zone UTM.",
  },
];

export interface JourDeRevision {
  jour: string;
  titre: string;
  quoi: string;
}

/**
 * Plan de révision sur cinq jours.
 *
 * Chaque journée demande de FAIRE quelque chose, pas seulement de relire : on retient une
 * commande qu'on a tapée, beaucoup moins une commande qu'on a lue.
 */
export const PLAN_REVISION: JourDeRevision[] = [
  {
    jour: "Jour 1",
    titre: "Le vocabulaire du MEAL",
    quoi:
      "Chapitres 1 et 2. Prenez un projet que vous connaissez et placez-en les éléments dans "
      + "le cadre logique : qu'est-ce qui est intrant, activité, extrant, effet ? C'est "
      + "l'exercice qui ancre la distinction le plus vite.",
  },
  {
    jour: "Jour 2",
    titre: "KoboCollect et XLSForm",
    quoi:
      "Chapitre 3. Ouvrez un XLSForm dans un tableur — même un exemple trouvé en ligne — et "
      + "repérez les onglets survey et choices, puis les colonnes type, name, label, "
      + "relevant et constraint.",
  },
  {
    jour: "Jour 3",
    titre: "Python et pandas",
    quoi:
      "Chapitre 4. Sur n'importe quel CSV, tapez les six commandes du chapitre : read_csv, "
      + "head, info, dropna, un filtre, un groupby. Les taper une fois vaut dix relectures.",
  },
  {
    jour: "Jour 4",
    titre: "QGIS",
    quoi:
      "Chapitre 5. Installez QGIS, chargez un CSV contenant latitude et longitude par "
      + "« Couche texte délimité », et regardez le code du système de coordonnées en bas à "
      + "droite de la fenêtre.",
  },
  {
    jour: "Jour 5",
    titre: "Entraînement et test",
    quoi:
      "Faites les dix questions sans le corrigé, relisez les encadrés « à retenir » des "
      + "chapitres où vous avez fauté, puis passez le test dans la foulée.",
  },
];

/** Nombre de questions du test couvertes par les chapitres — sert d'assertion au build. */
export const QUESTIONS_COUVERTES = CHAPITRES.reduce((n, c) => n + c.questionsAuTest, 0);
