-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Exercices notés de MEAL-02 et MEAL-03
--
-- Ces deux cours n'évaluaient rien : leurs 13 leçons se validaient en cliquant
-- « Marquer comme complété », pour la totalité des points. Chaque leçon reçoit
-- désormais 4 exercices corrigés côté serveur.
--
-- Pourquoi 4 et pas 3 : le seuil de validation est de 70 %. À 3 exercices,
-- 2/3 = 67 % échoue — il faudrait un sans-faute. À 4, 3/4 = 75 % passe :
-- l'étudiant a droit à une erreur, ce qui est le propre d'une évaluation
-- formative.
--
-- Fil rouge : inventaire des points d'eau du district de la Kozah (région de
-- la Kara), dans la continuité du cas pratique de MEAL-01. 87 points relevés,
-- 63 fonctionnels, 1 240 ménages, 890 couverts par un tampon de 500 m — les
-- chiffres sont cohérents d'un exercice à l'autre et d'un cours à l'autre.
--
-- Identifiants préfixés « m2l… » et « m3l… » : voir la convention dans le
-- README de ce dossier.
--
-- Script idempotent : une leçon contenant déjà son premier exercice est
-- ignorée. Valider avec `npm run verify:exercises` avant d'exécuter.
-- ════════════════════════════════════════════════════════════════

-- ── MEAL-02 · Le terrain en cartes : découvrir QGIS ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous cartographiez les points d''eau du district de la Kozah, dans la région de la Kara. 87 points relevés au GPS, 1 240 ménages recensés. Ces exercices portent sur les décisions que vous prenez devant QGIS."
 },
 {
  "type": "exercise",
  "id": "m2l1e1",
  "kind": "choice",
  "title": "Ce qu''est QGIS",
  "prompt": "Votre coordinateur demande combien coûtera la licence QGIS pour équiper six agents. Que lui répondez-vous ?",
  "answer": 2,
  "explain": "**QGIS est libre et gratuit**, sans limite de postes ni d''usage. C''est ce qui en fait l''outil de référence des ONG : le budget passe dans la formation des agents, pas dans les licences.",
  "opts": [
   "Environ 500 € par poste",
   "Une licence unique pour toute l''organisation",
   "Rien : QGIS est un logiciel libre et gratuit",
   "C''est gratuit un an, puis payant"
  ]
 },
 {
  "type": "exercise",
  "id": "m2l1e2",
  "kind": "choice",
  "title": "Choisir son format de couche",
  "prompt": "Vous devez transmettre votre couche de points d''eau à un partenaire. Quel format choisissez-vous ?",
  "answer": 1,
  "explain": "Le **GeoPackage (.gpkg)** : un seul fichier, pas de limite de longueur des noms de colonnes, encodage UTF-8 propre pour les accents. Le shapefile se transmet en quatre fichiers au minimum — en oublier un rend l''envoi inexploitable.",
  "opts": [
   "Shapefile (.shp)",
   "GeoPackage (.gpkg)",
   "Une capture d''écran de la carte",
   "Un PDF de la carte"
  ],
  "hint": "L''un des deux formats de données tient en un seul fichier, l''autre en réclame au moins quatre."
 },
 {
  "type": "exercise",
  "id": "m2l1e3",
  "kind": "choice",
  "title": "Vecteur ou raster",
  "prompt": "Vos 87 points d''eau, chacun avec ses coordonnées et ses attributs, relèvent de quel type de couche ?",
  "answer": 0,
  "explain": "**Vecteur** : des entités discrètes (points, lignes, polygones) porteuses d''attributs. Un raster est une grille de pixels — une image satellite, un modèle de terrain — sans table attributaire par entité.",
  "opts": [
   "Vecteur",
   "Raster",
   "Les deux à la fois",
   "Ni l''un ni l''autre"
  ]
 },
 {
  "type": "exercise",
  "id": "m2l1e4",
  "kind": "choice",
  "title": "Le réflexe avant de commencer",
  "prompt": "Vous ouvrez QGIS pour la première fois sur ce projet. Quelle est la première chose à faire ?",
  "answer": 2,
  "explain": "**Créer et enregistrer le projet, avec son système de coordonnées.** Un projet sans SCR défini mélangera des couches incompatibles sans prévenir, et tout le travail d''affichage sera à refaire.",
  "opts": [
   "Choisir une jolie palette de couleurs",
   "Importer immédiatement tous les fichiers disponibles",
   "Créer un projet, l''enregistrer et fixer son système de coordonnées",
   "Imprimer un brouillon de carte"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-02')
    AND l.title ILIKE '%découvrir QGIS%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m2l1e1"}]'::jsonb;

-- ── MEAL-02 · Importer les données GPS de KoboCollect ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous cartographiez les points d''eau du district de la Kozah, dans la région de la Kara. 87 points relevés au GPS, 1 240 ménages recensés. Ces exercices portent sur les décisions que vous prenez devant QGIS."
 },
 {
  "type": "exercise",
  "id": "m2l2e1",
  "kind": "choice",
  "title": "Du CSV Kobo à la carte",
  "prompt": "Vous exportez vos données KoboToolbox en CSV. Quelles colonnes permettent à QGIS de placer les points sur la carte ?",
  "answer": 1,
  "explain": "**Latitude et longitude**, produites par le champ `geopoint` du formulaire. Sans elles, QGIS peut lire le tableau mais n''a aucun moyen de savoir où poser les points.",
  "opts": [
   "Le nom du village et le district",
   "La latitude et la longitude",
   "La date de collecte",
   "Le nom de l''enquêteur"
  ]
 },
 {
  "type": "exercise",
  "id": "m2l2e2",
  "kind": "text",
  "title": "Déclarer le bon système à l''import",
  "prompt": "À l''import d''un CSV de coordonnées GPS issues de KoboCollect, QGIS demande le système de coordonnées. Quel code EPSG saisissez-vous ? (le nombre suffit)",
  "answer": "4326",
  "explain": "**EPSG:4326** (WGS 84) : c''est le système dans lequel tout GPS enregistre nativement, en degrés décimaux. Se tromper ici projette vos points d''eau dans l''océan Atlantique.",
  "accept": [
   "4326",
   "epsg:4326",
   "epsg 4326"
  ],
  "hint": "C''est le système du GPS mondial, en degrés de latitude et longitude."
 },
 {
  "type": "exercise",
  "id": "m2l2e3",
  "kind": "number",
  "title": "Ce que vous pouvez réellement cartographier",
  "prompt": "Sur les 87 points d''eau relevés, 6 fiches ont été saisies sans que le GPS ait pu accrocher. Combien de points allez-vous pouvoir placer sur la carte ?",
  "answer": 81,
  "explain": "**81 points.** Les 6 fiches sans coordonnées restent dans vos données — elles comptent dans l''inventaire — mais elles sont invisibles sur la carte. C''est une limite à écrire noir sur blanc dans la légende, sinon la carte laisse croire à un inventaire complet.",
  "tolerance": 0,
  "unit": "points"
 },
 {
  "type": "exercise",
  "id": "m2l2e4",
  "kind": "choice",
  "title": "Le point tombé dans l''océan",
  "prompt": "Après import, un de vos points d''eau apparaît au large du golfe de Guinée, à des centaines de kilomètres du district. Quelle est la cause la plus probable ?",
  "answer": 2,
  "explain": "**Colonnes inversées ou coordonnée nulle.** Le point (0, 0) tombe dans le golfe de Guinée : c''est la signature d''une valeur manquante lue comme zéro. Inverser latitude et longitude produit le même genre d''aberration. On vérifie toujours l''étendue de la couche après import.",
  "opts": [
   "Le point d''eau a été mal relevé sur le terrain",
   "QGIS a un bug d''affichage",
   "Latitude et longitude ont été inversées, ou la fiche a une coordonnée vide lue comme 0",
   "La couche est en raster"
  ],
  "hint": "Le point (0, 0) se trouve précisément dans le golfe de Guinée, au sud du Togo."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-02')
    AND l.title ILIKE '%Importer les données GPS%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m2l2e1"}]'::jsonb;

-- ── MEAL-02 · Comprendre les projections (sans maths) ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous cartographiez les points d''eau du district de la Kozah, dans la région de la Kara. 87 points relevés au GPS, 1 240 ménages recensés. Ces exercices portent sur les décisions que vous prenez devant QGIS."
 },
 {
  "type": "exercise",
  "id": "m2l3e1",
  "kind": "text",
  "title": "Le système du GPS",
  "prompt": "Quel est le code EPSG du système WGS 84, celui dans lequel votre GPS enregistre ses coordonnées ? (le nombre suffit)",
  "answer": "4326",
  "explain": "**EPSG:4326**. Ses coordonnées sont des degrés — pratique pour situer, inutilisable pour mesurer une distance en mètres.",
  "accept": [
   "4326",
   "epsg:4326"
  ]
 },
 {
  "type": "exercise",
  "id": "m2l3e2",
  "kind": "choice",
  "title": "Pourquoi reprojeter",
  "prompt": "Vous voulez mesurer la distance entre deux points d''eau, en mètres. Votre couche est en EPSG:4326. Que faites-vous d''abord ?",
  "answer": 1,
  "explain": "Il faut **reprojeter dans un système métrique**. En degrés, une même différence de coordonnées ne représente pas la même distance selon la latitude : toute mesure serait fausse, et l''erreur passe inaperçue car le chiffre semble plausible.",
  "opts": [
   "Rien, QGIS convertit tout seul",
   "Vous reprojetez la couche dans un système métrique adapté à la zone",
   "Vous multipliez les degrés par 1000",
   "Vous mesurez sur la carte imprimée avec une règle"
  ],
  "hint": "Un degré ne vaut pas la même distance au sol selon l''endroit du globe."
 },
 {
  "type": "exercise",
  "id": "m2l3e3",
  "kind": "number",
  "title": "La zone UTM du Togo",
  "prompt": "Le Togo se situe entre 0° et 2° de longitude Est. Dans quelle zone UTM se trouve-t-il ?",
  "answer": 31,
  "explain": "**Zone 31 Nord** (EPSG:32631). Les zones UTM couvrent 6° de longitude chacune, la 31 s''étendant de 0° à 6° Est. C''est le système à utiliser pour toute mesure de distance ou de surface au Togo.",
  "tolerance": 0,
  "unit": "zone UTM",
  "hint": "Les zones UTM font 6° de large et la zone 31 commence au méridien de Greenwich."
 },
 {
  "type": "exercise",
  "id": "m2l3e4",
  "kind": "choice",
  "title": "Le tampon qui ne veut rien dire",
  "prompt": "Un collègue applique un tampon de 500 sur une couche restée en EPSG:4326. Que produit-il ?",
  "answer": 2,
  "explain": "L''unité du tampon est celle de la couche : en EPSG:4326, ce sont des **degrés**. QGIS exécute sans broncher et produit une forme gigantesque et vide de sens. Reprojeter avant toute analyse métrique n''est pas une coquetterie.",
  "opts": [
   "Un tampon de 500 mètres, correct",
   "Un tampon de 500 kilomètres",
   "Un tampon de 500 degrés, absurde : il couvre la planète entière",
   "QGIS refuse l''opération"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-02')
    AND l.title ILIKE '%projections%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m2l3e1"}]'::jsonb;

-- ── MEAL-02 · La table attributaire : lire ses données ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous cartographiez les points d''eau du district de la Kozah, dans la région de la Kara. 87 points relevés au GPS, 1 240 ménages recensés. Ces exercices portent sur les décisions que vous prenez devant QGIS."
 },
 {
  "type": "exercise",
  "id": "m2l4e1",
  "kind": "choice",
  "title": "Filtrer la table attributaire",
  "prompt": "Votre couche a une colonne `statut` valant « fonctionnel » ou « en panne ». Quelle expression sélectionne les points en panne ?",
  "answer": 1,
  "explain": "`\"statut\" = ''en panne''` : **guillemets doubles pour le nom du champ, simples pour la valeur texte**. C''est la source d''erreur numéro un des débutants sur les expressions QGIS.",
  "opts": [
   "statut = en panne",
   "\"statut\" = ''en panne''",
   "statut == \"en panne\"",
   "SELECT statut FROM points"
  ],
  "hint": "Dans QGIS, les noms de champs et les valeurs texte ne s''écrivent pas avec les mêmes guillemets."
 },
 {
  "type": "exercise",
  "id": "m2l4e2",
  "kind": "number",
  "title": "Le taux de fonctionnalité",
  "prompt": "Sur les 87 points d''eau inventoriés, 63 sont fonctionnels. Quel est le taux de fonctionnalité du district, en pourcentage ?",
  "answer": 72.4,
  "explain": "63 / 87 × 100 = **72,4 %**. C''est l''indicateur WASH de base : plus d''un point d''eau sur quatre est hors service, ce qui reporte la charge sur les points voisins et allonge les files d''attente.",
  "tolerance": 0.6,
  "unit": "%"
 },
 {
  "type": "exercise",
  "id": "m2l4e3",
  "kind": "choice",
  "title": "Deux jointures à ne pas confondre",
  "prompt": "Vous avez un tableau Excel de population par village, et une couche de villages. Vous voulez rattacher la population à chaque village. Quelle opération ?",
  "answer": 0,
  "explain": "**Jointure attributaire** : les deux tables partagent un identifiant commun. La jointure spatiale, elle, sert quand il n''y a aucun identifiant partagé et qu''il faut associer par la position — par exemple rattacher chaque point d''eau au quartier qui le contient.",
  "opts": [
   "Une jointure attributaire, sur le nom ou le code du village",
   "Une jointure spatiale, sur la position",
   "Un tampon",
   "Une reprojection"
  ]
 },
 {
  "type": "exercise",
  "id": "m2l4e4",
  "kind": "choice",
  "title": "La jointure qui échoue à moitié",
  "prompt": "Après jointure, la population n''apparaît que pour 40 villages sur 62. Que vérifiez-vous en premier ?",
  "answer": 1,
  "explain": "La jointure rapproche des chaînes **strictement identiques** : « Kpéwa » et « Kpewa » ne se rencontrent jamais. C''est exactement le problème créé en amont par un champ libre au lieu d''une liste de choix, vu dans MEAL-01.",
  "opts": [
   "Le système de coordonnées",
   "L''orthographe exacte des noms de villages dans les deux tables : accents, majuscules, espaces",
   "La couleur de la symbologie",
   "La version de QGIS"
  ],
  "hint": "Une jointure attributaire ne rapproche que ce qui est rigoureusement identique."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-02')
    AND l.title ILIKE '%table attributaire%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m2l4e1"}]'::jsonb;

-- ── MEAL-02 · Analyse spatiale : le tampon (buffer) ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous cartographiez les points d''eau du district de la Kozah, dans la région de la Kara. 87 points relevés au GPS, 1 240 ménages recensés. Ces exercices portent sur les décisions que vous prenez devant QGIS."
 },
 {
  "type": "exercise",
  "id": "m2l5e1",
  "kind": "number",
  "title": "Le seuil Sphere",
  "prompt": "Le standard Sphere fixe la distance maximale entre un ménage et le point d''eau le plus proche. Quelle est cette distance, en mètres ?",
  "answer": 500,
  "explain": "**500 mètres.** C''est ce seuil qui donne son rayon à votre tampon : au-delà, la corvée d''eau devient si lourde que les quantités puisées chutent, quelle que soit la qualité du point d''eau.",
  "tolerance": 0,
  "unit": "mètres"
 },
 {
  "type": "exercise",
  "id": "m2l5e2",
  "kind": "choice",
  "title": "Avant de lancer le tampon",
  "prompt": "Vous vous apprêtez à créer un tampon de 500 m autour de chaque point d''eau. Quelle vérification faites-vous d''abord ?",
  "answer": 1,
  "explain": "Le tampon s''exprime dans l''unité de la couche. En **EPSG:32631**, 500 signifie 500 mètres. En EPSG:4326, 500 signifierait 500 degrés.",
  "opts": [
   "Que la couche est jolie",
   "Que la couche est projetée dans un système métrique, EPSG:32631 pour le Togo",
   "Que la couche est en raster",
   "Que la légende est prête"
  ]
 },
 {
  "type": "exercise",
  "id": "m2l5e3",
  "kind": "number",
  "title": "Le taux de couverture",
  "prompt": "Vos tampons de 500 m couvrent 890 des 1 240 ménages recensés. Quel est le taux de couverture en eau du district, en pourcentage ?",
  "answer": 71.8,
  "explain": "890 / 1 240 × 100 = **71,8 %**. Autrement dit **350 ménages** vivent à plus de 500 m d''un point d''eau — c''est ce chiffre, et non la moyenne du district, qui justifie une demande de financement.",
  "tolerance": 0.6,
  "unit": "%",
  "hint": "Ménages couverts divisés par ménages recensés."
 },
 {
  "type": "exercise",
  "id": "m2l5e4",
  "kind": "choice",
  "title": "Du tampon à la décision",
  "prompt": "Vous devez proposer l''implantation de trois nouveaux forages. Sur quoi vous appuyez-vous ?",
  "answer": 2,
  "explain": "On implante là où se trouvent les **ménages non couverts**, en cherchant les concentrations : un forage placé au milieu d''un groupe de 120 ménages hors tampon fait basculer 120 foyers d''un coup. C''est là que l''analyse spatiale devient une décision d''investissement.",
  "opts": [
   "Les zones où les points d''eau sont déjà les plus nombreux",
   "Le centre géographique du district",
   "Les concentrations de ménages situés hors des tampons de 500 m",
   "Les villages les plus faciles d''accès en voiture"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-02')
    AND l.title ILIKE '%tampon%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m2l5e1"}]'::jsonb;

-- ── MEAL-02 · Symbologie : faire parler la carte ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous cartographiez les points d''eau du district de la Kozah, dans la région de la Kara. 87 points relevés au GPS, 1 240 ménages recensés. Ces exercices portent sur les décisions que vous prenez devant QGIS."
 },
 {
  "type": "exercise",
  "id": "m2l6e1",
  "kind": "choice",
  "title": "Symboliser un statut",
  "prompt": "Vous voulez distinguer sur la carte les points fonctionnels des points en panne. Quel type de symbologie ?",
  "answer": 1,
  "explain": "**Catégorisée** : une couleur par valeur distincte d''un champ. La symbologie graduée, elle, découpe une valeur continue en classes — elle n''a pas de sens sur deux modalités.",
  "opts": [
   "Symbole unique",
   "Catégorisée",
   "Graduée",
   "Aucune"
  ]
 },
 {
  "type": "exercise",
  "id": "m2l6e2",
  "kind": "choice",
  "title": "Symboliser une quantité",
  "prompt": "Vous voulez montrer la population de chaque village, de 120 à 4 800 habitants. Quel type de symbologie ?",
  "answer": 2,
  "explain": "**Graduée** : elle répartit une valeur continue en classes de couleur ou de taille. Une symbologie catégorisée créerait ici 62 catégories illisibles — une par village.",
  "opts": [
   "Symbole unique",
   "Catégorisée",
   "Graduée",
   "Étiquettes seulement"
  ]
 },
 {
  "type": "exercise",
  "id": "m2l6e3",
  "kind": "choice",
  "title": "Le piège des couleurs",
  "prompt": "Vous choisissez vert pour « fonctionnel » et rouge pour « en panne ». Quelle objection recevable peut-on vous faire ?",
  "answer": 1,
  "explain": "Le daltonisme rouge-vert touche environ **8 % des hommes**. Doubler l''information par la forme du symbole, ou choisir une palette bleu-orange, rend la carte lisible par tous sans rien perdre.",
  "opts": [
   "Le vert et le rouge sont interdits en cartographie",
   "Environ un homme sur douze distingue mal le rouge du vert : la carte devient illisible pour lui",
   "Ces couleurs coûtent plus cher à l''impression",
   "Aucune, c''est le standard"
  ],
  "hint": "Pensez à qui lira la carte, pas seulement à ce qu''elle montre."
 },
 {
  "type": "exercise",
  "id": "m2l6e4",
  "kind": "choice",
  "title": "Ce que la carte doit dire",
  "prompt": "Votre carte affiche 81 points colorés, sans autre information. Que manque-t-il pour qu''elle soit exploitable par un lecteur extérieur ?",
  "answer": 0,
  "explain": "Une carte se lit sans son auteur : **titre, légende, échelle, nord et source** sont ce qui la rend interprétable et vérifiable. Sans échelle, personne ne peut juger si deux points sont à 200 m ou à 20 km l''un de l''autre.",
  "opts": [
   "Un titre, une légende, une échelle, l''orientation et la source des données",
   "Plus de couleurs",
   "Un fond satellite",
   "Rien, les points suffisent"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-02')
    AND l.title ILIKE '%Symbologie%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m2l6e1"}]'::jsonb;

-- ── MEAL-02 · Carte pro + automatisation (capstone) ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous cartographiez les points d''eau du district de la Kozah, dans la région de la Kara. 87 points relevés au GPS, 1 240 ménages recensés. Ces exercices portent sur les décisions que vous prenez devant QGIS."
 },
 {
  "type": "exercise",
  "id": "m2l7e1",
  "kind": "choice",
  "title": "À quoi sert l''Atlas",
  "prompt": "Le bailleur veut une carte par district, pour six districts, toutes au même format. Quelle fonction de QGIS utilisez-vous ?",
  "answer": 2,
  "explain": "L''**Atlas** génère automatiquement une planche par entité d''une couche de couverture : six districts, six cartes, cadrage et titre adaptés à chacune. Le faire à la main invite l''erreur de copier-coller.",
  "opts": [
   "L''export PDF, six fois de suite",
   "La symbologie graduée",
   "L''Atlas de la mise en page",
   "Le calculateur de champs"
  ]
 },
 {
  "type": "exercise",
  "id": "m2l7e2",
  "kind": "number",
  "title": "Le rendement de l''automatisation",
  "prompt": "Produire une carte à la main vous prend 25 minutes. L''Atlas génère les six planches en une passe de 4 minutes, après 20 minutes de mise en page. Combien de minutes économisez-vous ?",
  "answer": 126,
  "explain": "6 × 25 = 150 minutes à la main, contre 20 + 4 = 24 minutes avec l''Atlas : **126 minutes économisées**, soit plus de deux heures. Et l''écart grandit à chaque mise à jour des données, puisque la mise en page ne se refait pas.",
  "tolerance": 2,
  "unit": "minutes",
  "hint": "Comparez 6 × 25 minutes au total « mise en page + génération »."
 },
 {
  "type": "exercise",
  "id": "m2l7e3",
  "kind": "choice",
  "title": "La carte qui se met à jour",
  "prompt": "Vos données seront actualisées chaque trimestre. Comment concevez-vous votre mise en page ?",
  "answer": 1,
  "explain": "Une mise en page **liée aux données** se régénère seule : le titre, la date et les compteurs suivent la couche. C''est le même principe que le pipeline de MEAL-03 — on construit une fois, on rejoue autant de fois que nécessaire.",
  "opts": [
   "Vous exportez en image et retouchez l''image à chaque trimestre",
   "Vous liez titre et légende aux champs de la couche, pour qu''ils se régénèrent avec les données",
   "Vous refaites la carte de zéro chaque trimestre",
   "Vous figez la carte du premier trimestre"
  ]
 },
 {
  "type": "exercise",
  "id": "m2l7e4",
  "kind": "choice",
  "title": "Le livrable attendu",
  "prompt": "Vous rendez votre travail au coordinateur WASH. Que contient le livrable ?",
  "answer": 2,
  "explain": "Une carte ne se suffit pas : le coordinateur a besoin du **chiffre** (71,8 % de couverture, 350 ménages hors zone) et de **la recommandation** (les trois sites proposés). Les données sources rendent le travail vérifiable et réutilisable.",
  "opts": [
   "Le projet QGIS seul",
   "Les six cartes PDF seules",
   "Les cartes, les données sources, et une note qui donne le taux de couverture et les sites proposés",
   "Une capture d''écran de l''écran QGIS"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-02')
    AND l.title ILIKE '%Carte pro%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m2l7e1"}]'::jsonb;

-- ── MEAL-03 · Penser comme un architecte MEAL ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous construisez le pipeline qui produira, chaque mois et sans intervention, le rapport WASH du district de la Kozah. Ces exercices portent sur les décisions d''architecture et sur ce que vous feriez face à un incident réel."
 },
 {
  "type": "exercise",
  "id": "m3l1e1",
  "kind": "choice",
  "title": "Pourquoi automatiser",
  "prompt": "Votre collègue produit le rapport mensuel à la main et le fait très bien. Quel argument justifie d''automatiser ?",
  "answer": 2,
  "explain": "L''enjeu est la **reproductibilité**. Un rapport fait à la main dépend de qui le fait et du jour où il le fait ; personne ne peut refaire le calcul six mois plus tard. Un pipeline documente les choix et les rejoue à l''identique — le temps gagné n''est qu''un bonus.",
  "opts": [
   "C''est plus moderne",
   "Cela supprime le poste de votre collègue",
   "Le résultat devient reproductible et vérifiable : même données, même rapport, quel que soit qui le lance",
   "Cela rend le rapport plus joli"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l1e2",
  "kind": "choice",
  "title": "Les trois temps du pipeline",
  "prompt": "Quelle est la bonne architecture d''un pipeline de reporting MEAL ?",
  "answer": 1,
  "explain": "**Extraire, analyser, restituer.** Chaque étape est indépendante et testable séparément : si le rapport est faux, on sait immédiatement s''il s''agit d''un problème de données, de calcul, ou de mise en forme.",
  "opts": [
   "Analyse → extraction → restitution",
   "Extraction des données → analyse → restitution",
   "Restitution → extraction → analyse",
   "Extraction → restitution → analyse"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l1e3",
  "kind": "number",
  "title": "Ce que coûte le manuel",
  "prompt": "Le rapport mensuel demande 6 heures de travail manuel. Combien d''heures par an cela représente-t-il ?",
  "answer": 72,
  "explain": "6 × 12 = **72 heures par an**, soit près de deux semaines de travail. Investir trois jours dans un pipeline est rentabilisé dès la première année — et la fiabilité, elle, est gagnée dès le premier mois.",
  "tolerance": 0,
  "unit": "heures par an"
 },
 {
  "type": "exercise",
  "id": "m3l1e4",
  "kind": "choice",
  "title": "Par où commencer",
  "prompt": "Vous démarrez le projet. Quelle est la première chose à définir ?",
  "answer": 0,
  "explain": "On part de **ce que le rapport doit dire et à qui**. Un pipeline construit avant d''avoir arrêté les indicateurs produit vite beaucoup de chiffres dont personne n''a l''usage — le même travers que le questionnaire trop long.",
  "opts": [
   "Les indicateurs exacts que le rapport doit produire, et pour qui",
   "Le langage de programmation",
   "La couleur des graphiques",
   "Le nom du fichier de sortie"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-03')
    AND l.title ILIKE '%architecte MEAL%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m3l1e1"}]'::jsonb;

-- ── MEAL-03 · Connexion automatique à l'API Kobo ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous construisez le pipeline qui produira, chaque mois et sans intervention, le rapport WASH du district de la Kozah. Ces exercices portent sur les décisions d''architecture et sur ce que vous feriez face à un incident réel."
 },
 {
  "type": "exercise",
  "id": "m3l2e1",
  "kind": "choice",
  "title": "Récupérer les données",
  "prompt": "Quelle méthode HTTP utilisez-vous pour récupérer les soumissions depuis l''API KoboToolbox ?",
  "answer": 0,
  "explain": "**GET** : on lit des données existantes sans rien modifier côté serveur. POST sert à soumettre une nouvelle donnée — l''inverse de ce qu''on veut ici.",
  "opts": [
   "GET",
   "POST",
   "DELETE",
   "PUT"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l2e2",
  "kind": "choice",
  "title": "Où mettre son jeton",
  "prompt": "Votre script a besoin du jeton d''API de votre compte Kobo. Où le placez-vous ?",
  "answer": 2,
  "explain": "Dans une **variable d''environnement**. Un jeton écrit dans le code part avec chaque copie du script, chaque envoi par mail, chaque dépôt Git — et donne accès à toutes vos données de bénéficiaires. C''est la fuite la plus banale et la plus coûteuse.",
  "opts": [
   "En clair au début du script, c''est plus pratique",
   "Dans un commentaire du script",
   "Dans une variable d''environnement, hors du code et hors du dépôt",
   "Dans le nom du fichier"
  ],
  "hint": "Le script finira sur un dépôt partagé, ou dans la boîte mail d''un collègue."
 },
 {
  "type": "exercise",
  "id": "m3l2e3",
  "kind": "choice",
  "title": "L''API répond 401",
  "prompt": "Votre script tournait bien ; ce matin l''API renvoie une erreur 401. Que signifie ce code ?",
  "answer": 1,
  "explain": "**401 = non authentifié.** Le jeton est absent, mal formé ou a été révoqué. À distinguer du 404 (la ressource n''existe pas) et du 500 (le serveur a un problème) : les trois appellent des réactions différentes.",
  "opts": [
   "Les données n''existent pas",
   "L''authentification a échoué : jeton absent, invalide ou révoqué",
   "Le serveur est en panne",
   "La requête est trop longue"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l2e4",
  "kind": "choice",
  "title": "Le piège de la pagination",
  "prompt": "Votre district compte 1 500 soumissions, mais votre script n''en récupère systématiquement que 1 000. Pourquoi ?",
  "answer": 1,
  "explain": "L''API **pagine** : elle renvoie un lot par requête et indique où trouver le suivant. Un total qui bute sur un chiffre rond est la signature du problème. Ne pas suivre la pagination produit un rapport silencieusement amputé d''un tiers des données — l''erreur la plus dangereuse, car rien ne signale l''anomalie.",
  "opts": [
   "L''API a perdu 500 soumissions",
   "L''API pagine ses résultats : il faut parcourir les pages suivantes",
   "Le fichier CSV est trop petit",
   "Le jeton est expiré"
  ],
  "hint": "Un nombre rond comme 1 000 n''est jamais un hasard."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-03')
    AND l.title ILIKE '%API Kobo%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m3l2e1"}]'::jsonb;

-- ── MEAL-03 · Le moteur d'analyse réutilisable ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous construisez le pipeline qui produira, chaque mois et sans intervention, le rapport WASH du district de la Kozah. Ces exercices portent sur les décisions d''architecture et sur ce que vous feriez face à un incident réel."
 },
 {
  "type": "exercise",
  "id": "m3l3e1",
  "kind": "text",
  "title": "Désagréger les résultats",
  "prompt": "Le bailleur veut le taux de fonctionnalité par village. Quelle méthode pandas agrège votre DataFrame par la colonne `village` ?",
  "answer": "groupby",
  "explain": "**groupby** : `df.groupby(''village'')[''statut''].value_counts()`. La désagrégation est le cœur du MEAL — une moyenne de district masque toujours les villages en difficulté.",
  "accept": [
   "groupby",
   "group by",
   "df.groupby",
   "groupby()"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l3e2",
  "kind": "choice",
  "title": "Le copier-coller qui coûte cher",
  "prompt": "Vous devez produire le même calcul pour six districts. Vous copiez votre bloc de code six fois en changeant le nom. Quel est le risque ?",
  "answer": 1,
  "explain": "Six copies, c''est **six endroits à corriger** à chaque évolution — et la copie oubliée produira un chiffre faux que personne ne remarquera. Une fonction prenant le district en paramètre supprime le problème à la racine.",
  "opts": [
   "Le script sera plus lent",
   "Une correction devra être reportée six fois, et vous en oublierez une",
   "Python refusera d''exécuter",
   "Aucun risque"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l3e3",
  "kind": "number",
  "title": "Le calcul du mois",
  "prompt": "Sur 87 points d''eau, votre script en compte 63 fonctionnels ce mois-ci, contre 58 le mois dernier. De combien de points de pourcentage le taux de fonctionnalité a-t-il progressé ?",
  "answer": 5.7,
  "explain": "63/87 = 72,4 % contre 58/87 = 66,7 % : une progression de **5,7 points**. Attention au vocabulaire : on parle de points de pourcentage, pas de « 5,7 % d''augmentation » — cette confusion fausse la lecture des rapports.",
  "tolerance": 0.6,
  "unit": "points de pourcentage",
  "hint": "Calculez les deux taux, puis faites la différence."
 },
 {
  "type": "exercise",
  "id": "m3l3e4",
  "kind": "choice",
  "title": "Les valeurs manquantes",
  "prompt": "Six fiches n''ont pas de coordonnées GPS. Que fait votre script ?",
  "answer": 2,
  "explain": "On écarte **en le disant**. Supprimer en silence fait disparaître une information — six relevés GPS ratés, c''est peut-être un téléphone défectueux à remplacer. Remplacer par zéro serait pire : les points atterriraient dans l''océan.",
  "opts": [
   "Il s''arrête en erreur",
   "Il les supprime silencieusement",
   "Il les écarte du calcul spatial, les compte, et le rapport signale combien de fiches ont été écartées",
   "Il remplace les coordonnées manquantes par zéro"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-03')
    AND l.title ILIKE '%moteur d%analyse%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m3l3e1"}]'::jsonb;

-- ── MEAL-03 · Générer le rapport (Excel + cartes + PDF) ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous construisez le pipeline qui produira, chaque mois et sans intervention, le rapport WASH du district de la Kozah. Ces exercices portent sur les décisions d''architecture et sur ce que vous feriez face à un incident réel."
 },
 {
  "type": "exercise",
  "id": "m3l4e1",
  "kind": "choice",
  "title": "Le format du livrable",
  "prompt": "Le bailleur veut un rapport figé, paginé, qui s''affiche identiquement chez lui et chez vous. Quel format ?",
  "answer": 1,
  "explain": "Le **PDF** garantit une mise en page identique partout et ne se modifie pas par inadvertance. L''Excel accompagne souvent le PDF, pour ceux qui veulent recalculer — les deux ne servent pas le même lecteur.",
  "opts": [
   "Un fichier Excel",
   "Un PDF",
   "Un notebook Python",
   "Un fichier CSV"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l4e2",
  "kind": "choice",
  "title": "Ce qu''attend l''équipe programme",
  "prompt": "L''équipe programme, elle, veut pouvoir filtrer et retrier les résultats. Que lui fournissez-vous ?",
  "answer": 0,
  "explain": "**Excel** : elle a besoin de manipuler, pas de lire. Un pipeline bien conçu produit les deux sorties depuis la même analyse — c''est justement l''intérêt de séparer l''analyse de la restitution.",
  "opts": [
   "Le fichier Excel des données agrégées",
   "Le PDF",
   "Une capture d''écran",
   "Rien, le PDF suffit à tout le monde"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l4e3",
  "kind": "choice",
  "title": "La carte dans le rapport",
  "prompt": "Votre rapport PDF doit inclure la carte de couverture produite dans MEAL-02. Comment procédez-vous pour que la carte suive les données ?",
  "answer": 1,
  "explain": "La carte doit être **régénérée** à chaque exécution, sinon le rapport de mars affichera la carte de janvier. Une capture collée une fois se périme sans prévenir — et personne ne s''en aperçoit avant le comité de pilotage.",
  "opts": [
   "Vous collez une capture d''écran de QGIS",
   "Vous exportez la carte depuis QGIS à chaque exécution, et le script l''insère dans le PDF",
   "Vous décrivez la carte en texte",
   "Vous mettez un lien vers QGIS"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l4e4",
  "kind": "number",
  "title": "Le nombre de sorties",
  "prompt": "Votre pipeline produit, pour chacun des 6 districts, un PDF et un Excel. Combien de fichiers génère une exécution mensuelle ?",
  "answer": 12,
  "explain": "6 × 2 = **12 fichiers**. Ce chiffre a une conséquence pratique : il faut une convention de nommage incluant le district et le mois, sinon la douzième exécution écrase les précédentes et l''historique disparaît.",
  "tolerance": 0,
  "unit": "fichiers"
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-03')
    AND l.title ILIKE '%Générer le rapport%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m3l4e1"}]'::jsonb;

-- ── MEAL-03 · Orchestrer et planifier (capstone) ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous construisez le pipeline qui produira, chaque mois et sans intervention, le rapport WASH du district de la Kozah. Ces exercices portent sur les décisions d''architecture et sur ce que vous feriez face à un incident réel."
 },
 {
  "type": "exercise",
  "id": "m3l5e1",
  "kind": "choice",
  "title": "Planifier l''exécution",
  "prompt": "Vous voulez que le pipeline s''exécute le 1er de chaque mois à 6 h. Quelle expression cron correspond ?",
  "answer": 1,
  "explain": "`0 6 1 * *` : minute 0, heure 6, **jour 1** du mois, tous les mois, n''importe quel jour de la semaine. L''ordre des champs est la source d''erreur classique — une inversion fait tourner le script au mauvais moment pendant des mois.",
  "opts": [
   "0 1 6 * *",
   "0 6 1 * *",
   "6 0 * * 1",
   "1 6 * * *"
  ],
  "hint": "L''ordre est : minute, heure, jour du mois, mois, jour de la semaine."
 },
 {
  "type": "exercise",
  "id": "m3l5e2",
  "kind": "choice",
  "title": "Quand l''API ne répond pas",
  "prompt": "Le 1er du mois à 6 h, l''API Kobo est indisponible. Comment votre pipeline doit-il réagir ?",
  "answer": 2,
  "explain": "**Réessayer, puis alerter.** Un pipeline qui échoue en silence est pire que pas de pipeline : le mois passe, personne ne reçoit rien, et l''absence n''est remarquée qu''au comité. Produire un rapport avec de vieilles données serait pire encore — il serait faux et crédible.",
  "opts": [
   "Produire le rapport avec les données du mois précédent, sans le dire",
   "Produire un rapport vide",
   "Réessayer quelques fois, puis échouer bruyamment en vous alertant",
   "S''arrêter en silence"
  ],
  "hint": "Quel est le pire scénario : ne pas avoir de rapport, ou en avoir un faux ?"
 },
 {
  "type": "exercise",
  "id": "m3l5e3",
  "kind": "choice",
  "title": "Relancer sans dégât",
  "prompt": "Vous relancez le pipeline deux fois par erreur le même jour. Que doit-il se passer ?",
  "answer": 1,
  "explain": "Un pipeline **idempotent** produit le même résultat quel que soit le nombre d''exécutions. C''est ce qui permet de le relancer sans crainte après un incident — et sans cette propriété, chaque relance devient une opération risquée qu''on hésite à faire.",
  "opts": [
   "Les chiffres du rapport doublent",
   "Le résultat est identique : le pipeline est idempotent",
   "Le pipeline plante",
   "Les données sources sont supprimées"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l5e4",
  "kind": "choice",
  "title": "La trace de ce qui s''est passé",
  "prompt": "Six mois plus tard, un chiffre du rapport de mars est contesté. De quoi avez-vous besoin ?",
  "answer": 0,
  "explain": "Le **journal d''exécution** est ce qui rend le chiffre défendable : il dit combien de soumissions ont été extraites ce jour-là et ce qui a été écarté. Sans lui, on ne peut ni confirmer ni corriger — et la parole du MEAL perd sa valeur.",
  "opts": [
   "Un journal d''exécution : date, volume de données extraites, fiches écartées, version du script",
   "De la bonne mémoire",
   "Du fichier PDF seul",
   "De rien, le chiffre est forcément juste"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-03')
    AND l.title ILIKE '%Orchestrer%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m3l5e1"}]'::jsonb;

-- ── MEAL-03 · Éthique, qualité & devenir Super-Expert ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer\n\nVous construisez le pipeline qui produira, chaque mois et sans intervention, le rapport WASH du district de la Kozah. Ces exercices portent sur les décisions d''architecture et sur ce que vous feriez face à un incident réel."
 },
 {
  "type": "exercise",
  "id": "m3l6e1",
  "kind": "choice",
  "title": "Partager sans exposer",
  "prompt": "Vous transmettez vos données à un partenaire de recherche. Elles contiennent les noms des chefs de ménage. Que faites-vous ?",
  "answer": 2,
  "explain": "On applique la **minimisation** : on retire les identifiants directs et on ne transmet que les variables nécessaires à la question posée. La confiance dans le partenaire ne protège pas le bénéficiaire d''une fuite ultérieure du fichier.",
  "opts": [
   "Vous envoyez le fichier tel quel, c''est un partenaire de confiance",
   "Vous protégez le fichier par un mot de passe et envoyez les deux par mail",
   "Vous retirez les identifiants directs et ne transmettez que ce dont le partenaire a besoin",
   "Vous refusez tout partage"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l6e2",
  "kind": "choice",
  "title": "Le risque des coordonnées précises",
  "prompt": "Votre jeu de données anonymisé conserve les coordonnées GPS exactes de chaque ménage. Est-ce suffisant ?",
  "answer": 1,
  "explain": "Une coordonnée à quelques mètres près **désigne une maison**, donc une famille. Retirer les noms ne suffit pas : il faut agréger à l''échelle du village ou dégrader volontairement la précision. C''est un enjeu sérieux quand les données touchent des populations vulnérables.",
  "opts": [
   "Oui, sans les noms les données sont anonymes",
   "Non : une position GPS exacte désigne une habitation, donc un foyer identifiable",
   "Oui, si le fichier est chiffré",
   "Non, il faut aussi retirer la date"
  ],
  "hint": "Combien de foyers vivent à une adresse précise à quelques mètres près ?"
 },
 {
  "type": "exercise",
  "id": "m3l6e3",
  "kind": "choice",
  "title": "La donnée aberrante",
  "prompt": "Un point d''eau est déclaré desservir 12 000 personnes, cinq fois plus que tous les autres. Que faites-vous ?",
  "answer": 2,
  "explain": "On **vérifie et on documente**. C''est peut-être une faute de saisie, ou un vrai point d''eau majeur alimentant un marché. Supprimer sans vérifier détruit une information ; garder sans vérifier propage une erreur. Dans les deux cas, la décision doit être écrite.",
  "opts": [
   "Vous la supprimez, elle fausse la moyenne",
   "Vous la gardez telle quelle sans rien dire",
   "Vous vérifiez auprès de l''équipe terrain, puis vous documentez ce que vous décidez",
   "Vous la remplacez par la moyenne"
  ]
 },
 {
  "type": "exercise",
  "id": "m3l6e4",
  "kind": "choice",
  "title": "La boucle de redevabilité",
  "prompt": "Le rapport est envoyé au bailleur. Le cycle MEAL est-il terminé ?",
  "answer": 1,
  "explain": "Le **A de MEAL, c''est Accountability** — la redevabilité. Les communautés qui ont donné leur temps ont droit au retour : ce qu''on a trouvé, ce qui va changer. Sans cette boucle, la prochaine collecte se heurtera à une lassitude parfaitement justifiée.",
  "opts": [
   "Oui, le livrable est remis",
   "Non : les résultats doivent aussi être restitués aux communautés enquêtées",
   "Non : il faut refaire une collecte",
   "Oui, sauf si le bailleur pose une question"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-03')
    AND l.title ILIKE '%thique%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"m3l6e1"}]'::jsonb;

-- ── Rapport ──
SELECT c.code, l.order_index AS lecon, l.title,
       jsonb_array_length(jsonb_path_query_array(l.content->'cells', '$[*] ? (@.type == "exercise")')) AS exercices
FROM sms_lessons l JOIN sms_courses c ON c.id = l.course_id
WHERE c.code IN ('MEAL-02','MEAL-03')
ORDER BY c.order_index, l.order_index;
