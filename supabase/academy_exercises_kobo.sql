-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Exercices notés sur la matière KoboToolbox / KoboCollect
--
-- Les 24 exercices d'academy_exercises_meal01.sql portent sur la matière MEAL
-- d'origine (enquête nutritionnelle). Ceux-ci évaluent le cycle KoboToolbox
-- ajouté par academy_kobo_upgrade.sql, sur le cas pratique des espaces verts
-- de KARA : choisir un type de question, paramétrer un champ, diagnostiquer un
-- formulaire qui ne remonte pas, lire les chiffres de la collecte.
--
-- Identifiants préfixés « k » pour ne pas entrer en collision avec les « l »
-- des exercices existants — deux exercices de même id dans une leçon
-- partageraient la même réponse saisie.
--
-- Rappel : le corrigé (answer / accept / tolerance / explain) reste en base et
-- n'est jamais envoyé au navigateur. Seuil de validation d'une leçon : 70 %.
--
-- Script idempotent : une leçon contenant déjà son premier exercice Kobo est
-- ignorée. Valider avec `npm run verify:exercises` avant d'exécuter.
-- À exécuter APRÈS academy_kobo_upgrade.sql.
-- ════════════════════════════════════════════════════════════════

-- ── Comprendre la collecte de données terrain ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer — la partie KoboToolbox\n\nVous venez de parcourir le cycle complet sur le projet des espaces verts de Kara. Ces exercices portent sur ce que vous feriez, vous, devant l''outil."
 },
 {
  "type": "exercise",
  "id": "k1e1",
  "kind": "choice",
  "title": "Choisir sa méthode",
  "prompt": "Vous devez recueillir en une seule séance l''avis de douze chefs de quartier sur l''usage souhaité des espaces verts de Kara, et faire réagir chacun aux propositions des autres. Quelle méthode de collecte choisissez-vous ?",
  "answer": 2,
  "explain": "Le **focus groupe** est fait pour ça : croiser les points de vue en une seule séance. Douze entretiens directs donneraient douze avis isolés, sans confrontation ; un sondage ne capterait aucune réaction.",
  "opts": [
   "Un sondage standardisé envoyé à chacun",
   "Douze entretiens directs successifs",
   "Un focus groupe",
   "Un questionnaire en ligne"
  ],
  "hint": "Qu''est-ce qui permet de faire naître la discussion entre les participants ?"
 },
 {
  "type": "exercise",
  "id": "k1e2",
  "kind": "choice",
  "title": "Reconnaître la famille de données",
  "prompt": "Dans le guide de Kara, la question « Observation » propose : Aménagé / Non aménagé / En cours. De quelle famille relève cette donnée ?",
  "answer": 1,
  "explain": "Elle est **qualitative** : elle décrit un état, pas une quantité. On peut évidemment compter combien d''espaces sont aménagés — dénombrer des modalités qualitatives est même le b.a.-ba de l''analyse — mais la donnée elle-même reste une qualité.",
  "opts": [
   "Quantitative, car on peut compter les réponses",
   "Qualitative, car elle décrit un état",
   "Quantitative, car elle a trois valeurs",
   "Ni l''une ni l''autre"
  ],
  "hint": "Ce qui compte n''est pas qu''on puisse dénombrer les réponses, mais ce que la réponse décrit."
 },
 {
  "type": "exercise",
  "id": "k1e3",
  "kind": "number",
  "title": "Le chiffre qui ouvre le rapport",
  "prompt": "Sur les 11 espaces verts recensés à Kara : 4 sont aménagés, 5 ne le sont pas, 2 sont en cours d''aménagement. Quel pourcentage des espaces recensés n''est PAS aménagé ?",
  "answer": 45.5,
  "explain": "5 / 11 × 100 = **45,5 %**. Attention au piège : les 2 « en cours » ne sont ni aménagés ni non aménagés. Les fondre dans l''une des deux catégories fausserait le diagnostic présenté à la mairie.",
  "tolerance": 0.6,
  "unit": "%",
  "hint": "Seuls les « non aménagés » comptent ici — les « en cours » sont une troisième catégorie."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%collecte de données terrain%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"k1e1"}]'::jsonb;

-- ── Le constructeur de formulaire : ajouter une question ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer — la partie KoboToolbox\n\nVous venez de parcourir le cycle complet sur le projet des espaces verts de Kara. Ces exercices portent sur ce que vous feriez, vous, devant l''outil."
 },
 {
  "type": "exercise",
  "id": "k2e1",
  "kind": "choice",
  "title": "Placer la question dans la bonne section",
  "prompt": "Dans le guide d''entretien de Kara, la question « Proposition d''aménagement » relève de quelle section ?",
  "answer": 2,
  "explain": "Section **C · Suggestions**. Elle ne décrit pas l''état constaté de l''espace vert (section B) mais recueille l''avis de l''enquêté sur ce qu''il faudrait en faire. Séparer les deux évite de mélanger, à l''analyse, ce qui est observé et ce qui est souhaité.",
  "opts": [
   "A · Identification",
   "B · Questions sur le sujet",
   "C · Suggestions de l''enquêté",
   "Aucune, c''est une question hors guide"
  ]
 },
 {
  "type": "exercise",
  "id": "k2e2",
  "kind": "text",
  "title": "La section d''entrée",
  "prompt": "Le quartier et le secteur situent l''entretien. Dans quelle section du guide les place-t-on ? (donnez le nom de la section)",
  "answer": "identification",
  "explain": "Section **Identification** : elle réunit les informations générales sur l''enquêté et le contexte de l''entretien. C''est elle qui permettra ensuite de désagréger tous les résultats par quartier.",
  "accept": [
   "identification",
   "a",
   "section a"
  ]
 },
 {
  "type": "exercise",
  "id": "k2e3",
  "kind": "choice",
  "title": "Arbitrer une demande d''ajout",
  "prompt": "Un collègue veut ajouter six questions sur l''histoire de chaque quartier. Vous êtes responsable du guide. Que faites-vous ?",
  "answer": 1,
  "explain": "La bonne question est **« qu''en ferez-vous à l''analyse ? »**. Six questions de plus, c''est six fois onze réponses à saisir et à traiter, et un entretien plus long donc moins bien rempli. Ce qui n''a pas d''usage prévu ne va pas dans le guide.",
  "opts": [
   "Vous les ajoutez : plus on collecte, mieux c''est",
   "Vous lui demandez ce qu''il fera de ces données à l''analyse, et ne gardez que ce qui a un usage",
   "Vous refusez : le guide est figé",
   "Vous créez un second questionnaire pour ces six questions"
  ],
  "hint": "Chaque question ajoutée est multipliée par le nombre d''entretiens."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND (l.title ILIKE '%ajouter une question%' OR l.title ILIKE '%les bases%')
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"k2e1"}]'::jsonb;

-- ── Choisir le bon type de réponse ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer — la partie KoboToolbox\n\nVous venez de parcourir le cycle complet sur le projet des espaces verts de Kara. Ces exercices portent sur ce que vous feriez, vous, devant l''outil."
 },
 {
  "type": "exercise",
  "id": "k3e1",
  "kind": "text",
  "title": "Le champ qui relève la position",
  "prompt": "Dans le générateur de formulaire KoboToolbox, quel type de question enregistre automatiquement les coordonnées GPS du lieu visité ?",
  "answer": "point",
  "explain": "Le type **Point** dans l''interface de KoboToolbox (`geopoint` dans le format XLSForm sous-jacent). C''est lui qui capte la position au moment de la saisie, sans que l''enquêteur ait à noter quoi que ce soit.",
  "accept": [
   "point",
   "geopoint",
   "geo point"
  ]
 },
 {
  "type": "exercise",
  "id": "k3e2",
  "kind": "choice",
  "title": "Une question, plusieurs réponses",
  "prompt": "Un habitant propose à la fois de conserver l''espace, d''en faire un parc urbain et d''y planter une réserve botanique. Quel type de question permet d''enregistrer ces trois réponses ?",
  "answer": 1,
  "explain": "**Sélectionner plusieurs** : c''est le seul type qui accepte plusieurs modalités pour une même observation. Avec « Sélectionner une », l''enquêteur devrait choisir arbitrairement et vous perdriez deux propositions sur trois.",
  "opts": [
   "Sélectionner une",
   "Sélectionner plusieurs",
   "Texte",
   "Chiffre"
  ]
 },
 {
  "type": "exercise",
  "id": "k3e3",
  "kind": "choice",
  "title": "Le piège du champ libre",
  "prompt": "Le quartier ne peut prendre que quatre valeurs : Kpéwa, Tomdè, Ramco, Kassena. Un collègue propose de le saisir en « Texte » pour aller plus vite. Quelle conséquence à l''analyse ?",
  "answer": 2,
  "explain": "Un champ libre produit autant d''orthographes que d''enquêteurs : accents oubliés, majuscules, espaces en trop. Votre tableau croisé affichera dix quartiers au lieu de quatre, et il faudra tout renettoyer à la main. **Dès qu''une liste de valeurs est connue à l''avance, elle se fige en « Sélectionner une ».**",
  "opts": [
   "Aucune, le résultat est identique",
   "Les données seront plus précises",
   "« Kpéwa », « kpewa » et « Kpéwa » avec un espace compteront comme trois quartiers différents",
   "KoboToolbox refusera le formulaire"
  ],
  "hint": "Que se passe-t-il quand huit enquêteurs tapent le même nom à la main ?"
 },
 {
  "type": "exercise",
  "id": "k3e4",
  "kind": "choice",
  "title": "Choisir pour la superficie",
  "prompt": "La superficie de chaque espace vert doit être exploitée pour calculer une moyenne. Quel type de question choisissez-vous ?",
  "answer": 2,
  "explain": "**Chiffre**. C''est ce qui garantit que la valeur arrivera dans Excel comme un nombre, directement calculable. Saisie en texte, « 2,5 ha » ne se moyenne pas sans retraitement.",
  "opts": [
   "Texte",
   "Sélectionner une",
   "Chiffre",
   "Point"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%type de réponse%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"k3e1"}]'::jsonb;

-- ── Rendre le formulaire intelligent (validation & logique) ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer — la partie KoboToolbox\n\nVous venez de parcourir le cycle complet sur le projet des espaces verts de Kara. Ces exercices portent sur ce que vous feriez, vous, devant l''outil."
 },
 {
  "type": "exercise",
  "id": "k4e1",
  "kind": "text",
  "title": "Le réglage qui décide de vos colonnes Excel",
  "prompt": "Quel paramètre d''une question détermine l''en-tête de colonne que vous retrouverez dans l''export ?",
  "answer": "nom de la colonne",
  "explain": "Le **nom de la colonne**. C''est le seul paramètre qui suit la donnée jusqu''à votre fichier Excel : soignez-le, sans espace ni accent, et vos formules seront lisibles six mois plus tard.",
  "accept": [
   "nom de la colonne",
   "nom de colonne",
   "nom colonne",
   "column name",
   "nom"
  ],
  "hint": "C''est le nom que vous manipulerez ensuite dans vos formules."
 },
 {
  "type": "exercise",
  "id": "k4e2",
  "kind": "choice",
  "title": "Empêcher un trou dans les données",
  "prompt": "À la relecture, vous découvrez que trois enquêteurs ont sauté la question « Superficie ». Quel réglage aurait évité ça ?",
  "answer": 0,
  "explain": "**Réponse obligatoire** : l''application refuse de passer à la suite tant que le champ est vide. À activer sur tout ce dont vous aurez besoin à l''analyse — mais seulement là-dessus, sinon l''enquêteur se retrouve bloqué sur des questions accessoires.",
  "opts": [
   "Réponse obligatoire",
   "Réponse par défaut",
   "Guidance Hint",
   "Nom de la colonne"
  ]
 },
 {
  "type": "exercise",
  "id": "k4e3",
  "kind": "choice",
  "title": "Lever une ambiguïté sur le terrain",
  "prompt": "Vous voulez que l''enquêteur sache que la superficie se saisit en hectares, et non en mètres carrés. Quel réglage utilisez-vous ?",
  "answer": 2,
  "explain": "Le **Guidance Hint** affiche une note d''aide sous la question, au moment où l''enquêteur la lit. C''est le bon endroit pour une unité, une consigne de mesure ou une précision de vocabulaire.",
  "opts": [
   "Réponse obligatoire",
   "Réponse par défaut",
   "Guidance Hint",
   "Nom de la colonne"
  ]
 },
 {
  "type": "exercise",
  "id": "k4e4",
  "kind": "choice",
  "title": "Renommer après coup",
  "prompt": "Le formulaire est déployé et 6 observations sont déjà remontées. Vous renommez le champ « secteur » en « zone ». Que se passe-t-il ?",
  "answer": 1,
  "explain": "Vous obtenez **deux colonnes**. Les soumissions déjà envoyées gardent l''ancien nom, les suivantes portent le nouveau : à l''analyse, il faudra fusionner les deux à la main. Le nom de colonne se décide avant de déployer.",
  "opts": [
   "Les 6 anciennes réponses sont renommées automatiquement",
   "Vos données comportent désormais deux colonnes : les anciennes sous « secteur », les nouvelles sous « zone »",
   "Le formulaire cesse de fonctionner",
   "Les 6 anciennes observations sont perdues"
  ],
  "hint": "Les soumissions déjà envoyées ne bougent plus."
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%validation%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"k4e1"}]'::jsonb;

-- ── Déployer le formulaire et lancer la collecte ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer — la partie KoboToolbox\n\nVous venez de parcourir le cycle complet sur le projet des espaces verts de Kara. Ces exercices portent sur ce que vous feriez, vous, devant l''outil."
 },
 {
  "type": "exercise",
  "id": "k5e1",
  "kind": "choice",
  "title": "Choisir sa formule de compte",
  "prompt": "Votre ONG mène des enquêtes toute l''année et a besoin de projets et de stockage sans limite. Quelle formule de compte demandez-vous ?",
  "answer": 1,
  "explain": "Le **compte humanitaire**, fourni par OCHA : stockage et projets illimités. Le compte personnel plafonne à 10 000 soumissions par mois et 5 Go — largement suffisant pour un projet ponctuel, insuffisant pour une activité continue.",
  "opts": [
   "Compte personnel KoboToolbox",
   "Compte humanitaire fourni par OCHA",
   "Les deux en parallèle",
   "Peu importe, les deux sont identiques"
  ]
 },
 {
  "type": "exercise",
  "id": "k5e2",
  "kind": "number",
  "title": "Connaître ses limites",
  "prompt": "Combien de soumissions par mois un compte personnel KoboToolbox permet-il ?",
  "answer": 10000,
  "explain": "**10 000 soumissions par mois**, avec 5 Go de stockage. Ce chiffre décide du choix de formule avant même de commencer : au-delà, il faut le compte humanitaire.",
  "tolerance": 0,
  "unit": "soumissions par mois"
 },
 {
  "type": "exercise",
  "id": "k5e3",
  "kind": "choice",
  "title": "Le formulaire introuvable",
  "prompt": "Vous avez construit vos 7 questions, tout est correct à l''écran. Sur le téléphone, le formulaire n''apparaît nulle part. Que s''est-il passé ?",
  "answer": 2,
  "explain": "Il manque le **déploiement**. Tant que vous n''avez pas cliqué sur « Déployer », le formulaire reste un brouillon : il n''existe pas côté serveur, donc l''application n''a rien à télécharger.",
  "opts": [
   "Le téléphone n''a pas assez de mémoire",
   "Le compte est expiré",
   "Le formulaire n''a pas été déployé : il est resté en brouillon",
   "Il faut réinstaller KoboCollect"
  ],
  "hint": "Un formulaire visible dans « Brouillons » n''existe pas encore pour le serveur."
 },
 {
  "type": "exercise",
  "id": "k5e4",
  "kind": "choice",
  "title": "Pourquoi noter ses identifiants",
  "prompt": "À l''inscription, on insiste pour que vous notiez votre nom d''utilisateur et votre mot de passe. À quoi serviront-ils ensuite ?",
  "answer": 1,
  "explain": "Ils sont redemandés au moment de **configurer le serveur dans KoboCollect**. Sans eux, le téléphone ne peut pas s''authentifier et ne récupérera aucun formulaire — c''est le blocage le plus fréquent au démarrage d''une collecte.",
  "opts": [
   "À valider votre adresse e-mail",
   "À connecter l''application mobile au serveur",
   "À exporter les données en CSV",
   "À rien, c''est une simple précaution"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND (l.title ILIKE '%déployer%' OR l.title ILIKE '%lancer la collecte%')
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"k5e1"}]'::jsonb;

-- ── Collecter sur le terrain avec KoboCollect ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer — la partie KoboToolbox\n\nVous venez de parcourir le cycle complet sur le projet des espaces verts de Kara. Ces exercices portent sur ce que vous feriez, vous, devant l''outil."
 },
 {
  "type": "exercise",
  "id": "k6e1",
  "kind": "text",
  "title": "L''adresse du serveur",
  "prompt": "Quelle URL faut-il saisir dans l''écran « Serveur » de KoboCollect pour le relier à votre compte ?",
  "answer": "kc.kobotoolbox.org",
  "explain": "**kc.kobotoolbox.org**. Attention : le site où vous construisez le formulaire est `kobotoolbox.org`, mais l''application se connecte à `kc.` — la confusion entre les deux est la cause classique d''un « aucun formulaire disponible ».",
  "accept": [
   "kc.kobotoolbox.org",
   "https://kc.kobotoolbox.org"
  ],
  "hint": "Ce n''est pas la même adresse que le site où vous avez créé votre compte."
 },
 {
  "type": "exercise",
  "id": "k6e2",
  "kind": "choice",
  "title": "Les données qui ne partent pas",
  "prompt": "Un enquêteur a rempli 5 questionnaires, mais l''écran d''envoi n''en propose aucun. Quelle est la cause la plus probable ?",
  "answer": 2,
  "explain": "Ils sont restés en **brouillon** : sans la case « Marquer le formulaire comme finalisé », le questionnaire n''entre pas dans la file d''envoi. C''est le premier réflexe à vérifier — et une consigne à répéter aux enquêteurs avant le départ.",
  "opts": [
   "Le serveur est en panne",
   "Les questionnaires ont déjà été envoyés",
   "Les questionnaires n''ont pas été marqués comme finalisés",
   "Le formulaire a expiré"
  ],
  "hint": "Un questionnaire enregistré n''est pas forcément terminé."
 },
 {
  "type": "exercise",
  "id": "k6e3",
  "kind": "choice",
  "title": "Le village sans réseau",
  "prompt": "Un enquêteur vous appelle : aucun réseau dans le quartier où il se trouve. Que lui dites-vous ?",
  "answer": 1,
  "explain": "**Continuer normalement.** KoboCollect est conçu pour le hors-ligne : les soumissions finalisées attendent dans la file d''envoi et partent dès que le réseau revient. La double saisie papier réintroduit exactement les erreurs que l''outil supprime.",
  "opts": [
   "De revenir en ville pour collecter",
   "De continuer : les questionnaires sont enregistrés sur le téléphone et partiront au retour du réseau",
   "De noter les réponses sur papier puis de les ressaisir le soir",
   "D''attendre que le réseau revienne"
  ]
 },
 {
  "type": "exercise",
  "id": "k6e4",
  "kind": "choice",
  "title": "Remettre le terrain dans l''ordre",
  "prompt": "Vous formez un nouvel enquêteur. Dans quel ordre doit-il procéder le premier jour ?",
  "answer": 0,
  "explain": "On configure le serveur **d''abord** — sans lui, rien à télécharger. Puis on récupère le formulaire vierge, on le remplit pour chaque observation, on le finalise, et on envoie une fois le réseau retrouvé.",
  "opts": [
   "Configurer le serveur → télécharger le formulaire vierge → remplir → finaliser → envoyer",
   "Télécharger le formulaire → configurer le serveur → remplir → envoyer → finaliser",
   "Remplir → configurer le serveur → télécharger le formulaire → envoyer",
   "Configurer le serveur → remplir → télécharger le formulaire → finaliser"
  ]
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%avec kobocollect%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"k6e1"}]'::jsonb;

-- ── Récupérer et analyser les données (capstone) ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
 {
  "type": "md",
  "content": "## À vous de jouer — la partie KoboToolbox\n\nVous venez de parcourir le cycle complet sur le projet des espaces verts de Kara. Ces exercices portent sur ce que vous feriez, vous, devant l''outil."
 },
 {
  "type": "exercise",
  "id": "k7e1",
  "kind": "choice",
  "title": "Le bon format d''export",
  "prompt": "Vous voulez ouvrir vos données dans Excel pour faire un tableau croisé dynamique. Quel type d''export choisissez-vous depuis l''onglet Données ?",
  "answer": 1,
  "explain": "**CSV** : un fichier tabulaire qu''Excel ouvre directement, une ligne par observation et une colonne par question. Le PDF, lui, ne se recalcule pas.",
  "opts": [
   "PDF",
   "CSV",
   "Une capture d''écran du tableau",
   "XML"
  ]
 },
 {
  "type": "exercise",
  "id": "k7e2",
  "kind": "number",
  "title": "Le chiffre du rapport",
  "prompt": "Sur les 11 espaces verts recensés à Kara, 4 sont déjà aménagés. Quelle proportion cela représente-t-il ?",
  "answer": 36,
  "explain": "4 / 11 × 100 = **36 %**. C''est le chiffre qui ouvre la restitution à la mairie : près des deux tiers des espaces verts recensés restent à aménager.",
  "tolerance": 0.7,
  "unit": "%"
 },
 {
  "type": "exercise",
  "id": "k7e3",
  "kind": "text",
  "title": "D''où viennent vos en-têtes",
  "prompt": "Dans le CSV exporté, les en-têtes de colonnes reprennent un paramètre réglé au moment de la conception. Lequel ?",
  "answer": "nom de la colonne",
  "explain": "Le **nom de la colonne** défini question par question. C''est pour cela qu''il se soigne avant le déploiement : un champ mal nommé se retrouve tel quel en tête de votre tableau d''analyse.",
  "accept": [
   "nom de la colonne",
   "nom de colonne",
   "nom colonne",
   "column name"
  ]
 },
 {
  "type": "exercise",
  "id": "k7e4",
  "kind": "choice",
  "title": "Du chiffre à la décision",
  "prompt": "Votre analyse montre que 45 % des espaces recensés ne sont pas aménagés et que les propositions dominantes sont « parc urbain » et « conserver en l''état ». Que produisez-vous pour la mairie ?",
  "answer": 1,
  "explain": "Collecter n''est pas une fin : le livrable est une **lecture qui permet de décider**. Croiser l''état constaté et l''usage souhaité, quartier par quartier, désigne les sites où intervenir en premier. Le CSV brut renvoie le travail d''analyse à celui qui vous a commandé l''étude.",
  "opts": [
   "Le fichier CSV brut, elle en fera ce qu''elle veut",
   "Une note qui croise l''état des espaces par quartier avec les usages souhaités, et pointe les sites prioritaires",
   "Un tableau de toutes les réponses individuelles",
   "Une nouvelle collecte pour confirmer"
  ],
  "hint": "À quoi sert une collecte si personne ne peut décider à partir du résultat ?"
 }
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND (l.title ILIKE '%analyser les données%' OR l.title ILIKE '%indicateurs nutritionnels%')
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"id":"k7e1"}]'::jsonb;

-- ── Rapport ──
SELECT l.order_index AS lecon, l.title,
       jsonb_array_length(jsonb_path_query_array(l.content->'cells', '$[*] ? (@.type == "exercise")')) AS exercices_total
FROM sms_lessons l
JOIN sms_courses c ON c.id = l.course_id
WHERE c.code = 'MEAL-01'
ORDER BY l.order_index;
