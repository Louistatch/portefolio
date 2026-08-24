-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Travaux de groupe, volet 4 : un groupe PAR TRAVAIL
-- À exécuter APRÈS academy_cohort_forum.sql
--
-- Ce que ce script change, et pourquoi :
--
-- 1. UN GROUPE PAR GW, ET NON UNE ÉQUIPE FIXE.
--    Les équipes sont retirées au sort à chaque travail. Trois projets avec les mêmes deux
--    coéquipiers, c'est une seule expérience répétée trois fois ; retirer au sort, c'est
--    travailler avec neuf personnes différentes et apprendre à s'organiser à chaque fois.
--    `academy_groups` porte donc désormais le GW auquel le groupe appartient, et un étudiant
--    est unique PAR TRAVAIL et non plus globalement.
--
-- 2. UN VERROU DE CONSTITUTION.
--    La première répartition en production a produit trois groupes vides et trois groupes de
--    six et sept : plusieurs chargements simultanés ont lancé la répartition en parallèle,
--    chacun créant ses propres groupes puis y distribuant la même liste d'étudiants. Le
--    verrou ci-dessous est un simple UNIQUE : le premier appel l'obtient et répartit, les
--    autres repartent sans rien faire.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Le groupe appartient à un travail ──
ALTER TABLE academy_groups
  ADD COLUMN IF NOT EXISTS group_work_id INTEGER REFERENCES academy_group_works(id) ON DELETE CASCADE;

ALTER TABLE academy_group_members
  ADD COLUMN IF NOT EXISTS group_work_id INTEGER REFERENCES academy_group_works(id) ON DELETE CASCADE;

-- Les données de la première répartition suivaient l'ancien modèle (équipe unique, et
-- déséquilibrée par la course). Elles ne sont pas rattrapables : on repart à zéro. Aucun
-- rendu n'existe encore, rien d'acquis n'est perdu.
DELETE FROM academy_group_posts;
DELETE FROM academy_group_members;
DELETE FROM academy_groups;

ALTER TABLE academy_groups        ALTER COLUMN group_work_id SET NOT NULL;
ALTER TABLE academy_group_members ALTER COLUMN group_work_id SET NOT NULL;

-- Un étudiant appartient à un groupe PAR TRAVAIL, plus à un seul groupe pour tout le cursus.
ALTER TABLE academy_group_members DROP CONSTRAINT IF EXISTS academy_group_members_student_id_key;
ALTER TABLE academy_group_members
  ADD CONSTRAINT academy_group_members_gw_student_key UNIQUE (group_work_id, student_id);

-- « Groupe A » existe une fois par travail et par cohorte, pas une fois pour toutes.
ALTER TABLE academy_groups DROP CONSTRAINT IF EXISTS academy_groups_cohort_name_key;
ALTER TABLE academy_groups
  ADD CONSTRAINT academy_groups_cohort_gw_name_key UNIQUE (cohort, group_work_id, name);

CREATE INDEX IF NOT EXISTS idx_groups_gw ON academy_groups(group_work_id, cohort);

-- ── 2. Verrou de constitution ──
-- Une ligne par (cohorte, travail). Son insertion est la prise du verrou : elle réussit une
-- seule fois, quel que soit le nombre d'appels simultanés.
CREATE TABLE IF NOT EXISTS academy_group_formation_locks (
  id            SERIAL PRIMARY KEY,
  cohort        TEXT NOT NULL,
  group_work_id INTEGER NOT NULL REFERENCES academy_group_works(id) ON DELETE CASCADE,
  formed_at     TIMESTAMPTZ DEFAULT now(),
  groups_count  INTEGER,
  members_count INTEGER,
  UNIQUE (cohort, group_work_id)
);
ALTER TABLE academy_group_formation_locks DISABLE ROW LEVEL SECURITY;

-- ✅ Terminé.
