-- rls_suppression_policies_publiques.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Sécurité : suppression des policies ouvertes au rôle `public`
--
-- Ce script termine le travail commencé par academy_rls_lockdown.sql. Celui-ci
-- avait ACTIVÉ la RLS sur les 22 tables qui ne l'avaient pas — et rien d'autre,
-- comme son en-tête l'annonce : « n'ajoute aucune policy ». Il n'a donc pas
-- touché aux dix tables plus anciennes qui, elles, portaient déjà des policies
-- écrites à une époque où le navigateur parlait à PostgREST en direct.
--
-- Ces policies sont ouvertes au rôle `public`, donc au rôle `anon`, dont la clé
-- est publiée dans vercel.json et livrée dans le JavaScript de chaque visiteur.
-- Constaté sur la base de production le 2 septembre 2026 :
--
--   set role anon;
--   select count(*) from admin_users  →  1     ← l'empreinte du mot de passe
--   select count(*) from subscribers  →  89    ← les adresses de l'infolettre
--
-- La plus grave est « Allow all admin_users » : FOR ALL, USING (true),
-- WITH CHECK (true). Elle n'autorise pas seulement à LIRE l'empreinte bcrypt du
-- mot de passe administrateur, mais à la REMPLACER par une empreinte connue.
-- Quiconque lit le bundle JavaScript pouvait donc entrer dans /pagesecure.
-- Renommer la page d'administration ne protège de rien contre ça.
--
-- ── Pourquoi la suppression ne casse rien ────────────────────────────────────
--
-- Trois vérifications, faites avant d'écrire ce fichier :
--
--   1. client/src/lib/supabase.ts crée bien un client anonyme, mais ce module
--      n'est importé NULLE PART dans client/. Le navigateur ne parle jamais à
--      PostgREST : il passe par api/index.ts.
--
--   2. api/index.ts utilise SUPABASE_SERVICE_ROLE_KEY, et la service_role
--      contourne la RLS. Retirer une policy ne lui retire aucun droit.
--
--   3. api/index.ts ligne 33 se rabat sur la clé anon si la clé de service
--      manque — il fallait donc prouver que la production ne tourne pas sur ce
--      repli. Preuve : students, lesson_progress et academy_emails n'ont AUCUNE
--      policy (donc inaccessibles à anon), et pourtant un étudiant s'est
--      connecté le 2 septembre à 09h21 et a validé une leçon à 08h04. Seule la
--      service_role peut écrire ces lignes.
--
-- Après ce script, les dix tables suivent le même modèle que les vingt tables
-- de l'Academy : RLS activée, aucune policy, accès par l'API seulement.
--
-- Non destructif : ne supprime aucune donnée. Les policies retirées sont
-- reproduites en fin de fichier, à l'identique, pour pouvoir être restaurées.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    r RECORD;
    n INTEGER := 0;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND 'public' = ANY (roles)
        ORDER BY tablename, policyname
    LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
        RAISE NOTICE 'Policy supprimée : %.% → %', r.schemaname, r.tablename, r.policyname;
        n := n + 1;
    END LOOP;
    RAISE NOTICE '% policy(ies) supprimée(s).', n;
END $$;

-- La RLS doit rester ACTIVE : sans policy et sans RLS, la table redevient
-- lisible par tout le monde. On la (ré)active donc explicitement sur les dix.
ALTER TABLE public.admin_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials         ENABLE ROW LEVEL SECURITY;


-- ── Contrôle ────────────────────────────────────────────────────────────────
-- Doit renvoyer 0 partout. Le rôle anon ne doit plus rien voir.
--
--   SET LOCAL ROLE anon;
--   SELECT (SELECT count(*) FROM admin_users)  AS admin_users,
--          (SELECT count(*) FROM subscribers)  AS subscribers,
--          (SELECT count(*) FROM appointments) AS appointments,
--          (SELECT count(*) FROM posts)        AS posts;
--
-- Et aucune policy ne doit subsister :
--
--   SELECT count(*) FROM pg_policies WHERE schemaname = 'public';


-- ── Restauration ────────────────────────────────────────────────────────────
-- À n'exécuter que pour revenir à l'état d'avant le 2 septembre 2026, c'est-à-
-- dire pour rouvrir volontairement l'accès direct depuis le navigateur. Copie
-- fidèle de ce que pg_policies contenait avant la suppression.
--
-- CREATE POLICY "Allow all admin_users" ON public.admin_users
--   AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
--
-- CREATE POLICY "Allow read appointments" ON public.appointments
--   AS PERMISSIVE FOR SELECT TO public USING (true);
-- CREATE POLICY "Allow update appointments" ON public.appointments
--   AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow delete appointments" ON public.appointments
--   AS PERMISSIVE FOR DELETE TO public USING (true);
-- CREATE POLICY "Public insert appointments" ON public.appointments
--   AS PERMISSIVE FOR INSERT TO public WITH CHECK (
--     length(name) > 0 AND length(name) <= 100
--     AND length(email) > 0 AND email ~ '^[^@]+@[^@]+\.[^@]+$'
--     AND length(topic) > 0 AND length(topic) <= 2000);
--
-- CREATE POLICY "Public read comments" ON public.comments
--   AS PERMISSIVE FOR SELECT TO public USING (true);
-- CREATE POLICY "Allow delete comments" ON public.comments
--   AS PERMISSIVE FOR DELETE TO public USING (true);
-- CREATE POLICY "Public insert comments" ON public.comments
--   AS PERMISSIVE FOR INSERT TO public WITH CHECK (
--     length(author_name) > 0 AND length(author_name) <= 100
--     AND length(content) > 0 AND length(content) <= 5000);
--
-- CREATE POLICY "Allow read messages" ON public.contact_messages
--   AS PERMISSIVE FOR SELECT TO public USING (true);
-- CREATE POLICY "Allow delete messages" ON public.contact_messages
--   AS PERMISSIVE FOR DELETE TO public USING (true);
-- CREATE POLICY "Public insert contact" ON public.contact_messages
--   AS PERMISSIVE FOR INSERT TO public WITH CHECK (
--     length(name) > 0 AND length(name) <= 100
--     AND length(email) > 0 AND email ~ '^[^@]+@[^@]+\.[^@]+$'
--     AND length(subject) > 0 AND length(subject) <= 200
--     AND length(message) > 0 AND length(message) <= 5000);
--
-- CREATE POLICY "Admin can manage campaigns" ON public.newsletter_campaigns
--   AS PERMISSIVE FOR ALL TO public USING (true);
-- CREATE POLICY "Public can read campaigns" ON public.newsletter_campaigns
--   AS PERMISSIVE FOR SELECT TO public USING (true);
--
-- CREATE POLICY "Public read posts" ON public.posts
--   AS PERMISSIVE FOR SELECT TO public USING (true);
-- CREATE POLICY "Allow insert posts" ON public.posts
--   AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY "Allow update posts" ON public.posts
--   AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow delete posts" ON public.posts
--   AS PERMISSIVE FOR DELETE TO public USING (true);
--
-- CREATE POLICY "Public can read profile" ON public.profile
--   AS PERMISSIVE FOR SELECT TO public USING (true);
-- CREATE POLICY "Admin can insert profile" ON public.profile
--   AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY "Admin can update profile" ON public.profile
--   AS PERMISSIVE FOR UPDATE TO public USING (true);
--
-- CREATE POLICY "Public read publications" ON public.publications
--   AS PERMISSIVE FOR SELECT TO public USING (true);
-- CREATE POLICY "Allow insert publications" ON public.publications
--   AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY "Allow update publications" ON public.publications
--   AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow delete publications" ON public.publications
--   AS PERMISSIVE FOR DELETE TO public USING (true);
--
-- CREATE POLICY "Allow read subscribers" ON public.subscribers
--   AS PERMISSIVE FOR SELECT TO public USING (true);
-- CREATE POLICY "Allow delete subscribers" ON public.subscribers
--   AS PERMISSIVE FOR DELETE TO public USING (true);
-- CREATE POLICY "Public insert subscribers" ON public.subscribers
--   AS PERMISSIVE FOR INSERT TO public WITH CHECK (
--     length(email) > 0 AND email ~ '^[^@]+@[^@]+\.[^@]+$');
--
-- CREATE POLICY "Authenticated can manage testimonials" ON public.testimonials
--   AS PERMISSIVE FOR ALL TO public USING (true);
-- CREATE POLICY "Public can read visible testimonials" ON public.testimonials
--   AS PERMISSIVE FOR SELECT TO public USING (is_visible = true);
