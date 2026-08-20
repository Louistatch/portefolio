-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Remise en ordre des cellules de leçon
--
-- PROBLÈME
-- Les apports successifs (support KoboToolbox de Kara, exercices MEAL, exercices
-- Kobo) ont été AJOUTÉS À LA SUITE du contenu existant. Une leçon de MEAL-01 se
-- lisait donc :
--     cours → exercices → ENCORE du cours → ENCORE des exercices
-- L'étudiant répondait à des questions notées, puis retombait sur du cours, alors
-- que la validation exige de toute façon d'avoir répondu à TOUS les exercices
-- avant de soumettre sa copie. D'où l'impression que « les cours ne se suivent
-- pas ».
--
-- Le désordre était double :
--   1. les exercices coupaient le cours en deux ;
--   2. le cours lui-même était mal ordonné — la leçon 1 présentait l'outil puis
--      annonçait neuf cellules plus loin « Le métier, avant l'outil » ; la leçon 2
--      montrait le constructeur de formulaire avant « le travail préliminaire ».
--
-- CE QUE FAIT CE SCRIPT
--   A. Ordre du cours — pour les 7 leçons de MEAL-01, la table `plan` ci-dessous
--      fixe l'ordre pédagogique : le concept avant l'outil, le préparatoire avant
--      le manipulatoire, la marche à suivre numérotée d'un seul tenant.
--   B. Place des exercices — dans TOUTE leçon publiée, chaque bloc d'exercices
--      part en fin de leçon, en gardant son propre chapeau de mise en situation
--      (« ## À vous de jouer… », « ## Votre livrable »). Les deux blocs de MEAL-01
--      (scénario nutrition de Lomé, puis scénario espaces verts de Kara) restent
--      donc distincts et gardent chacun son énoncé.
--
-- GARANTIES
--   • Aucune cellule n'est ajoutée, supprimée ni modifiée : seul l'ordre change.
--   • Une cellule que `plan` ne connaît pas n'est jamais perdue — elle est
--     reléguée en fin de partie cours, dans son ordre d'origine. Les cours sans
--     plan (MEAL-02, MEAL-03) gardent donc leur ordre de cours intact et ne
--     bénéficient que du point B.
--   • Les leçons sans exercice (TOF-FIN-01) ne sont pas touchées du tout.
--   • Script idempotent : le rejouer laisse une leçon déjà en ordre inchangée
--     (garde `IS DISTINCT FROM`), et l'ordre produit est un point fixe.
--
-- RÈGLE À RESPECTER POUR TOUT NOUVEL APPORT
--   1. tout le cours ; 2. le chapeau de mise en situation ; 3. les exercices notés.
--   Si vous ajoutez du cours à une leçon de MEAL-01, ajoutez aussi sa clé dans
--   `plan`, sinon il atterrira en fin de partie cours.
-- ════════════════════════════════════════════════════════════════

WITH plan(code, lecon, rang, cle) AS (VALUES
  -- ── MEAL-01 leçon 1 — Comprendre la collecte : le métier d'abord, l'outil ensuite
  ('MEAL-01', 1,  1, 'md|## Votre mission'),
  ('MEAL-01', 1,  2, 'md|## Le métier, avant l''outil'),
  ('MEAL-01', 1,  3, 'callout|Toute cette formation s''appuie sur un projet réel'),
  ('MEAL-01', 1,  4, 'md|### Les quatre méthodes de collecte'),
  ('MEAL-01', 1,  5, 'md|### Deux familles de données'),
  ('MEAL-01', 1,  6, 'callout|Le type de donnée détermine'),
  ('MEAL-01', 1,  7, 'callout|Avant les outils numériques'),
  ('MEAL-01', 1,  8, 'md|## Les 3 grandes étapes de toute collecte'),
  ('MEAL-01', 1,  9, 'figure|Étape 1 — Créer un nouveau projet'),
  ('MEAL-01', 1, 10, 'resource|Créer un compte KoboToolbox gratuit'),
  ('MEAL-01', 1, 11, 'quiz|'),

  -- ── MEAL-01 leçon 2 — Le constructeur : le guide d'entretien se prépare avant
  ('MEAL-01', 2,  1, 'md|## Le guide d''entretien : le travail préliminaire'),
  ('MEAL-01', 2,  2, 'callout|L''identification correspond au quartier'),
  ('MEAL-01', 2,  3, 'md|### Le guide réellement utilisé à Kara'),
  ('MEAL-01', 2,  4, 'callout|Chaque question ajoutée coûte du temps'),
  ('MEAL-01', 2,  5, 'md|## Le Formbuilder, votre atelier'),
  ('MEAL-01', 2,  6, 'figure|Le constructeur de formulaire'),
  ('MEAL-01', 2,  7, 'callout|Rédigez vos questions exactement'),
  ('MEAL-01', 2,  8, 'md|## Le nom technique'),
  ('MEAL-01', 2,  9, 'quiz|'),

  -- ── MEAL-01 leçon 3 — Types de réponse : la typologie, puis sa traduction Kobo
  ('MEAL-01', 3,  1, 'md|## Le type de réponse : la décision la plus importante'),
  ('MEAL-01', 3,  2, 'md|## Quatre types de questions, et pas un de plus'),
  ('MEAL-01', 3,  3, 'md|### Comment KoboToolbox traduit ces types'),
  ('MEAL-01', 3,  4, 'image|Menu de sélection du type de question'),
  ('MEAL-01', 3,  5, 'figure|Les principaux types de réponse'),
  ('MEAL-01', 3,  6, 'md|## Quel type pour quelle donnée ?'),
  ('MEAL-01', 3,  7, 'callout|Chaque fois que vous pouvez prévoir'),
  ('MEAL-01', 3,  8, 'callout|Une superficie saisie en'),
  ('MEAL-01', 3,  9, 'quiz|'),

  -- ── MEAL-01 leçon 4 — Formulaire intelligent : le panneau de réglages, puis
  --    les deux mécanismes qu'on y règle (validation, skip logic)
  ('MEAL-01', 4,  1, 'md|## Empêcher les erreurs AVANT qu''elles arrivent'),
  ('MEAL-01', 4,  2, 'figure|Les réglages avancés d''une question'),
  ('MEAL-01', 4,  3, 'md|## Paramétrer chaque question'),
  ('MEAL-01', 4,  4, 'image|Panneau de paramètres d''une question'),
  ('MEAL-01', 4,  5, 'md|### Les quatre options qui comptent'),
  ('MEAL-01', 4,  6, 'callout|Renommer un champ après le déploiement'),
  ('MEAL-01', 4,  7, 'md|## 1. Validation'),
  ('MEAL-01', 4,  8, 'callout|On écrit'),
  ('MEAL-01', 4,  9, 'md|## 2. Skip logic'),
  ('MEAL-01', 4, 10, 'embed|Notebook live : tester votre logique de validation'),
  ('MEAL-01', 4, 11, 'quiz|'),

  -- ── MEAL-01 leçon 5 — Déploiement : la marche à suivre « étapes 1 à 8 » d'un
  --    seul tenant, puis le choix du canal de collecte
  ('MEAL-01', 5,  1, 'md|## KoboToolbox : la plateforme'),
  ('MEAL-01', 5,  2, 'image|kobotoolbox.org'),
  ('MEAL-01', 5,  3, 'resource|Créer un compte KoboToolbox'),
  ('MEAL-01', 5,  4, 'md|### Deux formules de compte'),
  ('MEAL-01', 5,  5, 'image|Choix du type de compte'),
  ('MEAL-01', 5,  6, 'md|## De l''inscription au déploiement, en 8 étapes'),
  ('MEAL-01', 5,  7, 'md|### Étape 1 — Accéder à KoboToolbox'),
  ('MEAL-01', 5,  8, 'image|Étape 1 — la recherche'),
  ('MEAL-01', 5,  9, 'md|### Étape 2 — Ouvrir un compte'),
  ('MEAL-01', 5, 10, 'image|Étape 2 — le formulaire d''inscription'),
  ('MEAL-01', 5, 11, 'callout|Le nom d''utilisateur et le mot de passe'),
  ('MEAL-01', 5, 12, 'md|### Étape 3 — Confirmer son inscription'),
  ('MEAL-01', 5, 13, 'image|Étape 3 — compte créé'),
  ('MEAL-01', 5, 14, 'image|Étape 3 — l''e-mail d''activation'),
  ('MEAL-01', 5, 15, 'md|### Étape 4 — Prendre en main le tableau de bord'),
  ('MEAL-01', 5, 16, 'image|Étape 4 — le tableau de bord'),
  ('MEAL-01', 5, 17, 'md|### Étape 5 — Créer un nouveau projet'),
  ('MEAL-01', 5, 18, 'image|Étape 5 — nouveau projet'),
  ('MEAL-01', 5, 19, 'image|Étape 5 — partir d''une page vierge'),
  ('MEAL-01', 5, 20, 'md|### Étape 6 — Construire le questionnaire'),
  ('MEAL-01', 5, 21, 'image|Étape 6 — le questionnaire en construction'),
  ('MEAL-01', 5, 22, 'md|### Étape 7 — Paramétrer chaque question'),
  ('MEAL-01', 5, 23, 'md|### Étape 8 — Sauvegarder et déployer'),
  ('MEAL-01', 5, 24, 'image|Étape 8 — déployer'),
  ('MEAL-01', 5, 25, 'image|Étape 8 — projet déployé'),
  ('MEAL-01', 5, 26, 'md|## Du brouillon au terrain'),
  ('MEAL-01', 5, 27, 'figure|Étape de déploiement (onglet FORM'),
  ('MEAL-01', 5, 28, 'md|## Web ou application mobile ?'),
  ('MEAL-01', 5, 29, 'callout|Dans beaucoup de zones rurales'),
  ('MEAL-01', 5, 30, 'resource|Télécharger l''app KoboCollect'),
  ('MEAL-01', 5, 31, 'quiz|'),

  -- ── MEAL-01 leçon 6 — Terrain : le cadrage, la marche à suivre « étapes 9 à 13 »
  --    d'un seul tenant, puis le point GPS qui prépare MEAL-02
  ('MEAL-01', 6,  1, 'md|## L''enquêteur en action'),
  ('MEAL-01', 6,  2, 'figure|Le parcours de collecte sur mobile'),
  ('MEAL-01', 6,  3, 'md|## L''application qui va sur le terrain'),
  ('MEAL-01', 6,  4, 'md|### Étape 9 — Installer KoboCollect'),
  ('MEAL-01', 6,  5, 'image|Étape 9 — rechercher'),
  ('MEAL-01', 6,  6, 'image|Étape 9 — l''application officielle'),
  ('MEAL-01', 6,  7, 'image|Étape 9 — écran d''accueil'),
  ('MEAL-01', 6,  8, 'md|### Étape 10 — Configurer le serveur'),
  ('MEAL-01', 6,  9, 'image|Étape 10 — paramètres du projet'),
  ('MEAL-01', 6, 10, 'image|Étape 10 — écran Serveur'),
  ('MEAL-01', 6, 11, 'image|Étape 10 — saisie de l''URL'),
  ('MEAL-01', 6, 12, 'md|### Étape 11 — Télécharger le formulaire vierge'),
  ('MEAL-01', 6, 13, 'image|Étape 11 — sélection du formulaire'),
  ('MEAL-01', 6, 14, 'image|Étape 11 — téléchargement réussi'),
  ('MEAL-01', 6, 15, 'md|### Étape 12 — Remplir un formulaire sur le terrain'),
  ('MEAL-01', 6, 16, 'image|Étape 12 — remplir un formulaire'),
  ('MEAL-01', 6, 17, 'image|Étape 12 — enregistrer et finaliser'),
  ('MEAL-01', 6, 18, 'callout|Si la case'),
  ('MEAL-01', 6, 19, 'md|### Étape 13 — Envoyer les données collectées'),
  ('MEAL-01', 6, 20, 'image|Étape 13 — sélection des envois'),
  ('MEAL-01', 6, 21, 'image|Étape 13 — envoi en cours'),
  ('MEAL-01', 6, 22, 'md|## Le champ GPS : la clé de la cartographie'),
  ('MEAL-01', 6, 23, 'callout|Grâce aux validations que vous avez configurées'),
  ('MEAL-01', 6, 24, 'quiz|'),

  -- ── MEAL-01 leçon 7 — Capstone : sortir les données, puis les analyser, puis
  --    le bilan du cycle complet
  ('MEAL-01', 7,  1, 'md|## Les données arrivent !'),
  ('MEAL-01', 7,  2, 'figure|Visualiser les données reçues'),
  ('MEAL-01', 7,  3, 'md|## Du serveur au fichier exploitable'),
  ('MEAL-01', 7,  4, 'image|Les soumissions reçues'),
  ('MEAL-01', 7,  5, 'md|### Exporter au format CSV'),
  ('MEAL-01', 7,  6, 'image|Choix du format d''export'),
  ('MEAL-01', 7,  7, 'image|Récupérer le fichier'),
  ('MEAL-01', 7,  8, 'md|### Ouvrir et analyser sous Excel'),
  ('MEAL-01', 7,  9, 'image|Le fichier ouvert dans Excel'),
  ('MEAL-01', 7, 10, 'md|### Le processus complet, en 8 étapes'),
  ('MEAL-01', 7, 11, 'callout|Le projet'),
  ('MEAL-01', 7, 12, 'md|## De la donnée brute à la décision'),
  ('MEAL-01', 7, 13, 'embed|Notebook live : analyser vos données KoboCollect'),
  ('MEAL-01', 7, 14, 'resource|pykobo'),
  ('MEAL-01', 7, 15, 'resource|KoboToolbox Academy'),
  ('MEAL-01', 7, 16, 'callout|Vous maîtrisez désormais le cycle complet')
),

-- Chaque cellule, avec sa clé stable (type + première ligne) et deux drapeaux.
-- Un « chapeau » est la cellule md qui introduit immédiatement un exercice :
-- c'est elle qui porte la mise en situation, elle voyage donc avec son bloc.
cellules AS (
  SELECT l.id AS lesson_id, c.code, l.order_index AS lecon, t.ord, t.e,
         (t.e->>'type') = 'exercise' AS est_exo,
         ((t.e->>'type') = 'md'
          AND lead(t.e->>'type') OVER (PARTITION BY l.id ORDER BY t.ord) = 'exercise') AS est_chapeau,
         t.e->>'type' || '|' || coalesce(
           nullif(split_part(t.e->>'content', chr(10), 1), ''),
           t.e->>'title', t.e->>'id', '') AS cle
  FROM sms_lessons l
  JOIN sms_courses c ON c.id = l.course_id
  CROSS JOIN LATERAL jsonb_array_elements(l.content->'cells') WITH ORDINALITY t(e, ord)
  WHERE c.is_published
),

-- Numéro de bloc : 0 avant le premier chapeau, puis 1, 2… Le chapeau porte le
-- numéro de son propre bloc, donc il précède ses exercices dans le tri final.
blocs AS (
  SELECT *, count(*) FILTER (WHERE est_chapeau)
              OVER (PARTITION BY lesson_id ORDER BY ord ROWS UNBOUNDED PRECEDING) AS bloc
  FROM cellules
),

-- Rang du plan, ou « après tout le reste, dans l'ordre d'origine » si inconnu.
classees AS (
  SELECT b.*, coalesce(p.rang, 1000 + b.ord) AS rang
  FROM blocs b
  LEFT JOIN plan p
    ON p.code = b.code AND p.lecon = b.lecon AND b.cle LIKE p.cle || '%'
),

partie_cours AS (
  SELECT lesson_id, jsonb_agg(e ORDER BY rang, ord) AS arr
  FROM classees WHERE NOT est_exo AND NOT est_chapeau GROUP BY lesson_id
),
partie_exos AS (
  SELECT lesson_id, jsonb_agg(e ORDER BY bloc, ord) AS arr
  FROM classees WHERE est_exo OR est_chapeau GROUP BY lesson_id
),
resultat AS (
  SELECT c.lesson_id, c.arr || e.arr AS cells
  FROM partie_cours c JOIN partie_exos e USING (lesson_id)
)
UPDATE sms_lessons l
SET content = jsonb_set(l.content, '{cells}', r.cells)
FROM resultat r
WHERE r.lesson_id = l.id
  AND l.content->'cells' IS DISTINCT FROM r.cells;

-- ── Rapport ─────────────────────────────────────────────────────────────────
-- La colonne `etat` doit valoir « OK » ou « sans exercice » sur TOUTES les lignes.
--
-- Le critère est `cours_apres_exo` = 0 : aucune cellule de cours ne subsiste
-- après le premier exercice. Attention, on ne peut pas simplement comparer
-- « premier exercice » et « dernière cellule non-exercice » : les chapeaux de
-- mise en situation sont des cellules md qui se trouvent LÉGITIMEMENT entre deux
-- blocs d'exercices, et fausseraient la comparaison. Ils sont donc exclus, au
-- même titre que les exercices.
WITH cellules AS (
  SELECT c.code, l.order_index AS lecon, l.title, t.ord,
         (t.e->>'type') = 'exercise' AS est_exo,
         ((t.e->>'type') = 'md'
          AND lead(t.e->>'type') OVER (PARTITION BY l.id ORDER BY t.ord) = 'exercise') AS est_chapeau,
         min(t.ord) FILTER (WHERE t.e->>'type' = 'exercise') OVER (PARTITION BY l.id) AS premier_exo,
         count(*) FILTER (WHERE t.e->>'type' = 'exercise') OVER (PARTITION BY l.id) AS nb_exos,
         count(*) OVER (PARTITION BY l.id) AS nb_cells
  FROM sms_lessons l JOIN sms_courses c ON c.id = l.course_id
  CROSS JOIN LATERAL jsonb_array_elements(l.content->'cells') WITH ORDINALITY t(e, ord)
  WHERE c.is_published
)
SELECT code, lecon, left(title, 36) AS titre,
       max(nb_cells) AS cellules, max(nb_exos) AS exos,
       count(*) FILTER (WHERE est_chapeau) AS chapeaux,
       count(*) FILTER (WHERE NOT est_exo AND NOT est_chapeau AND ord > premier_exo) AS cours_apres_exo,
       CASE WHEN max(nb_exos) = 0 THEN 'sans exercice'
            WHEN count(*) FILTER (WHERE NOT est_exo AND NOT est_chapeau AND ord > premier_exo) = 0
            THEN 'OK' ELSE '*** DESORDRE ***' END AS etat
FROM cellules
GROUP BY code, lecon, title
ORDER BY code, lecon;
