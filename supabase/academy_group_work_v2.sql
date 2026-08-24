-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Travaux de groupe, volet 2
-- À exécuter APRÈS academy_group_work.sql
--
-- Ce que ce script ajoute, et pourquoi :
--   1. un forum par groupe — l'énoncé et le modèle de rapport y sont déposés à la
--      constitution du groupe, et les membres s'y coordonnent sans quitter la plateforme ;
--   2. le dépôt de fichiers du rendu (rapport PDF + archive ZIP), et non plus seulement
--      des liens ;
--   3. l'évaluation par les pairs — chaque membre note les autres sur 4 critères à 3
--      points, ce qui documente les contributions quand un rendu est collectif ;
--   4. la grille du formateur, pour que la note de 100 se justifie ligne par ligne.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Forum de groupe ──
-- `kind` distingue les messages des membres des documents épinglés (énoncé, modèle) :
-- sans lui, l'énoncé se serait retrouvé noyé dès le dixième message.
CREATE TABLE IF NOT EXISTS academy_group_posts (
  id              SERIAL PRIMARY KEY,
  group_id        INTEGER NOT NULL REFERENCES academy_groups(id) ON DELETE CASCADE,
  group_work_id   INTEGER REFERENCES academy_group_works(id) ON DELETE SET NULL,
  student_id      INTEGER REFERENCES students(id) ON DELETE SET NULL,  -- NULL = message du formateur
  author_name     TEXT,                        -- figé à la publication, survit à une suppression de compte
  kind            TEXT DEFAULT 'message',      -- message | ressource (épinglée en tête)
  body            TEXT,
  attachment_url  TEXT,
  attachment_name TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_posts_group ON academy_group_posts(group_id, created_at);
-- Une ressource n'est déposée qu'une fois par groupe et par GW, même si la constitution
-- du groupe est rejouée : c'est cette contrainte partielle qui rend le dépôt idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_posts_ressource_unique
  ON academy_group_posts(group_id, group_work_id, attachment_url)
  WHERE kind = 'ressource';

-- ── 2. Fichiers du rendu ──
ALTER TABLE academy_group_submissions ADD COLUMN IF NOT EXISTS report_url    TEXT;
ALTER TABLE academy_group_submissions ADD COLUMN IF NOT EXISTS report_name   TEXT;
ALTER TABLE academy_group_submissions ADD COLUMN IF NOT EXISTS archive_url   TEXT;
ALTER TABLE academy_group_submissions ADD COLUMN IF NOT EXISTS archive_name  TEXT;
-- Détail de la note par critère de la grille formateur : { "analyse": 38, "methode": 20… }
ALTER TABLE academy_group_submissions ADD COLUMN IF NOT EXISTS rubric_scores JSONB;

-- ── 3. Évaluation par les pairs ──
-- Une ligne par (GW, évaluateur, évalué). Un membre ne s'évalue pas lui-même : la
-- contrainte CHECK l'empêche plutôt que de compter sur l'interface.
CREATE TABLE IF NOT EXISTS academy_group_peer_reviews (
  id             SERIAL PRIMARY KEY,
  group_work_id  INTEGER NOT NULL REFERENCES academy_group_works(id) ON DELETE CASCADE,
  group_id       INTEGER NOT NULL REFERENCES academy_groups(id) ON DELETE CASCADE,
  reviewer_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reviewee_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  scores         JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { "planification": 3, … } sur 3
  total          INTEGER,                              -- somme, recalculée à chaque envoi
  comment        TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (group_work_id, reviewer_id, reviewee_id),
  CHECK (reviewer_id <> reviewee_id)
);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewee ON academy_group_peer_reviews(group_work_id, reviewee_id);

-- ── 4. Documents et grille attachés à chaque GW ──
ALTER TABLE academy_group_works ADD COLUMN IF NOT EXISTS brief_url    TEXT;   -- énoncé PDF
ALTER TABLE academy_group_works ADD COLUMN IF NOT EXISTS template_url TEXT;   -- modèle DOCX
ALTER TABLE academy_group_works ADD COLUMN IF NOT EXISTS rubric       JSONB;  -- grille du formateur

ALTER TABLE academy_group_posts        DISABLE ROW LEVEL SECURITY;
ALTER TABLE academy_group_peer_reviews DISABLE ROW LEVEL SECURITY;

-- ✅ Terminé.
