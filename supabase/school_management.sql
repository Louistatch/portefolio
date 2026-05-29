-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — School Management System
-- À exécuter dans Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ── 1. STUDENTS ──
CREATE TABLE IF NOT EXISTS students (
  id            SERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone         TEXT,
  country       TEXT,
  organization  TEXT,
  entry_score   INTEGER DEFAULT 0,
  avatar_url    TEXT,
  status        TEXT DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 2. COURSES ──
CREATE TABLE IF NOT EXISTS sms_courses (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  description   TEXT,
  tools         TEXT[],
  level         TEXT DEFAULT 'debutant',
  total_lessons INTEGER DEFAULT 0,
  order_index   INTEGER DEFAULT 0,
  is_published  BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 3. LESSONS ──
CREATE TABLE IF NOT EXISTS sms_lessons (
  id          SERIAL PRIMARY KEY,
  course_id   INTEGER NOT NULL REFERENCES sms_courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     JSONB,
  type        TEXT DEFAULT 'notebook',
  points      INTEGER DEFAULT 10,
  order_index INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 4. ENROLLMENTS ──
CREATE TABLE IF NOT EXISTS enrollments (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES sms_courses(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'in_progress',
  progress    INTEGER DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(student_id, course_id)
);

-- ── 5. GRADES ──
CREATE TABLE IF NOT EXISTS grades (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id   INTEGER REFERENCES sms_courses(id) ON DELETE CASCADE,
  lesson_id   INTEGER REFERENCES sms_lessons(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  score       NUMERIC(5,2) NOT NULL,
  max_score   NUMERIC(5,2) DEFAULT 100,
  type        TEXT DEFAULT 'lesson',
  feedback    TEXT,
  graded_at   TIMESTAMPTZ DEFAULT now()
);

-- ── 6. SUBMISSIONS ──
CREATE TABLE IF NOT EXISTS submissions (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES sms_courses(id) ON DELETE CASCADE,
  lesson_id   INTEGER REFERENCES sms_lessons(id) ON DELETE SET NULL,
  content     JSONB,
  status      TEXT DEFAULT 'submitted',
  score       NUMERIC(5,2),
  feedback    TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- ── 7. ATTESTATIONS ──
CREATE TABLE IF NOT EXISTS attestations (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id    INTEGER NOT NULL REFERENCES sms_courses(id) ON DELETE CASCADE,
  certificate_no TEXT UNIQUE,
  final_score  NUMERIC(5,2),
  status       TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT now(),
  issued_at    TIMESTAMPTZ
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_course  ON grades(course_id);
CREATE INDEX IF NOT EXISTS idx_enroll_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON sms_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_subs_student   ON submissions(student_id);

-- ════════════════════════════════════════════════════════════════
-- SEED — 3 cours
-- ════════════════════════════════════════════════════════════════
INSERT INTO sms_courses (code, title, description, tools, level, total_lessons, order_index) VALUES
('MEAL-01', 'Enquête nutritionnelle — Région de Lomé',
 'Concevoir un formulaire XLSForm, simuler 200 observations terrain, analyser les indicateurs MUAC et Z-scores selon les seuils SPHERE/OMS.',
 ARRAY['KoboCollect','Python','pandas'], 'debutant', 6, 1),
('MEAL-02', 'Cartographie des bénéficiaires WASH',
 'Importer les coordonnées GPS des points d''eau, réaliser une analyse de couverture spatiale et produire des cartes d''intervention par district.',
 ARRAY['QGIS','PyQGIS','KoboAPI'], 'intermediaire', 9, 2),
('MEAL-03', 'Système de reporting MEAL automatisé',
 'Construire un pipeline complet : extraction KoboAPI vers analyse Python vers generation de rapport PDF avec cartes QGIS.',
 ARRAY['Python','openpyxl','QGIS Atlas'], 'avance', 14, 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO sms_lessons (course_id, title, type, points, order_index, content)
SELECT c.id, l.title, 'notebook', l.points, l.ord, l.content::jsonb
FROM sms_courses c,
(VALUES
  ('Introduction & contexte', 10, 1, '{"cells":[{"type":"md","content":"## Contexte\nEnquete nutritionnelle Lome. Objectif MEAL: prevalence malnutrition aigue MUAC < 125mm."},{"type":"code","lang":"python","code":"import pandas as pd\nimport numpy as np\nprint(\"OK\")","output":"OK"}]}'),
  ('Formulaire KoboCollect', 15, 2, '{"cells":[{"type":"md","content":"## XLSForm\ngeopoint GPS, decimal MUAC, contrainte age."}]}'),
  ('Simulation de donnees', 15, 3, '{"cells":[{"type":"code","lang":"python","code":"np.random.seed(42)\nN=200","output":"200 observations"}]}'),
  ('Analyse des indicateurs', 20, 4, '{"cells":[{"type":"md","content":"## MUAC\nMAS<115, MAM 115-125, Normal>=125"}]}'),
  ('Visualisation', 20, 5, '{"cells":[{"type":"code","lang":"python","code":"import matplotlib.pyplot as plt","output":"3 graphiques"}]}'),
  ('Export rapport bailleur', 20, 6, '{"cells":[{"type":"code","lang":"python","code":"df.to_excel(\"rapport.xlsx\")","output":"Exporte"}]}')
) AS l(title, points, ord, content)
WHERE c.code = 'MEAL-01'
ON CONFLICT DO NOTHING;

ALTER TABLE students     DISABLE ROW LEVEL SECURITY;
ALTER TABLE sms_courses  DISABLE ROW LEVEL SECURITY;
ALTER TABLE sms_lessons  DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE grades       DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions  DISABLE ROW LEVEL SECURITY;
ALTER TABLE attestations DISABLE ROW LEVEL SECURITY;
