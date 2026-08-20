-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — État civil décomposé pour les documents officiels
--
-- Les attestations et certificats sont des documents nominatifs : ils doivent
-- porter le nom complet de la personne. Jusqu'ici l'inscription ne demandait
-- qu'un champ libre « Nom complet », rempli comme chacun l'entendait — une
-- étudiante n'y avait mis que son nom de famille, son attestation ne portait
-- donc que celui-là.
--
-- On ajoute prénom / deuxième prénom / nom. `full_name` est conservé (il sert
-- partout : accueil du tableau de bord, emails, écran admin) et reste dérivé
-- de ces trois champs à chaque enregistrement.
--
-- AUCUN remplissage automatique : découper « Tchamie Romuald BOUWASSI » ou
-- « Louis Issodo » relèverait de la devinette, et se tromper sur le nom d'une
-- personne dans un document officiel n'est pas rattrapable. Les comptes
-- existants gardent leur full_name comme repli, et l'interface les invite à
-- compléter leur état civil.
--
-- À exécuter dans Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE students ADD COLUMN IF NOT EXISTS first_name  TEXT;  -- prénom
ALTER TABLE students ADD COLUMN IF NOT EXISTS middle_name TEXT;  -- deuxième prénom (facultatif)
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_name   TEXT;  -- nom de famille

-- Nettoyage des espaces parasites déjà présents (ex. « KABRAITCHOUKA »)
UPDATE students SET full_name = btrim(regexp_replace(full_name, '\s+', ' ', 'g'))
WHERE full_name IS DISTINCT FROM btrim(regexp_replace(full_name, '\s+', ' ', 'g'));

-- ── Rapport : qui doit compléter son état civil ──
SELECT id, full_name, first_name, last_name,
       CASE WHEN first_name IS NULL OR last_name IS NULL
            THEN 'à compléter' ELSE 'complet' END AS etat_civil
FROM students ORDER BY id;
