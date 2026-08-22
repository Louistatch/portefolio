-- ════════════════════════════════════════════════════════════════
-- Rencontres en ligne — support de séance
--
-- Une rencontre pouvait être planifiée puis animée, mais rien ne permettait d'y attacher un
-- support : l'animateur partageait son écran depuis un autre logiciel, et les participants
-- n'avaient aucune trace des diapositives.
--
-- `slides` porte le support, `current_slide` la diapositive projetée. Le présentateur écrit
-- cet index (session d'administration requise), les participants le lisent en boucle.
--
-- Le contrôle ne peut pas dépendre du rôle Jitsi, attribué au premier arrivé : un étudiant
-- entré avant l'animateur piloterait la présentation de tout le monde.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE academy_meetings ADD COLUMN IF NOT EXISTS slides jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE academy_meetings ADD COLUMN IF NOT EXISTS current_slide integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN academy_meetings.slides IS
  'Diapositives du support : [{"url": "...", "titre": "..."}]. Ordre du tableau = ordre de projection.';
COMMENT ON COLUMN academy_meetings.current_slide IS
  'Index (base 0) de la diapositive projetée. Le présentateur l''écrit, les participants la lisent.';

-- ── Rapport ──
SELECT id, title, status,
       jsonb_array_length(slides) AS diapositives,
       current_slide AS projetee
FROM academy_meetings ORDER BY starts_at DESC;
