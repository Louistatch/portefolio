-- ══════════════ Votes (upvotes) sur les messages du forum de groupe ══════════════
--
-- Une ligne par (post, étudiant) plutôt qu'un compteur sur academy_group_posts : la clé
-- primaire composite empêche nativement un même étudiant de voter deux fois pour le même
-- message, et le compte se lit par un simple count() — pas de lecture-puis-écriture d'un
-- compteur, donc pas de vote perdu si deux votes arrivent au même instant.

CREATE TABLE IF NOT EXISTS academy_group_post_upvotes (
  post_id     INTEGER NOT NULL REFERENCES academy_group_posts(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_group_post_upvotes_post ON academy_group_post_upvotes(post_id);

ALTER TABLE academy_group_post_upvotes DISABLE ROW LEVEL SECURITY;

-- ✅ Terminé.
