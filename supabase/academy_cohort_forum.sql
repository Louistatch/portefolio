-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Forum de cohorte
-- À exécuter APRÈS academy_group_work_v2.sql
--
-- Le forum de groupe réunit trois personnes ; celui-ci réunit toute une promotion avec le
-- formateur. Les deux ne se remplacent pas : une consigne qui vaut pour tout le monde
-- n'a pas à être recopiée dans sept fils de groupe, et une question de groupe n'a pas à
-- être lue par les dix-huit autres.
--
-- La cohorte est le mois d'admission (« 2026-08 ») — la même clé que celle qui sert à
-- constituer les groupes. Elle n'est donc pas stockée sur l'étudiant : elle se dérive de
-- admitted_at, et ne peut pas diverger.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS academy_cohort_posts (
  id              SERIAL PRIMARY KEY,
  cohort          TEXT NOT NULL,               -- « 2026-08 »
  student_id      INTEGER REFERENCES students(id) ON DELETE SET NULL,  -- NULL = message du formateur
  author_name     TEXT,                        -- figé à la publication, survit à la suppression d'un compte
  is_staff        BOOLEAN DEFAULT FALSE,       -- distingue la parole du formateur à l'affichage
  kind            TEXT DEFAULT 'message',      -- message | annonce (épinglée en tête)
  body            TEXT,
  attachment_url  TEXT,
  attachment_name TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cohort_posts ON academy_cohort_posts(cohort, created_at DESC);

ALTER TABLE academy_cohort_posts DISABLE ROW LEVEL SECURITY;

-- ── Trace des exclusions pour retard ──
-- Retirer son admission à un étudiant est une décision : elle se garde, avec son motif et
-- son ampleur. Sans trace, un étudiant qui conteste n'a en face de lui qu'un compte
-- remis à zéro, et le formateur aucun moyen de dire pourquoi.
CREATE TABLE IF NOT EXISTS academy_admission_resets (
  id             SERIAL PRIMARY KEY,
  student_id     INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  previous_admitted_at TIMESTAMPTZ,
  previous_cohort      TEXT,
  days_late      INTEGER,                      -- retard constaté, en jours
  lessons_done   INTEGER,
  lessons_total  INTEGER,
  reason         TEXT DEFAULT 'retard',
  reset_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admission_resets_student ON academy_admission_resets(student_id, reset_at DESC);

ALTER TABLE academy_admission_resets DISABLE ROW LEVEL SECURITY;

-- ✅ Terminé.
