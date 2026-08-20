-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — MEAL-01 enrichi du support « Méthodes et Techniques
-- de Collecte des Données » (formation KoboToolbox & KoboCollect)
--
-- Le support de formation (36 diapositives, 6 chapitres) est fusionné dans les
-- 7 leçons existantes : chaque leçon reçoit la partie du support qui la
-- concerne, avec les captures d'écran réelles de l'outil. Le contenu déjà en
-- place et les 24 exercices notés sont conservés — l'apport est ajouté À LA
-- SUITE des cellules existantes, avant les exercices d'origine s'il y en a.
--
-- Le fil rouge du support, « aménagement des espaces verts de Niamey », est
-- transposé à KARA (Togo) : ville, quartiers et lieux-dits adaptés.
--
-- Les captures sont servies en statique depuis client/public/academy/kobo/
-- (chemins /academy/kobo/*.webp) : elles doivent être déployées AVANT
-- l'exécution de ce script, sinon les leçons afficheront des images cassées.
--
-- Script idempotent : une leçon mentionnant déjà Kara est ignorée (les leçons 1 et 2
-- ne reçoivent aucune capture — se fier aux images laisserait passer un doublon).
-- À exécuter dans Supabase SQL Editor APRÈS kobo_course_enriched.sql
-- et academy_exercises_meal01.sql.
-- ════════════════════════════════════════════════════════════════

-- ── Comprendre la collecte de données terrain ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## Le métier, avant l''outil\n\nAvant d''ouvrir la moindre application, il faut savoir ce qu''est **collecter des données** : réunir et mesurer des informations issues de sources variées, pour obtenir une vue complète et précise d''un sujet d''étude.\n\nTrois exigences tiennent tout le reste :\n\n- **Un objectif** — une vue complète et précise d''un sujet, à partir de sources variées.\n- **Une utilité** — aider à décider, évaluer des résultats, anticiper ce qui vient.\n- **Une précision** — elle conditionne l''intégrité de toute l''étude. Une donnée fausse ne se rattrape pas à l''analyse."
 },
 {
  "type": "callout",
  "variant": "real",
  "title": "Notre fil rouge : les espaces verts de Kara",
  "content": "Toute cette formation s''appuie sur un projet réel : l''état des lieux des espaces verts de la ville de Kara, au Togo. Objectif : évaluer leur niveau d''aménagement, quartier par quartier, et recueillir les propositions des habitants. 11 observations collectées, 4 quartiers couverts, 7 questions au guide d''entretien, 1 smartphone par enquêteur. Chaque notion sera illustrée sur ce projet."
 },
 {
  "type": "md",
  "content": "### Les quatre méthodes de collecte\n\nLes sondages, entretiens et groupes d''intérêt restent les principaux instruments. Le numérique a ajouté des canaux, pas remplacé les fondamentaux.\n\n1. **Sondages** — questionnaires standardisés diffusés à un large échantillon.\n2. **Entretiens directs** — échanges individuels approfondis avec l''enquêté, sur le terrain.\n3. **Focus groupes** — discussions collectives pour croiser les points de vue.\n4. **Canaux numériques** — entretiens par téléphone ou par internet, en plein essor.\n\nLe projet de Kara combine **sondage terrain et observation directe**, en porte-à-porte dans chaque quartier."
 },
 {
  "type": "md",
  "content": "### Deux familles de données, deux traitements\n\n**Données quantitatives** — quantifiables ou numériques, analysées par des méthodes statistiques : moyennes, fréquences, tendances chiffrées.\n\n> Dans notre cas : la **superficie** en hectares de chaque espace vert recensé. 11 valeurs collectées, moyenne calculable directement sous Excel.\n\n**Données qualitatives** — elles décrivent une qualité, un état, une opinion, et se traitent par une méthode analytique pour en tirer une synthèse.\n\n> Dans notre cas : l''**observation** — Aménagé / Non aménagé / Aménagement en cours. Sur nos 11 observations : 4 aménagés, 5 non aménagés, 2 en cours."
 },
 {
  "type": "callout",
  "variant": "tip",
  "title": "Pourquoi cette distinction décide de tout",
  "content": "Le type de donnée détermine la question posée, le type de champ dans le formulaire, et la méthode d''analyse. Se tromper de famille au moment de concevoir le questionnaire, c''est se retrouver à l''analyse avec des réponses libres impossibles à compter."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%collecte de données terrain%'
  ORDER BY l.order_index LIMIT 1
)
  AND content::text NOT LIKE '%Kara%';

-- ── Le constructeur de formulaire : ajouter une question ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## Le guide d''entretien : le travail préliminaire\n\nPour bien mener une collecte, il faut un **guide d''entretien** (ou questionnaire). C''est le travail préparatoire indispensable : il fixe ce qu''on demande, dans quel ordre, et sous quelle forme.\n\nIl se structure généralement en trois sections :\n\n- **A · Identification** — informations générales sur l''enquêté et le contexte de l''entretien.\n- **B · Questions sur le sujet** — le cœur du questionnaire, en lien direct avec la problématique.\n- **C · Suggestions de l''enquêté** — son avis et ses recommandations sur le problème étudié."
 },
 {
  "type": "callout",
  "variant": "real",
  "title": "Les trois sections sur le projet de Kara",
  "content": "L''identification correspond au quartier et au secteur. Les questions sur le sujet couvrent la localisation, la superficie et l''état d''aménagement. Les suggestions recueillent les propositions d''usage pour l''espace visité."
 },
 {
  "type": "md",
  "content": "### Le guide réellement utilisé à Kara\n\nSept questions, pas une de plus. Chacune a un type décidé à l''avance :\n\n| # | Question | Type | Exemple de réponse |\n|---|---|---|---|\n| 1 | Quartier | Sélection unique | Kpéwa, Tomdè, Ramco, Kassena |\n| 2 | Secteur | Texte | Zone du marché, cité administrative… |\n| 3 | Place / lieu-dit | Texte | Château d''eau, rond-point… |\n| 4 | Position GPS | Point | Coordonnées relevées automatiquement |\n| 5 | Superficie | Numérique | En hectares |\n| 6 | Observation | Sélection unique | Aménagé / Non aménagé / En cours |\n| 7 | Proposition | Sélection multiple | Conserver, parc urbain, réserve botanique… |"
 },
 {
  "type": "callout",
  "variant": "warning",
  "title": "Sept questions, et c''est déjà beaucoup",
  "content": "Chaque question ajoutée coûte du temps à chaque entretien, multiplié par le nombre d''observations. Un guide court se remplit correctement ; un guide long se remplit vite et mal. Demandez-vous pour chaque ligne : que ferai-je de cette donnée à l''analyse ? Si vous n''avez pas de réponse, retirez la question."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND (l.title ILIKE '%ajouter une question%' OR l.title ILIKE '%les bases%')
  ORDER BY l.order_index LIMIT 1
)
  AND content::text NOT LIKE '%Kara%';

-- ── Choisir le bon type de réponse ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## Quatre types de questions, et pas un de plus\n\nUn questionnaire se compose de quatre grands types. Les reconnaître, c''est savoir quel champ créer dans l''outil. Les exemples ci-dessous sont ceux du guide d''entretien de Kara :\n\n- **Question fermée à réponse unique** — l''enquêté choisit une seule réponse parmi les options. *Ex. le quartier : Kpéwa, Tomdè, Ramco, Kassena.*\n- **Question fermée à réponse multiple** — plusieurs réponses possibles parmi la liste. *Ex. les propositions d''aménagement : conserver, parc urbain, réserve botanique.*\n- **Question texte** — réponse libre. *Ex. le nom du secteur ou du lieu-dit.*\n- **Question numérique** — une valeur chiffrée. *Ex. la superficie en hectares.*"
 },
 {
  "type": "md",
  "content": "### Comment KoboToolbox traduit ces types\n\nDans le générateur de formulaire, chaque type du guide d''entretien correspond à une icône dédiée :\n\n- **Sélectionner une** → réponse unique (Quartier)\n- **Sélectionner plusieurs** → réponse multiple (Proposition)\n- **Texte** → champ libre (Secteur)\n- **Chiffre** → valeur numérique (Superficie)\n- **Point** → coordonnées GPS (Position)"
 },
 {
  "type": "image",
  "src": "/academy/kobo/types-question-menu.webp",
  "title": "Menu de sélection du type de question",
  "caption": "KoboToolbox — le menu qui s''ouvre à l''ajout d''une question. Chaque entrée correspond à un des types du guide d''entretien."
 },
 {
  "type": "callout",
  "variant": "tip",
  "title": "Le choix du type se fait en pensant à l''analyse",
  "content": "Une superficie saisie en « texte » arrivera dans Excel sous forme de mots : impossible d''en calculer la moyenne sans nettoyage. Le type se décide au moment de la conception, pas après la collecte."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%type de réponse%'
  ORDER BY l.order_index LIMIT 1
)
  AND content::text NOT LIKE '%Kara%';

-- ── Rendre le formulaire intelligent (validation & logique) ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## Paramétrer chaque question\n\nAjouter une question ne suffit pas : chaque champ possède des réglages qui font la différence entre des données propres et un nettoyage de trois jours."
 },
 {
  "type": "image",
  "src": "/academy/kobo/parametres-question.webp",
  "title": "Panneau de paramètres d''une question",
  "caption": "KoboToolbox — les réglages d''un champ, ici la question « Secteur » du projet de Kara."
 },
 {
  "type": "md",
  "content": "### Les quatre options qui comptent\n\n- **Réponse obligatoire** — empêche de passer la question sans répondre. À activer sur tout ce dont vous aurez besoin à l''analyse.\n- **Nom de la colonne** — détermine l''en-tête dans le futur export Excel. C''est le nom que vous manipulerez dans vos formules : choisissez-le lisible, sans espace ni accent.\n- **Réponse par défaut** — pré-remplit une valeur quand elle est presque toujours la même.\n- **Guidance Hint** — une note d''aide affichée à l''enquêteur. Utile pour préciser une unité ou lever une ambiguïté sur le terrain."
 },
 {
  "type": "callout",
  "variant": "warning",
  "title": "Le nom de colonne se décide maintenant",
  "content": "Renommer un champ après le déploiement crée une seconde colonne dans vos données : les anciennes soumissions gardent l''ancien nom. Prenez trente secondes pour bien le nommer avant de déployer."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%validation%'
  ORDER BY l.order_index LIMIT 1
)
  AND content::text NOT LIKE '%Kara%';

-- ── Déployer le formulaire et lancer la collecte ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## KoboToolbox : la plateforme\n\nKoboToolbox permet de mener une collecte de terrain de bout en bout. La plateforme web sert à concevoir le formulaire et à recevoir les données ; une application Android, rapide et simple, sert à collecter.\n\n- Création de formulaires **sans écrire de code**\n- Collecte **en ligne et hors-ligne**\n- Export direct vers **Excel / CSV**\n- Application mobile **gratuite**"
 },
 {
  "type": "image",
  "src": "/academy/kobo/accueil-kobotoolbox.webp",
  "title": "kobotoolbox.org",
  "caption": "La page d''accueil de la plateforme, point de départ de tout projet."
 },
 {
  "type": "resource",
  "title": "Créer un compte KoboToolbox",
  "url": "https://www.kobotoolbox.org/",
  "provider": "KoboToolbox",
  "desc": "Le serveur humanitaire est gratuit pour les organisations à but non lucratif."
 },
 {
  "type": "md",
  "content": "### Deux formules de compte\n\n**Compte humanitaire** — fourni par OCHA : stockage illimité, projets illimités, serveur en ligne.\n\n**Compte personnel** — fourni par KoboToolbox : 10 000 soumissions par mois, 5 Go de stockage, serveur local, plus sécurisé."
 },
 {
  "type": "image",
  "src": "/academy/kobo/choix-type-compte.webp",
  "title": "Choix du type de compte",
  "caption": "L''écran de sélection au moment de l''inscription."
 },
 {
  "type": "md",
  "content": "## De l''inscription au déploiement, en 8 étapes"
 },
 {
  "type": "md",
  "content": "### Étape 1 — Accéder à KoboToolbox\n\nOuvrez un navigateur, cherchez « KoboToolbox », cliquez sur le premier lien officiel, et vous arrivez sur `www.kobotoolbox.org`. Ajoutez le site à vos favoris : vous y reviendrez à chaque projet."
 },
 {
  "type": "image",
  "src": "/academy/kobo/recherche-kobotoolbox.webp",
  "title": "Étape 1 — la recherche",
  "caption": "Recherche « KoboToolbox » sur un moteur de recherche."
 },
 {
  "type": "md",
  "content": "### Étape 2 — Ouvrir un compte\n\nLe formulaire demande votre nom et celui de votre organisation, un nom d''utilisateur (2 à 30 caractères), une adresse e-mail valide, votre secteur d''activité, votre pays, et un mot de passe."
 },
 {
  "type": "image",
  "src": "/academy/kobo/formulaire-inscription.webp",
  "title": "Étape 2 — le formulaire d''inscription",
  "caption": "Les champs à renseigner pour créer le compte."
 },
 {
  "type": "callout",
  "variant": "warning",
  "title": "Notez vos identifiants maintenant",
  "content": "Le nom d''utilisateur et le mot de passe seront redemandés pour connecter l''application mobile au serveur. Sans eux, le téléphone ne pourra pas récupérer votre formulaire."
 },
 {
  "type": "md",
  "content": "### Étape 3 — Confirmer son inscription\n\nUn e-mail d''activation arrive dans votre boîte : ouvrez le lien qu''il contient pour activer le compte."
 },
 {
  "type": "image",
  "src": "/academy/kobo/compte-cree.webp",
  "title": "Étape 3 — compte créé",
  "caption": "La confirmation affichée après l''envoi du formulaire."
 },
 {
  "type": "image",
  "src": "/academy/kobo/email-activation.webp",
  "title": "Étape 3 — l''e-mail d''activation",
  "caption": "Le message reçu, avec le lien à ouvrir."
 },
 {
  "type": "md",
  "content": "### Étape 4 — Prendre en main le tableau de bord\n\nAprès activation, vous accédez à votre espace de travail :\n\n- **NOUVEAU** — crée un nouveau projet / questionnaire\n- **Déployé** — la liste des formulaires publiés\n- **Brouillons** — les formulaires en cours de conception"
 },
 {
  "type": "image",
  "src": "/academy/kobo/tableau-de-bord.webp",
  "title": "Étape 4 — le tableau de bord",
  "caption": "L''espace de travail, prêt à recevoir un premier projet."
 },
 {
  "type": "md",
  "content": "### Étape 5 — Créer un nouveau projet\n\nChoisissez « Build from scratch » pour partir d''une page vierge, puis nommez le projet — ici : « Projet d''aménagement des espaces verts dans la ville de Kara »."
 },
 {
  "type": "image",
  "src": "/academy/kobo/nouveau-projet.webp",
  "title": "Étape 5 — nouveau projet",
  "caption": "La création d''un projet depuis le tableau de bord."
 },
 {
  "type": "image",
  "src": "/academy/kobo/build-from-scratch.webp",
  "title": "Étape 5 — partir d''une page vierge",
  "caption": "L''option « Build from scratch »."
 },
 {
  "type": "md",
  "content": "### Étape 6 — Construire le questionnaire\n\nPour chaque question : cliquez sur **+**, saisissez l''intitulé, choisissez le type, ajoutez les options de réponse si besoin. Répétez pour les 7 questions du guide."
 },
 {
  "type": "image",
  "src": "/academy/kobo/questionnaire-construction.webp",
  "title": "Étape 6 — le questionnaire en construction",
  "caption": "Le formulaire de Kara en cours de construction : les 7 questions ajoutées une à une."
 },
 {
  "type": "md",
  "content": "### Étape 7 — Paramétrer chaque question\n\nC''est le moment d''appliquer les réglages vus à la leçon précédente : réponse obligatoire, nom de colonne, valeur par défaut, note d''aide."
 },
 {
  "type": "md",
  "content": "### Étape 8 — Sauvegarder et déployer\n\nCliquez sur **Déployer** pour publier le formulaire. Tant qu''il n''est pas déployé, il reste un brouillon invisible depuis le téléphone."
 },
 {
  "type": "image",
  "src": "/academy/kobo/bouton-deployer.webp",
  "title": "Étape 8 — déployer",
  "caption": "Le bouton qui publie le formulaire."
 },
 {
  "type": "image",
  "src": "/academy/kobo/projet-deploye.webp",
  "title": "Étape 8 — projet déployé",
  "caption": "Le projet publié, prêt pour le terrain."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND (l.title ILIKE '%déployer%' OR l.title ILIKE '%lancer la collecte%')
  ORDER BY l.order_index LIMIT 1
)
  AND content::text NOT LIKE '%Kara%';

-- ── Collecter sur le terrain avec KoboCollect ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## L''application qui va sur le terrain\n\nKoboCollect est l''application Android qui synchronise vos formulaires avec le serveur KoboToolbox. Elle fonctionne **hors connexion** : c''est ce qui la rend utilisable partout."
 },
 {
  "type": "md",
  "content": "### Étape 9 — Installer KoboCollect\n\nSur le Play Store, recherchez « kobo » et installez l''application officielle **KoBoCollect**. Elle est gratuite."
 },
 {
  "type": "image",
  "src": "/academy/kobo/playstore-recherche.webp",
  "title": "Étape 9 — rechercher « kobo »",
  "caption": "La recherche sur le Play Store."
 },
 {
  "type": "image",
  "src": "/academy/kobo/playstore-kobocollect.webp",
  "title": "Étape 9 — l''application officielle",
  "caption": "KoBoCollect, éditée par KoboToolbox."
 },
 {
  "type": "image",
  "src": "/academy/kobo/kobocollect-accueil.webp",
  "title": "Étape 9 — écran d''accueil",
  "caption": "L''application après installation, avant configuration."
 },
 {
  "type": "md",
  "content": "### Étape 10 — Configurer le serveur\n\nDans les paramètres du projet, écran **Serveur**, renseignez :\n\n- **URL** : `kc.kobotoolbox.org`\n- **Nom d''utilisateur** : celui de votre compte\n- **Mot de passe** : celui de votre compte\n\nC''est cette étape qui relie le téléphone à votre espace de travail."
 },
 {
  "type": "image",
  "src": "/academy/kobo/app-parametres-projet.webp",
  "title": "Étape 10 — paramètres du projet",
  "caption": "Le menu de configuration de l''application."
 },
 {
  "type": "image",
  "src": "/academy/kobo/app-ecran-serveur.webp",
  "title": "Étape 10 — écran Serveur",
  "caption": "L''écran où se règle la connexion."
 },
 {
  "type": "image",
  "src": "/academy/kobo/app-saisie-url.webp",
  "title": "Étape 10 — saisie de l''URL",
  "caption": "L''adresse du serveur à renseigner."
 },
 {
  "type": "md",
  "content": "### Étape 11 — Télécharger le formulaire vierge\n\nDepuis l''application, récupérez le formulaire publié : il apparaît dans la liste des formulaires disponibles sur le serveur."
 },
 {
  "type": "image",
  "src": "/academy/kobo/app-selection-formulaire.webp",
  "title": "Étape 11 — sélection du formulaire",
  "caption": "Le formulaire « Espaces verts de Kara » proposé au téléchargement."
 },
 {
  "type": "image",
  "src": "/academy/kobo/app-telechargement-ok.webp",
  "title": "Étape 11 — téléchargement réussi",
  "caption": "La confirmation de récupération du formulaire."
 },
 {
  "type": "md",
  "content": "### Étape 12 — Remplir un formulaire sur le terrain\n\n1. Sélectionner le projet, puis « Remplir un formulaire »\n2. Répondre à chaque question au fil de l''entretien avec l''enquêté\n3. Cocher « Marquer le formulaire comme finalisé »\n4. Cliquer sur « Enregistrer formulaire et sortir »\n5. Répéter pour chaque nouvelle observation"
 },
 {
  "type": "image",
  "src": "/academy/kobo/app-remplir-formulaire.webp",
  "title": "Étape 12 — remplir un formulaire",
  "caption": "L''entrée « Remplir un formulaire » dans l''application."
 },
 {
  "type": "image",
  "src": "/academy/kobo/app-finaliser.webp",
  "title": "Étape 12 — enregistrer et finaliser",
  "caption": "La case à cocher qui marque le formulaire comme terminé."
 },
 {
  "type": "callout",
  "variant": "warning",
  "title": "Un formulaire non finalisé ne part jamais",
  "content": "Si la case « Marquer comme finalisé » reste décochée, le questionnaire demeure un brouillon sur le téléphone : il n''apparaîtra pas dans la liste des envois et vos données resteront invisibles côté serveur."
 },
 {
  "type": "md",
  "content": "### Étape 13 — Envoyer les données collectées\n\nDe retour à portée du réseau, sélectionnez les formulaires finalisés et lancez l''envoi vers le serveur KoboToolbox."
 },
 {
  "type": "image",
  "src": "/academy/kobo/app-envoi-selection.webp",
  "title": "Étape 13 — sélection des envois",
  "caption": "Les 11 formulaires finalisés du projet de Kara, prêts à partir."
 },
 {
  "type": "image",
  "src": "/academy/kobo/app-envoi-en-cours.webp",
  "title": "Étape 13 — envoi en cours",
  "caption": "La transmission vers le serveur."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%avec kobocollect%'
  ORDER BY l.order_index LIMIT 1
)
  AND content::text NOT LIKE '%Kara%';

-- ── Récupérer et analyser les données (capstone) ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## Du serveur au fichier exploitable\n\nLes données envoyées par les enquêteurs arrivent en temps réel dans l''onglet **Données** de votre projet. Il reste à les sortir de la plateforme pour les analyser."
 },
 {
  "type": "image",
  "src": "/academy/kobo/donnees-serveur.webp",
  "title": "Les soumissions reçues",
  "caption": "Les 11 observations du projet de Kara, reçues sur le serveur, prêtes à être exportées."
 },
 {
  "type": "md",
  "content": "### Exporter au format CSV\n\nChoisissez le type d''export **CSV**, cliquez sur **Exporter**, puis sur **Télécharger** pour récupérer le fichier."
 },
 {
  "type": "image",
  "src": "/academy/kobo/export-csv.webp",
  "title": "Choix du format d''export",
  "caption": "Le type d''export CSV sélectionné."
 },
 {
  "type": "image",
  "src": "/academy/kobo/export-telecharger.webp",
  "title": "Récupérer le fichier",
  "caption": "Le bouton de téléchargement une fois l''export préparé."
 },
 {
  "type": "md",
  "content": "### Ouvrir et analyser sous Excel\n\nLe CSV s''ouvre dans Excel : une ligne par observation, une colonne par question — les en-têtes sont exactement les « noms de colonne » réglés à l''étape 7.\n\nÀ partir de là : tris, tableaux croisés dynamiques et diagrammes valorisent rapidement les résultats. Sur nos 11 espaces recensés à Kara, **36 % sont déjà aménagés**."
 },
 {
  "type": "image",
  "src": "/academy/kobo/analyse-excel.webp",
  "title": "Le fichier ouvert dans Excel",
  "caption": "11 lignes, une par observation, et la répartition des espaces verts observés."
 },
 {
  "type": "md",
  "content": "### Le processus complet, en 8 étapes\n\n1. Créer un compte KoboToolbox\n2. Configurer le serveur\n3. Concevoir le guide d''entretien\n4. Déployer le formulaire\n5. Installer KoboCollect sur mobile\n6. Collecter les données\n7. Téléverser les réponses\n8. Analyser sous Excel"
 },
 {
  "type": "callout",
  "variant": "real",
  "title": "Ce cycle a tourné en vrai",
  "content": "Le projet « Aménagement des espaces verts de Kara » a parcouru ces huit étapes de bout en bout : 11 observations, 4 quartiers, du terrain jusqu''à l''analyse Excel. C''est exactement ce que vous venez d''apprendre à faire."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND (l.title ILIKE '%analyser les données%' OR l.title ILIKE '%indicateurs nutritionnels%')
  ORDER BY l.order_index LIMIT 1
)
  AND content::text NOT LIKE '%Kara%';

-- ── Rapport ──
-- Un UPDATE sans effet affiche « Success. No rows returned » exactement comme un
-- UPDATE réussi : ce SELECT rend le résultat visible. Chaque leçon doit afficher
-- un nombre de cellules en hausse, ses exercices intacts, et ses captures.
SELECT l.order_index AS lecon,
       l.title,
       jsonb_array_length(l.content->'cells') AS cellules,
       jsonb_array_length(jsonb_path_query_array(l.content->'cells', '$[*] ? (@.type == "exercise")')) AS exercices,
       jsonb_array_length(jsonb_path_query_array(l.content->'cells', '$[*] ? (@.type == "image")')) AS captures
FROM sms_lessons l
JOIN sms_courses c ON c.id = l.course_id
WHERE c.code = 'MEAL-01'
ORDER BY l.order_index;
