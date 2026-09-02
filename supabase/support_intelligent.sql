-- support_intelligent.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Le Support Intelligent : base de connaissances, tickets et mesures.
--
-- Quatre tables. La recherche est celle de PostgreSQL en français, pas des
-- plongements vectoriels : avec 45 leçons pour 290 Ko de contenu et une
-- vingtaine d'articles, pgvector coûterait un service d'embeddings payant et un
-- travail de réindexation pour un résultat que le dictionnaire français intégré
-- donne déjà. La bascule reste possible plus tard sans toucher au widget —
-- c'est l'API qui choisit comment chercher.
--
-- Une seule extension, unaccent, et une configuration de recherche qui en
-- découle. Le pourquoi est mesuré, pas supposé : voir le commentaire de la
-- colonne tsv plus bas.
--
--   CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
--   CREATE TEXT SEARCH CONFIGURATION public.fr_sans_accents (COPY = pg_catalog.french);
--   ALTER TEXT SEARCH CONFIGURATION public.fr_sans_accents
--     ALTER MAPPING FOR hword, hword_part, word WITH extensions.unaccent, french_stem;
--
-- RLS activée, AUCUNE policy : le même modèle que les vingt tables de l'Academy,
-- et l'inverse des dix tables corrigées par rls_suppression_policies_publiques.sql.
-- L'accès passe exclusivement par api/index.ts et sa clé de service.
-- ─────────────────────────────────────────────────────────────────────────────


-- ══ 1. Les articles du centre d'aide ════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_articles (
    id          SERIAL PRIMARY KEY,
    slug        TEXT        NOT NULL UNIQUE,
    titre       TEXT        NOT NULL,
    -- Une phrase, montrée dans les résultats de recherche et sous le titre.
    resume      TEXT        NOT NULL DEFAULT '',
    contenu     TEXT        NOT NULL DEFAULT '',
    -- Les six familles du centre d'aide.
    famille     TEXT        NOT NULL DEFAULT 'compte',
    -- Qui peut voir l'article. Un article qui explique le rythme des leçons n'a
    -- rien à faire devant un visiteur qui n'est pas encore inscrit.
    audience    TEXT        NOT NULL DEFAULT 'public'
                CHECK (audience IN ('public', 'etudiant', 'admis')),
    publie      BOOLEAN     NOT NULL DEFAULT TRUE,
    ordre       INTEGER     NOT NULL DEFAULT 0,
    -- Nombre de fois où l'article a été jugé utile / inutile. Dénormalisé à
    -- dessein : c'est lu à chaque affichage de la liste d'administration, et le
    -- calculer depuis support_events à chaque fois serait payer une agrégation
    -- pour une valeur qui ne bouge que par unités.
    utile       INTEGER     NOT NULL DEFAULT 0,
    inutile     INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- La recherche. Colonne générée : elle ne peut pas se désynchroniser du
    -- contenu, contrairement à un déclencheur qu'on oublie de poser sur une
    -- nouvelle colonne. Le titre pèse plus que le résumé, qui pèse plus que le
    -- corps — sinon un mot cité en passant dans un long article le fait remonter
    -- devant l'article qui porte ce mot en titre.
    --
    -- DEUX configurations, pas une, et c'est mesuré :
    --
    --   french seul           « lecon verrouillee » (sans accents) ne trouve RIEN.
    --                         Or c'est ainsi qu'on tape sur un clavier de téléphone.
    --   fr_sans_accents seul  « verrouiller » ne trouve plus « verrouillée » : privé
    --                         de l'accent, le radicaliseur français s'arrête à
    --                         « verrouille » au lieu de « verrouill ».
    --
    -- Les deux ensemble couvrent les deux cas — le vecteur porte les deux formes.
    -- Le surcoût est un index deux fois plus gros, ce qui, pour une vingtaine
    -- d'articles, ne se mesure pas.
    tsv TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('french',                 COALESCE(titre,   '')), 'A') ||
        setweight(to_tsvector('public.fr_sans_accents', COALESCE(titre,   '')), 'A') ||
        setweight(to_tsvector('french',                 COALESCE(resume,  '')), 'B') ||
        setweight(to_tsvector('public.fr_sans_accents', COALESCE(resume,  '')), 'B') ||
        setweight(to_tsvector('french',                 COALESCE(contenu, '')), 'C') ||
        setweight(to_tsvector('public.fr_sans_accents', COALESCE(contenu, '')), 'C')
    ) STORED
);

CREATE INDEX IF NOT EXISTS support_articles_tsv_idx
    ON public.support_articles USING GIN (tsv);
CREATE INDEX IF NOT EXISTS support_articles_famille_idx
    ON public.support_articles (famille, ordre);


-- ══ 2. Les tickets ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER     REFERENCES public.students(id) ON DELETE SET NULL,
    -- Recopiés au moment de la création : un ticket doit rester lisible même si
    -- le compte est supprimé, et c'est aussi la seule façon d'accepter une
    -- demande venue d'un visiteur non connecté.
    nom         TEXT        NOT NULL DEFAULT '',
    email       TEXT        NOT NULL DEFAULT '',
    sujet       TEXT        NOT NULL,
    statut      TEXT        NOT NULL DEFAULT 'ouvert'
                CHECK (statut IN ('ouvert', 'en_attente', 'resolu')),
    priorite    TEXT        NOT NULL DEFAULT 'normale'
                CHECK (priorite IN ('basse', 'normale', 'haute')),
    -- L'état du dossier au moment de la demande, tel que diagnostiquer() l'a vu.
    -- C'est ce qui évite d'avoir à redemander « vous en êtes où ? » : la réponse
    -- était déjà connue quand la question a été posée.
    contexte    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    -- D'où la demande est partie, et ce que le diagnostic disait alors.
    page        TEXT        NOT NULL DEFAULT '',
    constat     TEXT,
    -- Pour mesurer le délai de première réponse sans reparcourir les messages.
    first_reply_at TIMESTAMPTZ,
    closed_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_tickets_statut_idx
    ON public.support_tickets (statut, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_student_idx
    ON public.support_tickets (student_id, created_at DESC);


-- ══ 3. Le fil de chaque ticket ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_messages (
    id          SERIAL PRIMARY KEY,
    ticket_id   INTEGER     NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    auteur      TEXT        NOT NULL CHECK (auteur IN ('etudiant', 'admin')),
    corps       TEXT        NOT NULL,
    -- Le message a-t-il été expédié par courriel ? Sert à ne pas renvoyer deux
    -- fois le même, et à voir d'un coup d'œil ce qui n'est jamais parti.
    email_envoye BOOLEAN    NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_messages_ticket_idx
    ON public.support_messages (ticket_id, created_at);


-- ══ 4. Ce qui a été demandé, et si ça a répondu ═════════════════════════════
--
-- La table qui fera vivre la base de connaissances. Une recherche qui ne trouve
-- rien n'est pas un échec à masquer : c'est le titre du prochain article. Sans
-- cette trace, le centre d'aide répondrait indéfiniment aux questions qu'on a
-- imaginées plutôt qu'à celles qu'on nous pose.

CREATE TABLE IF NOT EXISTS public.support_events (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER     REFERENCES public.students(id) ON DELETE SET NULL,
    genre       TEXT        NOT NULL
                CHECK (genre IN ('question', 'recherche', 'article_vu',
                                 'article_utile', 'article_inutile',
                                 'action', 'ticket')),
    -- Le niveau du repli qui a répondu : 1 diagnostic, 2 recherche, 3 action,
    -- 4 ticket. C'est la mesure qui dit si le support tient tout seul.
    niveau      SMALLINT,
    question    TEXT,
    termes      TEXT,
    resultats   INTEGER,
    article     TEXT,
    constat     TEXT,
    page        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_events_genre_idx
    ON public.support_events (genre, created_at DESC);
-- Les recherches restées sans résultat, retrouvées d'un seul index.
CREATE INDEX IF NOT EXISTS support_events_sans_resultat_idx
    ON public.support_events (created_at DESC)
    WHERE genre = 'recherche' AND resultats = 0;


-- ══ Verrouillage ════════════════════════════════════════════════════════════
-- RLS activée, aucune policy : inaccessible à la clé anon, transparent pour la
-- clé de service utilisée par l'API.

ALTER TABLE public.support_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_events   ENABLE ROW LEVEL SECURITY;


-- ══ Contrôle ════════════════════════════════════════════════════════════════
--
-- La requête interroge TOUJOURS les deux configurations, comme le vecteur les
-- porte toutes les deux. C'est ce que fait chercherArticles() dans api/index.ts.
--
--   WITH q AS (
--     SELECT websearch_to_tsquery('french',                 'lecon verrouillee')
--         || websearch_to_tsquery('public.fr_sans_accents', 'lecon verrouillee') AS q
--   )
--   SELECT titre, ts_rank(tsv, q) AS rang
--   FROM support_articles, q
--   WHERE tsv @@ q AND publie
--   ORDER BY rang DESC;
--
-- Doit renvoyer « Pourquoi ma leçon est-elle verrouillée ? » en tête, que la
-- question soit tapée avec ou sans accents, au singulier ou au pluriel, avec
-- « verrouillée » ou « verrouiller ». Les quatre cas ont été vérifiés sur la
-- base avant que ce fichier soit écrit.
