-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Travaux de groupe (Group Work, modèle WQU)
-- À exécuter dans Supabase SQL Editor APRÈS academy_wqu_v4.sql
--
-- À partir de la semaine 4, le cursus ajoute une évaluation collective par mois :
-- GW1 en semaine 4, GW2 en semaine 8, GW3 en semaine 12 — trois au total, qui tiennent
-- dans la fenêtre d'admission de 3 mois. Les dates sont relatives à l'admission de chaque
-- étudiant, comme le planning des leçons.
--
-- Ce script ne crée que les structures. Les trois énoncés sont semés par l'API au premier
-- appel (source : shared/groupwork.ts), pour qu'ils restent modifiables depuis
-- l'administration sans redéploiement.
-- ════════════════════════════════════════════════════════════════

-- ── Un groupe de travail ──
-- La cohorte est le mois d'admission (« 2026-08 ») : on ne mélange pas des étudiants dont
-- les échéances sont à deux mois d'écart, sinon le premier arrivé attend ses coéquipiers.
CREATE TABLE IF NOT EXISTS academy_groups (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,                    -- « Groupe A », « Groupe B »…
  cohort      TEXT NOT NULL,                    -- mois d'admission, ex. « 2026-08 »
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (cohort, name)
);
CREATE INDEX IF NOT EXISTS idx_groups_cohort ON academy_groups(cohort);

-- ── Composition ──
-- UNIQUE(student_id) : un étudiant appartient à un seul groupe. C'est ce qui rend la
-- répartition automatique idempotente — un second passage ne peut pas le dupliquer — et
-- ce qui permet à l'administration de le déplacer par un simple UPDATE.
CREATE TABLE IF NOT EXISTS academy_group_members (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER NOT NULL REFERENCES academy_groups(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'membre',            -- membre | referent
  joined_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON academy_group_members(group_id);

-- ── Les trois énoncés ──
CREATE TABLE IF NOT EXISTS academy_group_works (
  id            SERIAL PRIMARY KEY,
  gw_index      INTEGER NOT NULL UNIQUE,        -- 1, 2, 3
  week_index    INTEGER NOT NULL,               -- semaine d'ouverture depuis l'admission (4, 8, 12)
  title         TEXT NOT NULL,
  brief         TEXT,
  deliverables  JSONB DEFAULT '[]'::jsonb,      -- tableau de chaînes
  max_score     INTEGER DEFAULT 100,
  is_published  BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Le rendu, un par groupe et par GW ──
-- Le livrable est collectif : n'importe quel membre dépose pour tout le groupe, et le
-- dernier dépôt remplace le précédent tant que la correction n'a pas eu lieu.
CREATE TABLE IF NOT EXISTS academy_group_submissions (
  id             SERIAL PRIMARY KEY,
  group_work_id  INTEGER NOT NULL REFERENCES academy_group_works(id) ON DELETE CASCADE,
  group_id       INTEGER NOT NULL REFERENCES academy_groups(id) ON DELETE CASCADE,
  submitted_by   INTEGER REFERENCES students(id) ON DELETE SET NULL,
  content        JSONB,                         -- { summary, links: [{label, url}], contributions }
  status         TEXT DEFAULT 'submitted',      -- submitted | graded
  score          INTEGER,
  feedback       TEXT,
  submitted_at   TIMESTAMPTZ DEFAULT now(),
  graded_at      TIMESTAMPTZ,
  UNIQUE (group_work_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_group_sub_group ON academy_group_submissions(group_id);

-- ── Calendrier individuel des GW ──
-- Même principe que lesson_progress : la ligne porte la fenêtre (unlock_at → due_at)
-- calculée depuis l'admission de l'étudiant. L'état, lui, dérive du rendu de son groupe.
CREATE TABLE IF NOT EXISTS group_work_progress (
  id             SERIAL PRIMARY KEY,
  student_id     INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  group_work_id  INTEGER NOT NULL REFERENCES academy_group_works(id) ON DELETE CASCADE,
  week_index     INTEGER NOT NULL,
  unlock_at      TIMESTAMPTZ NOT NULL,
  due_at         TIMESTAMPTZ NOT NULL,
  status         TEXT DEFAULT 'locked',         -- locked | available | submitted | completed | missed
  completed_at   TIMESTAMPTZ,
  score          NUMERIC(5,2),
  UNIQUE (student_id, group_work_id)
);
CREATE INDEX IF NOT EXISTS idx_gwp_student ON group_work_progress(student_id);

ALTER TABLE academy_groups            DISABLE ROW LEVEL SECURITY;
ALTER TABLE academy_group_members     DISABLE ROW LEVEL SECURITY;
ALTER TABLE academy_group_works       DISABLE ROW LEVEL SECURITY;
ALTER TABLE academy_group_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_work_progress       DISABLE ROW LEVEL SECURITY;

-- ✅ Terminé. Les énoncés se sèment tout seuls au premier chargement de
--    /api/academy/group-work ; vérifiez-les ensuite dans /admin/group-work.
