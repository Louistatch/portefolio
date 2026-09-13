-- ══════════════ Votes (upvotes) sur les messages du forum de promotion ══════════════
--
-- Symétrique à academy_group_post_upvotes (voir academy_group_work_v5_forum_upvotes.sql),
-- mais pour le forum de promotion : les posts des deux forums vivent dans des tables
-- séparées (academy_group_posts / academy_cohort_posts, deux séquences d'identifiants
-- indépendantes), donc une table de vote par forum plutôt qu'une seule ambiguë sur laquelle
-- des deux tables post_id se rapporterait.

CREATE TABLE IF NOT EXISTS academy_cohort_post_upvotes (
  post_id     INTEGER NOT NULL REFERENCES academy_cohort_posts(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_cohort_post_upvotes_post ON academy_cohort_post_upvotes(post_id);

ALTER TABLE academy_cohort_post_upvotes DISABLE ROW LEVEL SECURITY;

-- ✅ Terminé.
