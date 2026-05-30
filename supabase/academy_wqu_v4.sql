-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Modèle WQU : cohortes, déblocage hebdo, grades
-- À exécuter dans Supabase SQL Editor APRÈS les migrations précédentes
-- ════════════════════════════════════════════════════════════════

-- ── Étudiant : dates d'admission, tentatives test, certificat ──
ALTER TABLE students ADD COLUMN IF NOT EXISTS admitted_at        TIMESTAMPTZ;   -- date de réussite du test
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_expires  TIMESTAMPTZ;   -- admitted_at + 3 mois
ALTER TABLE students ADD COLUMN IF NOT EXISTS test_attempts      INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_test_at       TIMESTAMPTZ;   -- dernière tentative (pour le délai 1 semaine)
ALTER TABLE students ADD COLUMN IF NOT EXISTS next_test_allowed  TIMESTAMPTZ;   -- last_test_at + 7j si échec
ALTER TABLE students ADD COLUMN IF NOT EXISTS final_certificate_no TEXT;        -- certificat final (3 cours finis)
ALTER TABLE students ADD COLUMN IF NOT EXISTS final_certified_at TIMESTAMPTZ;

-- ── Enrollment : suivi hebdomadaire par leçon ──
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS started_at      TIMESTAMPTZ;   -- début du cours
-- progress, status existent déjà

-- ── Suivi fin par leçon : déblocage, deadline, état ──
CREATE TABLE IF NOT EXISTS lesson_progress (
  id            SERIAL PRIMARY KEY,
  student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id     INTEGER NOT NULL REFERENCES sms_courses(id) ON DELETE CASCADE,
  lesson_id     INTEGER NOT NULL REFERENCES sms_lessons(id) ON DELETE CASCADE,
  week_index    INTEGER NOT NULL,            -- semaine 1, 2, 3... depuis l'admission
  unlock_at     TIMESTAMPTZ NOT NULL,        -- date de déblocage
  due_at        TIMESTAMPTZ NOT NULL,        -- unlock_at + 7 jours (fenêtre)
  status        TEXT DEFAULT 'locked',       -- locked | available | completed | missed
  completed_at  TIMESTAMPTZ,
  score         NUMERIC(5,2),
  UNIQUE(student_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_lp_student ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lp_course  ON lesson_progress(student_id, course_id);

-- ── Certificats (admission + final) ──
-- (la table attestations existe déjà pour les attestations par cours ; on ajoute un type)
ALTER TABLE attestations ADD COLUMN IF NOT EXISTS cert_type   TEXT DEFAULT 'course';  -- course | admission | final
ALTER TABLE attestations ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;

ALTER TABLE lesson_progress DISABLE ROW LEVEL SECURITY;

-- ── Vue pratique : relevé de notes complet d'un étudiant ──
-- (utilisée par l'API ; pas obligatoire mais pratique)
