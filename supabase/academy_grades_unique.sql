-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Empêche les doublons de note par leçon
-- À exécuter dans Supabase SQL Editor APRÈS les migrations précédentes
--
-- Le endpoint /api/academy/complete-lesson utilisait un check-then-insert
-- non atomique : deux requêtes concurrentes pouvaient toutes les deux
-- passer le contrôle "note déjà existante" avant qu'aucune des deux
-- insertions ne soit validée, créant des doublons qui faussent les
-- moyennes (my-grades, transcript). On supprime d'abord les doublons
-- déjà présents (le cas échéant), puis on ajoute la contrainte que le
-- code utilise désormais via un upsert(onConflict: "student_id,lesson_id").
-- ════════════════════════════════════════════════════════════════

DELETE FROM grades a USING grades b
WHERE a.id > b.id
  AND a.student_id = b.student_id
  AND a.lesson_id = b.lesson_id
  AND a.lesson_id IS NOT NULL;

ALTER TABLE grades ADD CONSTRAINT grades_student_lesson_unique UNIQUE (student_id, lesson_id);
