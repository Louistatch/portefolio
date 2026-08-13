-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Exercices « faire faire » sur le cours MEAL-01
--
-- Chaque leçon se termine désormais par des exercices que l'étudiant
-- doit produire lui-même. La note de la leçon vient de ces réponses,
-- corrigées CÔTÉ SERVEUR : le corrigé (answer / accept / tolerance)
-- reste en base et n'est jamais envoyé au navigateur.
--
-- Format d'une cellule d'exercice :
--   { "type": "exercise", "id": "…", "kind": "choice|number|text",
--     "title": "…", "prompt": "…",
--     "opts": [...],        -- kind = choice
--     "answer": …,          -- index (choice) | valeur (number) | texte (text)
--     "tolerance": 0.1,     -- kind = number
--     "accept": ["…"],      -- kind = text, variantes acceptées
--     "unit": "…", "hint": "…", "explain": "…" }
--
-- Seuil de validation d'une leçon : 70 % des exercices justes.
-- Script idempotent : une leçon qui contient déjà un exercice est ignorée.
-- À exécuter dans Supabase SQL Editor APRÈS kobo_course_enriched.sql
-- ════════════════════════════════════════════════════════════════

-- ── Leçon 1 — Comprendre la collecte de données terrain ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
  {"type":"md","content":"## À vous de jouer\n\nVous venez de recevoir la commande : mesurer la malnutrition aiguë chez les enfants de 6 à 59 mois dans 5 districts de Lomé. 8 enquêteurs, 10 jours, 200 enfants à voir. Avant de lire la suite du cours, prenez les décisions du chef de projet."},
  {"type":"exercise","id":"l1e1","kind":"choice","title":"Par quoi commencer",
   "prompt":"Les 8 enquêteurs sont recrutés et les véhicules réservés. Quelle est la PREMIÈRE chose à produire avant de les envoyer sur le terrain ?",
   "opts":["Le rapport à envoyer au bailleur","Le questionnaire et ses règles de saisie","La carte des 5 districts","Le budget carburant"],
   "answer":1,
   "hint":"Sans quoi les 8 enquêteurs collecteraient-ils des données incomparables entre elles ?",
   "explain":"Le questionnaire est l''instrument de mesure. Tant qu''il n''est pas figé, chaque enquêteur poserait ses propres questions et les données ne seraient pas agrégeables. La carte et le budget sont de la logistique : ils viennent après."},
  {"type":"exercise","id":"l1e2","kind":"number","title":"Dimensionner la charge",
   "prompt":"200 enfants à enquêter, 8 enquêteurs, 10 jours de collecte. Combien de questionnaires chaque enquêteur doit-il remplir par jour en moyenne ?",
   "answer":2.5,"tolerance":0.1,"unit":"questionnaires par enquêteur et par jour",
   "hint":"200 divisé par le nombre d''enquêteurs, puis par le nombre de jours.",
   "explain":"200 / 8 / 10 = 2,5 questionnaires par jour et par enquêteur. Ce chiffre est votre garde-fou : s''il monte au-dessus de 6-8, la qualité de la mesure MUAC s''effondre et il faut renégocier le calendrier ou l''échantillon."},
  {"type":"exercise","id":"l1e3","kind":"choice","title":"Reconnaître un indicateur mesurable",
   "prompt":"Parmi ces formulations, laquelle peut réellement être mesurée par votre enquête ?",
   "opts":["Améliorer la situation nutritionnelle des enfants","Prévalence de la malnutrition aiguë globale chez les 6-59 mois, par district","Sensibiliser les mères à la nutrition","Renforcer les capacités des agents de santé"],
   "answer":1,
   "explain":"Un indicateur se mesure avec une valeur, une population et une désagrégation. « Améliorer », « sensibiliser », « renforcer » décrivent des intentions : rien dans votre formulaire ne pourra les chiffrer."}
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%collecte de données terrain%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"type":"exercise"}]'::jsonb;

-- ── Leçon 2 — Le constructeur de formulaire : ajouter une question ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
  {"type":"md","content":"## À vous de jouer\n\nOuvrez mentalement votre onglet **survey**. Vous ajoutez la question qui demande le nom de l''enfant."},
  {"type":"exercise","id":"l2e1","kind":"text","title":"La colonne du texte affiché",
   "prompt":"Dans un XLSForm, quelle colonne contient le texte de la question tel que l''enquêteur le lit à voix haute ?",
   "answer":"label","accept":["label","labels"],
   "hint":"Trois colonnes structurent l''onglet survey : une pour le type, une pour le nom technique, une pour le texte lu.",
   "explain":"C''est la colonne **label**. La colonne *name* est l''identifiant technique qui sortira dans vos données ; *type* décide du clavier et des contrôles."},
  {"type":"exercise","id":"l2e2","kind":"choice","title":"Nommer proprement",
   "prompt":"Vous saisissez la question du périmètre brachial. Quel *name* choisissez-vous ?",
   "opts":["MUAC (mm) ?","muac_mm","périmètre brachial","q4"],
   "answer":1,
   "hint":"Ce nom deviendra un nom de colonne dans votre fichier de données, puis dans votre code Python.",
   "explain":"**muac_mm** : minuscules, sans espace ni accent, et il dit ce qu''il contient avec son unité. « q4 » est valide techniquement mais illisible six mois plus tard ; les deux autres cassent l''export et le code."},
  {"type":"exercise","id":"l2e3","kind":"choice","title":"Repérer l''erreur",
   "prompt":"Un collègue vous envoie sa ligne : type = *text*, name = *age*, label = « Âge de l''enfant en mois ». Quel problème allez-vous découvrir à l''analyse ?",
   "opts":["Le formulaire refusera de se déployer","Les âges arriveront en texte et ne pourront pas être comparés à 59","Le GPS ne sera pas enregistré","La question ne s''affichera pas"],
   "answer":1,
   "explain":"Le formulaire fonctionnera très bien — c''est le piège. Mais « 24 » arrivera comme du texte : impossible de filtrer les 6-59 mois ni de calculer une moyenne sans nettoyage. Le type se choisit en pensant à l''analyse."}
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND (l.title ILIKE '%ajouter une question%' OR l.title ILIKE '%les bases%')
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"type":"exercise"}]'::jsonb;

-- ── Leçon 3 — Choisir le bon type de réponse ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
  {"type":"md","content":"## À vous de jouer\n\nVoici les cinq informations à collecter pour chaque enfant. Attribuez le bon type à chacune."},
  {"type":"exercise","id":"l3e1","kind":"text","title":"Position de la concession",
   "prompt":"Quel type XLSForm enregistre les coordonnées GPS du lieu de la mesure ?",
   "answer":"geopoint","accept":["geopoint","geo point"],
   "explain":"**geopoint** capture latitude, longitude, altitude et précision. C''est ce qui permettra plus tard de cartographier vos cas dans QGIS."},
  {"type":"exercise","id":"l3e2","kind":"choice","title":"Le MUAC",
   "prompt":"Le MUAC se mesure au millimètre près, avec une décimale (ex. 124,5 mm). Quel type choisissez-vous ?",
   "opts":["integer","decimal","text","range"],
   "answer":1,
   "hint":"Que se passe-t-il avec 124,5 si vous choisissez un type sans décimale ?",
   "explain":"**decimal**. Avec *integer*, 124,5 serait tronqué ou refusé — or c''est précisément autour de 125 mm que se joue la frontière entre MAM et enfant normal. Une décimale perdue, c''est un cas mal classé."},
  {"type":"exercise","id":"l3e3","kind":"text","title":"Le sexe de l''enfant",
   "prompt":"L''enquêteur doit cocher une seule réponse parmi Masculin / Féminin. Quel type de question utilisez-vous ? (donnez le mot-clé XLSForm)",
   "answer":"select_one","accept":["select_one","select one","selectone"],
   "explain":"**select_one** (suivi du nom de la liste, ex. `select_one sexe`, définie dans l''onglet *choices*). Pour plusieurs réponses simultanées, ce serait *select_multiple*."},
  {"type":"exercise","id":"l3e4","kind":"choice","title":"La photo du bracelet",
   "prompt":"Vous voulez garder une preuve visuelle de la lecture du bracelet MUAC pour le contrôle qualité. Quel type ?",
   "opts":["file","image","text","note"],
   "answer":1,
   "explain":"**image** ouvre l''appareil photo du téléphone et attache le cliché à la soumission. *note* n''enregistre rien : c''est une simple consigne affichée à l''enquêteur."}
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%type de réponse%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"type":"exercise"}]'::jsonb;

-- ── Leçon 4 — Rendre le formulaire intelligent (validation & logique) ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
  {"type":"md","content":"## À vous de jouer\n\nUn enquêteur fatigué tape 1250 au lieu de 125,0. Votre formulaire doit l''arrêter sur place — pas trois semaines plus tard pendant l''analyse."},
  {"type":"exercise","id":"l4e1","kind":"choice","title":"Borner l''âge",
   "prompt":"Votre enquête ne concerne que les 6-59 mois. Quelle expression écrivez-vous dans la colonne *constraint* de la question âge ?",
   "opts":["age >= 6 and age <= 59",". >= 6 and . <= 59","${age} > 6","between(6,59)"],
   "answer":1,
   "hint":"Dans une contrainte, comment désigne-t-on la valeur que l''on est en train de saisir ?",
   "explain":"Le point **.** représente la réponse en cours de saisie : `. >= 6 and . <= 59`. On n''utilise `${autre_question}` que pour se référer à une AUTRE question du formulaire."},
  {"type":"exercise","id":"l4e2","kind":"text","title":"Afficher au bon moment",
   "prompt":"La question « nombre de grossesses » ne doit apparaître que si le sexe saisi est féminin. Quelle colonne XLSForm porte cette condition ?",
   "answer":"relevant","accept":["relevant","relevance"],
   "explain":"La colonne **relevant**, ici `${sexe} = ''f''`. La question disparaît de l''écran quand la condition est fausse — l''enquêteur va plus vite et ne peut pas la remplir par erreur."},
  {"type":"exercise","id":"l4e3","kind":"number","title":"Fixer la borne haute",
   "prompt":"Le MUAC d''un enfant de moins de 5 ans ne dépasse jamais 200 mm. Quelle valeur maximale mettez-vous dans la contrainte pour bloquer la saisie de 1250 ?",
   "answer":200,"tolerance":50,"unit":"mm",
   "hint":"Assez large pour ne jamais refuser une vraie mesure, assez serré pour attraper une faute de frappe d''un facteur 10.",
   "explain":"Autour de **200 mm** : `. >= 60 and . <= 200`. La règle est de borner au physiquement possible, pas au statistiquement courant — sinon vous refuseriez les cas extrêmes qui sont justement ceux qui vous intéressent."},
  {"type":"exercise","id":"l4e4","kind":"choice","title":"Contrainte ou message",
   "prompt":"Votre contrainte bloque bien la saisie, mais les enquêteurs vous appellent sans comprendre pourquoi. Qu''avez-vous oublié ?",
   "opts":["La colonne constraint_message","La colonne required","La colonne calculation","Le redéploiement du formulaire"],
   "answer":0,
   "explain":"**constraint_message** affiche le texte que lit l''enquêteur quand sa saisie est refusée, par exemple « Le MUAC doit être compris entre 60 et 200 mm — vérifiez la virgule ». Une contrainte muette est vécue comme un bug."}
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%validation%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"type":"exercise"}]'::jsonb;

-- ── Leçon 5 — Déployer le formulaire et lancer la collecte ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
  {"type":"md","content":"## À vous de jouer\n\nLe formulaire est prêt. Les 8 téléphones sont sur la table. Départ terrain demain matin."},
  {"type":"exercise","id":"l5e1","kind":"choice","title":"Configurer les téléphones",
   "prompt":"Sur chaque téléphone Android, quelle étape conditionne tout le reste avant de pouvoir récupérer le formulaire ?",
   "opts":["Installer PostgreSQL","Renseigner l''URL du serveur KoboToolbox et les identifiants dans les paramètres","Activer le Bluetooth","Créer un compte Gmail par enquêteur"],
   "answer":1,
   "explain":"KoboCollect a besoin de savoir à quel serveur parler. Sans l''URL et le compte, « Get Blank Form » reste désespérément vide."},
  {"type":"exercise","id":"l5e2","kind":"choice","title":"Le test qui évite la catastrophe",
   "prompt":"Il vous reste une heure avant le départ. Quel test faites-vous en priorité ?",
   "opts":["Remplir un questionnaire complet de bout en bout et vérifier qu''il arrive sur le serveur","Relire le fichier XLSForm ligne par ligne","Vérifier le niveau de batterie des téléphones","Imprimer les questionnaires en secours"],
   "answer":0,
   "hint":"Qu''est-ce qui ne se rattrape plus une fois les équipes parties à 3 heures de route ?",
   "explain":"Un aller-retour complet — saisie, envoi, réception sur le serveur — teste d''un coup le formulaire, la configuration des téléphones, le compte et la connexion. Relire le XLSForm ne prouve rien sur la chaîne de transmission."},
  {"type":"exercise","id":"l5e3","kind":"choice","title":"Modifier après le départ",
   "prompt":"Jour 3 : vous corrigez une faute de frappe dans un label et vous redéployez. Que deviennent les données déjà collectées ?",
   "opts":["Elles sont effacées","Elles restent, mais les téléphones doivent récupérer la nouvelle version du formulaire","Elles sont automatiquement corrigées","Le projet doit être recréé"],
   "answer":1,
   "explain":"Les soumissions déjà envoyées ne bougent pas. En revanche chaque enquêteur doit re-télécharger le formulaire, sinon vous vous retrouvez avec deux versions sur le terrain — cause classique de colonnes en double à l''analyse."}
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND (l.title ILIKE '%déployer%' OR l.title ILIKE '%lancer la collecte%')
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"type":"exercise"}]'::jsonb;

-- ── Leçon 6 — Collecter sur le terrain avec KoboCollect ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
  {"type":"md","content":"## À vous de jouer\n\nJour 4. Un enquêteur vous appelle depuis un village sans réseau, un autre vous envoie ses chiffres du jour."},
  {"type":"exercise","id":"l6e1","kind":"choice","title":"Zone blanche",
   "prompt":"Votre enquêteur est dans un village sans aucun réseau. Que lui dites-vous de faire ?",
   "opts":["Arrêter la collecte et revenir","Continuer normalement : les questionnaires sont enregistrés sur le téléphone et partiront dès le retour du réseau","Noter les réponses sur papier puis ressaisir le soir","Utiliser le SMS"],
   "answer":1,
   "explain":"KoboCollect est conçu pour le hors-ligne : les soumissions attendent dans « Envoyer le formulaire finalisé » et partent au premier retour de réseau. La double saisie papier est exactement la perte de temps et la source d''erreurs que l''outil supprime."},
  {"type":"exercise","id":"l6e2","kind":"number","title":"Suivre l''avancement",
   "prompt":"Fin de journée 4 : le serveur affiche 187 soumissions reçues sur les 200 prévues. Quel est votre taux de complétude, en pourcentage ?",
   "answer":93.5,"tolerance":0.5,"unit":"%",
   "hint":"Reçues divisé par prévues, multiplié par 100.",
   "explain":"187 / 200 × 100 = **93,5 %**. C''est l''indicateur que vous suivez chaque soir : il déclenche vos décisions (prolonger d''un jour, redéployer une équipe) pendant qu''il est encore temps d''agir."},
  {"type":"exercise","id":"l6e3","kind":"choice","title":"Contrôle qualité quotidien",
   "prompt":"En regardant les données du jour, vous voyez qu''un enquêteur a saisi exactement 125,0 mm pour ses 12 derniers enfants. Que faites-vous ?",
   "opts":["Rien, la valeur est dans les bornes autorisées","Vous l''appelez le soir même pour comprendre et re-contrôler quelques cas","Vous supprimez ses données","Vous attendez la fin de la collecte pour en parler"],
   "answer":1,
   "hint":"Une contrainte valide la plausibilité d''une valeur, pas l''honnêteté ni le soin de la mesure.",
   "explain":"Douze valeurs identiques pile sur le seuil, c''est le signal classique d''un bracelet mal lu ou d''une saisie inventée. Aucune contrainte ne peut l''attraper : seul le suivi quotidien le peut, et il faut agir tant que l''équipe est encore sur zone."}
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND l.title ILIKE '%avec kobocollect%'
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"type":"exercise"}]'::jsonb;

-- ── Leçon 7 — Récupérer et analyser les données (capstone) ──
UPDATE sms_lessons SET content = jsonb_set(content, '{cells}', (content->'cells') || '[
  {"type":"md","content":"## Votre livrable\n\nLes 200 questionnaires sont rentrés. Dépouillement : **16 enfants sous 115 mm** (MAS) et **36 enfants entre 115 et 125 mm** (MAM). Produisez les chiffres que le bailleur attend."},
  {"type":"exercise","id":"l7e1","kind":"number","title":"Prévalence de la MAS",
   "prompt":"Quelle est la prévalence de la malnutrition aiguë sévère, en pourcentage des 200 enfants enquêtés ?",
   "answer":8,"tolerance":0.2,"unit":"%",
   "explain":"16 / 200 × 100 = **8 %**. Le seuil d''urgence SPHERE pour la MAS est de 2 % : vous êtes quatre fois au-dessus."},
  {"type":"exercise","id":"l7e2","kind":"number","title":"Prévalence de la MAG",
   "prompt":"Quelle est la prévalence de la malnutrition aiguë GLOBALE (MAS + MAM) ?",
   "answer":26,"tolerance":0.5,"unit":"%",
   "hint":"La MAG additionne les cas sévères et les cas modérés.",
   "explain":"(16 + 36) / 200 × 100 = **26 %**. C''est le chiffre qui ouvre le rapport : au-delà de 15 %, la situation est classée en urgence nutritionnelle."},
  {"type":"exercise","id":"l7e3","kind":"choice","title":"Votre conclusion",
   "prompt":"Le seuil d''urgence SPHERE pour la MAG est de 15 %. Que concluez-vous dans votre note au bailleur ?",
   "opts":["Situation sous contrôle, poursuivre le suivi de routine","Seuil d''urgence dépassé : déclencher une réponse nutritionnelle et alerter le cluster","Échantillon trop petit pour conclure quoi que ce soit","Refaire l''enquête avant toute décision"],
   "answer":1,
   "explain":"26 % contre un seuil de 15 % : le dépassement est massif et sans ambiguïté. Le rôle du MEAL n''est pas seulement de mesurer, mais de transformer la mesure en décision — ici, alerte et réponse."},
  {"type":"exercise","id":"l7e4","kind":"text","title":"Désagréger par district",
   "prompt":"Le bailleur veut la prévalence district par district. Quelle méthode pandas utilisez-vous pour agréger votre DataFrame par la colonne district ?",
   "answer":"groupby","accept":["groupby","group by","df.groupby","groupby()"],
   "explain":"**groupby** : `df.groupby(''district'')[''statut''].value_counts()`. La moyenne nationale cache toujours des écarts entre districts — et c''est sur ces écarts que se décide où envoyer les équipes."}
]'::jsonb)
WHERE id = (
  SELECT l.id FROM sms_lessons l
  WHERE l.course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01')
    AND (l.title ILIKE '%analyser les données%' OR l.title ILIKE '%indicateurs nutritionnels%')
  ORDER BY l.order_index LIMIT 1
)
  AND NOT (content->'cells') @> '[{"type":"exercise"}]'::jsonb;

-- ── Rapport ──
-- Un UPDATE qui ne touche aucune ligne affiche « Success. No rows returned », exactement
-- comme un UPDATE réussi : ce SELECT final rend le résultat visible. La colonne
-- « exercices » doit être > 0 sur chaque leçon.
SELECT l.order_index AS lecon,
       l.title,
       jsonb_array_length(
         jsonb_path_query_array(l.content->'cells', '$[*] ? (@.type == "exercise")')
       ) AS exercices
FROM sms_lessons l
JOIN sms_courses c ON c.id = l.course_id
WHERE c.code = 'MEAL-01'
ORDER BY l.order_index;
