-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Journal d'emails : clé de déduplication réelle
-- À exécuter dans Supabase SQL Editor
--
-- sendAcademyEmail() acceptait un paramètre dedupeKey mais ne
-- l'utilisait jamais dans la requête de vérification (elle filtrait
-- sur student_id+type+subject à la place) : la dédup était donc peu
-- fiable, et plusieurs appels (attestation, réunions) ne passaient
-- même pas de dedupeKey. On stocke maintenant la clé et on l'utilise
-- directement pour vérifier qu'un envoi identique n'a pas déjà eu lieu.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE academy_emails ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE INDEX IF NOT EXISTS idx_academy_emails_dedupe_key ON academy_emails(dedupe_key);
