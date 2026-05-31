-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Sessions de rencontre en ligne (Jitsi)
-- À exécuter dans Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS academy_meetings (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  room_name    TEXT NOT NULL UNIQUE,        -- identifiant unique de la salle Jitsi
  host_name    TEXT DEFAULT 'TATCHIDA Issodo Louis',
  kind         TEXT DEFAULT 'meeting',      -- meeting (interactif) | webinar (présentation)
  starts_at    TIMESTAMPTZ NOT NULL,
  duration_min INTEGER DEFAULT 60,
  status       TEXT DEFAULT 'scheduled',    -- scheduled | live | ended | cancelled
  course_id    INTEGER REFERENCES sms_courses(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meetings_starts ON academy_meetings(starts_at);
ALTER TABLE academy_meetings DISABLE ROW LEVEL SECURITY;

-- ✅ Terminé.
