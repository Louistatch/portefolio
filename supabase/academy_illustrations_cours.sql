-- academy_illustrations_cours.sql
-- ─────────────────────────────────────────────────────────────
-- Illustrations pédagogiques des cours (SVG servis par le site).
--
-- MEAL-02 (QGIS) et MEAL-03 étaient 100 % texte : une formation
-- à la cartographie sans une seule image. Les cinq leçons QGIS
-- reçoivent chacune un schéma ; la leçon « Générer le rapport »
-- de MEAL-03 reçoit le schéma du pipeline. Le cours TOF-FIN-01
-- (formation de formateurs ruraux, public souvent peu lecteur)
-- reçoit cinq visuels de gestion financière paysanne.
--
-- Les fichiers vivent dans client/public/academy/{qgis,meal,tof}
-- et sont servis par le site (comme les captures Kobo).
--
-- Placement : chaque image s'insère AVANT le premier quiz ou
-- exercice (règle du dépôt : le cours d'abord, les questions à
-- la fin). Idempotent : une leçon qui possède déjà le visuel est
-- ignorée, le script peut être rejoué sans doublon.
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
    r RECORD;
    pos INTEGER;
    cell JSONB;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            (35, '/academy/qgis/qgis-interface.svg',
             'L''interface de QGIS, d''un coup d''œil',
             'Trois zones suffisent pour démarrer : le panneau des couches (1), la zone de la carte (2) et la barre d''état (3). L''ordre des couches dans le panneau = l''ordre de dessin sur la carte.'),
            (36, '/academy/qgis/qgis-kobo-import.svg',
             'De KoboCollect à la carte',
             'Chaque enquête Kobo enregistre ses coordonnées GPS. Exportée en CSV puis glissée dans QGIS, elle devient une couche de points : chaque réponse de terrain est un point sur la carte.'),
            (37, '/academy/qgis/qgis-projection.svg',
             'La Terre est ronde, la carte est plate',
             'Toute projection déforme quelque chose — les angles, les surfaces ou les distances. On choisit selon l''usage : WGS 84 (degrés) pour les coordonnées GPS, UTM (mètres) pour mesurer des distances.'),
            (38, '/academy/qgis/qgis-attribute-table.svg',
             'Chaque point de la carte est une ligne du tableau',
             'La table attributaire relie la géométrie aux données : sélectionner un point sur la carte surligne sa ligne dans le tableau, et toutes les réponses de l''enquête s''affichent.'),
            (39, '/academy/qgis/qgis-buffer.svg',
             'Le tampon : la zone à moins de X mètres',
             'Vecteur → Géotraitements → Tampon. Le tampon répond aux questions « à moins de… » : quels villages sont à moins de 1 km d''une école ? L''unité suit le système de coordonnées de la couche.'),
            (40, '/academy/qgis/qgis-symbology.svg',
             'Une même donnée, trois façons de la faire parler',
             'Taille proportionnelle pour des effectifs, dégradé pour une intensité, couleur par catégorie pour des types. Règle : jamais plus de 5-7 catégories, et toujours une légende.'),
            (45, '/academy/meal/meal-report-pipeline.svg',
             'Le rapport qui se met à jour tout seul',
             'Le pipeline enchaîne les données Kobo, le moteur d''analyse et les trois sorties — tableur, cartes, PDF. Quand les données changent, le rapport change : c''est un produit du pipeline, pas un document écrit à la main.'),
            (49, '/academy/tof/tof-flux-argent.svg',
             'D''où vient l''argent, où va-t-il ?',
             'Premier exercice de toute session : dessiner le cycle de l''argent du ménage. La récolte se vend une fois, les dépenses courent toute l''année — le dessiner, c''est déjà reprendre la main.'),
            (50, '/academy/tof/tof-budget.svg',
             'Le budget familial : deux colonnes, un équilibre',
             'Entrées d''un côté, sorties de l''autre, et un solde à décider ensemble — épargne, investissement ou remboursement — avant qu''il ne fonde. À refaire avec les vrais chiffres du groupe.'),
            (52, '/academy/tof/tof-cout-production.svg',
             'Combien coûte vraiment un sac de maïs ?',
             'Semences, engrais, main-d''œuvre, transport : le coût de production se calcule poste par poste. La marge réelle apparaît quand on compare au prix de vente — sans oublier le temps de travail du ménage.'),
            (53, '/academy/tof/tof-calendrier-campagne.svg',
             'Une campagne, douze mois à financer',
             'L''argent rentre à la récolte, mais il doit tenir douze mois. Le calendrier montre où est le creux (avril-août) — et c''est ce creux que le budget et l''épargne doivent préparer.'),
            (56, '/academy/tof/tof-risques.svg',
             'La carte des risques du village',
             'Un risque se gère deux fois : avant (le prévenir) et après (le traverser sans tout perdre). Classer fréquence × gravité, puis décider ensemble ce qu''on fait pour les trois premiers.')
        ) AS t(lecon, src, titre, legende)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM sms_lessons l, jsonb_array_elements(l.content->'cells') c
            WHERE l.id = r.lecon AND c->>'src' = r.src
        ) THEN
            cell := jsonb_build_object('type', 'image', 'src', r.src, 'title', r.titre, 'caption', r.legende);
            SELECT COALESCE(
                (SELECT min(ord) - 1
                 FROM sms_lessons l, jsonb_array_elements(l.content->'cells') WITH ORDINALITY c(el, ord)
                 WHERE l.id = r.lecon AND c.el->>'type' IN ('quiz', 'exercise')),
                jsonb_array_length((SELECT l2.content->'cells' FROM sms_lessons l2 WHERE l2.id = r.lecon))
            ) INTO pos;
            UPDATE sms_lessons l
            SET content = jsonb_set(
                l.content, '{cells}',
                jsonb_insert(l.content->'cells', ARRAY[pos::text], cell, false)
            )
            WHERE l.id = r.lecon;
            RAISE NOTICE 'Leçon % : illustration ajoutée (%)', r.lecon, r.src;
        ELSE
            RAISE NOTICE 'Leçon % : illustration déjà présente, ignorée', r.lecon;
        END IF;
    END LOOP;
END $$;
