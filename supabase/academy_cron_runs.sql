-- ══════════════════════════════════════════════════════════════
-- Journal des tâches planifiées
--
-- Pourquoi cette table existe
-- ---------------------------
-- Les deux tâches quotidiennes n'ont jamais tourné : elles étaient déclarées en POST
-- alors que l'ordonnanceur appelle en GET, et Express répondait 404. Personne ne l'a vu
-- pendant des semaines, pour une raison simple : une tâche qui ne s'exécute pas n'écrit
-- rien, donc « en panne » et « rien à faire » produisent exactement la même trace —
-- aucune.
--
-- Cette table renverse la charge de la preuve. Chaque exécution laisse une ligne, avant
-- même de savoir si elle réussira. Une tâche silencieuse devient donc visible : c'est
-- l'ABSENCE de ligne récente qui alerte, pas la présence d'une erreur.
--
-- RLS activée sans policy : le serveur passe par la service_role, et rien de ce qui est
-- ici ne doit être lisible depuis un navigateur.
-- ══════════════════════════════════════════════════════════════

create table if not exists cron_runs (
  id          bigserial primary key,
  -- Nom court de la tâche : "verify-reminders", "late-warnings".
  tache       text        not null,
  demarre_at  timestamptz not null default now(),
  termine_at  timestamptz,
  -- null tant que la tâche court : une ligne restée à null signale un plantage brutal
  -- (dépassement du temps imparti, fonction tuée) que le try/catch ne voit pas.
  ok          boolean,
  -- Ce que la tâche a fait : nombre d'envois, d'ignorés, répartition par palier.
  resume      jsonb,
  erreur      text
);

create index if not exists cron_runs_tache_idx on cron_runs (tache, demarre_at desc);

alter table cron_runs enable row level security;

-- Purge : on garde deux mois. Au-delà, une exécution quotidienne n'apprend plus rien, et
-- la table n'a pas vocation à devenir un historique.
-- À exécuter à la main de temps en temps :
--   delete from cron_runs where demarre_at < now() - interval '60 days';
