-- academy_rls_lockdown.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Sécurité : verrouillage RLS des tables publiques — DataMEAL Academy
--
-- Contexte : 22 tables du schéma public étaient en RLS désactivé. La clé anon
-- (embarquée dans le JavaScript du site) pouvait donc lire des données
-- sensibles : students.password_hash, students.verify_token, academy_emails,
-- enrollments, grades, etc.
--
-- L'application ne passe jamais par PostgREST depuis le navigateur : toutes les
-- requêtes partent du serveur Express, qui utilise désormais la clé
-- service_role (SUPABASE_SERVICE_ROLE_KEY). La service_role contourne RLS :
-- activer RLS sans policy ne change donc RIEN pour l'application, mais coupe
-- tout accès de la clé anon aux lignes de ces tables.
--
-- ⚠️ ORDRE D'EXÉCUTION OBLIGATOIRE :
--   1. Déployer le serveur avec SUPABASE_SERVICE_ROLE_KEY (Vercel)
--   2. Exécuter ce script
--   3. Vérifier (voir les requêtes de contrôle en fin de fichier)
--
-- À exécuter dans le SQL Editor de Supabase (projet tilportefolio).
-- Non destructif : ne supprime aucune donnée, n'ajoute aucune policy.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    r RECORD;
    n INTEGER := 0;
BEGIN
    FOR r IN
        SELECT c.relname AS t
        FROM pg_class c
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        WHERE ns.nspname = 'public'
          AND c.relkind = 'r'
          AND NOT c.relrowsecurity
        ORDER BY c.relname
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.t);
        RAISE NOTICE 'RLS activée : public.%', r.t;
        n := n + 1;
    END LOOP;

    RAISE NOTICE 'Fait : % tables passées en RLS sans policy.', n;
END $$;

-- ── Contrôle 1 : plus aucune table publique sans RLS ─────────────────────────
SELECT count(*) AS tables_sans_rls
FROM pg_class c
JOIN pg_namespace ns ON ns.oid = c.relnamespace
WHERE ns.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity;
-- Attendu : 0

-- ── Contrôle 2 (à faire AVEC la clé anon, depuis l'extérieur) ─────────────────
-- GET https://gcfcdkzmfybiigbnlwvb.supabase.co/rest/v1/students?select=*&limit=1
-- Attendu : [] (aucune ligne) au lieu des 31 lignes avec password_hash.
