-- ════════════════════════════════════════════════════════════════
-- DataMEAL Academy — Vérification par code (Supabase backend)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE students ADD COLUMN IF NOT EXISTS verify_code TEXT;
-- verify_expires existe déjà (academy_auth_v3.sql)
