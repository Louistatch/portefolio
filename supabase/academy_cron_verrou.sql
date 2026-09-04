-- ══════════════════════════════════════════════════════════════
-- Verrou quotidien sur les tâches planifiées
--
-- ── Le problème ──
--
-- Les deux tâches quotidiennes n'ont JAMAIS tourné. `cron_runs` est restée vide depuis
-- sa création : ni exécution, ni échec, ni refus. Les routes ont été corrigées (elles
-- étaient déclarées en POST alors que l'ordonnanceur appelle en GET), le filet d'alerte
-- posé, la trace de refus ajoutée — et il ne se passe toujours rien. Le diagnostic bute
-- sur ce qu'on ne peut pas observer d'ici : la configuration de l'ordonnanceur de la
-- plateforme d'hébergement.
--
-- ── Le choix ──
--
-- Continuer à déboguer à l'aveugle un ordonnanceur qu'on ne voit pas, ou cesser d'en
-- dépendre. On cesse d'en dépendre : une seconde source de déclenchement est ajoutée
-- (un workflow planifié dans le dépôt, qui a SES PROPRES journaux, consultables). Celui
-- de la plateforme reste en place et garde la priorité — il passe en premier dans la
-- journée.
--
-- Mais deux ordonnanceurs qui visent la même tâche, c'est deux exécutions. D'où ce
-- verrou.
--
-- ── Pourquoi la contrainte d'unicité EST le verrou ──
--
-- `unique (tache, jour)` transforme l'insertion de la ligne de journal en prise de
-- verrou atomique : le premier appelant de la journée insère et travaille, le second
-- reçoit une violation d'unicité et s'arrête. Pas de table de verrous, pas de Redis,
-- pas de fenêtre de course — c'est la base qui arbitre, et elle le fait bien.
--
-- Le jour est celui d'UTC, comme les horaires de l'ordonnanceur. Un fuseau local
-- introduirait une ambiguïté deux fois par an pour rien.
--
-- ── Ce que le verrou ne doit PAS empêcher ──
--
--   — une reprise après échec : une tâche qui a échoué à 09h00 doit pouvoir être
--     reprise à 09h10 par l'autre ordonnanceur, sinon le filet ne rattrape rien ;
--   — une reprise après mort brutale : une ligne restée à `ok = null` signale une
--     fonction tuée en cours de route ; passé un délai, la place est à reprendre.
--
-- Les deux cas se traitent par une MISE À JOUR conditionnelle de la ligne du jour, pas
-- par une seconde insertion — d'où `tentatives`, qui garde le compte sans multiplier
-- les lignes.
-- ══════════════════════════════════════════════════════════════

alter table cron_runs
  add column if not exists jour        date,
  add column if not exists declencheur text,
  add column if not exists tentatives  integer not null default 1;

-- La table est vide au moment de cette migration ; le remplissage rétroactif ci-dessous
-- ne sert qu'au cas où elle ne le serait plus au moment où quelqu'un rejoue ce fichier.
update cron_runs set jour = (demarre_at at time zone 'utc')::date where jour is null;

alter table cron_runs alter column jour set default ((now() at time zone 'utc')::date);
alter table cron_runs alter column jour set not null;

-- Le verrou lui-même.
create unique index if not exists cron_runs_tache_jour_uniq on cron_runs (tache, jour);

comment on column cron_runs.jour is
  'Jour UTC de la tâche. Avec `tache`, forme le verrou qui empêche deux ordonnanceurs de faire le même travail deux fois.';
comment on column cron_runs.declencheur is
  'Qui a déclenché : vercel-cron (ordonnanceur de la plateforme), externe (workflow du dépôt, jeton porteur), manuel (administration).';
comment on column cron_runs.tentatives is
  'Nombre de prises dans la journée. Supérieur à 1 = une première tentative a échoué ou est morte en route.';
