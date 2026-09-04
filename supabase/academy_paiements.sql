-- ══════════════════════════════════════════════════════════════
-- Paiement de l'attestation
--
-- ── Le modèle ──
--
-- La formation est gratuite. Ce qui se paie, c'est le document vérifiable délivré à la
-- fin — dix mille francs pour le parcours « Coopératives et organisation des acteurs ».
-- Conséquence à assumer : la recette n'est plus proportionnelle aux inscriptions, elle
-- est proportionnelle aux ACHÈVEMENTS. Tout ce qui fait terminer un étudiant devient une
-- ligne de chiffre d'affaires, à commencer par les relances quotidiennes.
--
-- ── Pourquoi une table et pas un simple drapeau sur students ──
--
-- Parce qu'un paiement laisse une trace qui doit survivre à tout le reste : le jour où
-- l'activité se formalise, c'est cette table qui portera la comptabilité, et un booléen
-- « a payé » n'aurait ni date, ni montant, ni référence, ni preuve. On garde donc la
-- charge utile du webhook telle qu'elle est arrivée, sans la retraiter.
--
-- ── Ce que la contrainte d'unicité garantit ──
--
-- `unique (reference)` : notre référence est générée une fois par tentative et sert de
-- clé d'idempotence. Un webhook rejoué — ils le sont, par conception — retrouve la ligne
-- au lieu d'en créer une seconde. Sans elle, un étudiant qui paie une fois pourrait
-- apparaître comme en ayant payé trois.
--
-- ── Ce qui n'est PAS ici ──
--
-- Aucune donnée de carte, aucun numéro de téléphone de paiement, aucun identifiant
-- d'opérateur. Tout cela reste chez l'opérateur de paiement ; nous ne stockons que ce
-- qu'il nous renvoie sur l'état de la transaction. C'est la seule position tenable pour
-- un dispositif qui n'a pas de certification de sécurité des paiements.
--
-- RLS activée sans policy : le serveur passe par la service_role, et rien de ce qui est
-- ici ne doit être lisible depuis un navigateur.
-- ══════════════════════════════════════════════════════════════

create table if not exists academy_paiements (
  id             bigserial primary key,
  student_id     integer     not null references students(id) on delete cascade,
  -- Identifiant du parcours (shared/programs.ts), pas du cours : c'est le parcours qui
  -- porte le prix, et l'attestation qui se paie est celle de son titre.
  program_id     text        not null,
  -- En francs CFA, entier. La zone UEMOA n'a pas de subdivision en usage : introduire des
  -- centimes ici ne ferait qu'ouvrir la porte aux erreurs d'arrondi.
  montant        integer     not null,
  devise         text        not null default 'XOF',
  -- Notre référence, générée avant l'appel à l'opérateur. Sert de clé d'idempotence.
  reference      text        not null unique,
  -- L'identifiant de la transaction chez l'opérateur, connu après création.
  transaction_id text,
  -- en_attente | paye | echoue | annule
  statut         text        not null default 'en_attente',
  paye_at        timestamptz,
  -- La charge utile du webhook, telle que reçue. C'est la pièce justificative.
  charge         jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists academy_paiements_etudiant_idx
  on academy_paiements (student_id, program_id, statut);
create index if not exists academy_paiements_transaction_idx
  on academy_paiements (transaction_id);

alter table academy_paiements enable row level security;

comment on column academy_paiements.reference is
  'Notre référence, générée avant l''appel à l''opérateur. Clé d''idempotence : un webhook rejoué retrouve la ligne au lieu d''en créer une seconde.';
comment on column academy_paiements.charge is
  'Charge utile du webhook, telle que reçue. Pièce justificative — ne pas retraiter.';

-- ── L'antériorité, écrite plutôt que sous-entendue ──
--
-- Les étudiants inscrits avant la bascule gardent la gratuité. La date est posée ici en
-- dur plutôt que dans le code, pour qu'elle soit lisible par quelqu'un qui n'ouvre que la
-- base — et pour qu'elle ne bouge pas au gré d'un déploiement.
create table if not exists academy_gratuite_historique (
  student_id integer primary key references students(id) on delete cascade,
  motif      text not null,
  pose_at    timestamptz not null default now()
);

alter table academy_gratuite_historique enable row level security;

insert into academy_gratuite_historique (student_id, motif)
select id, 'inscrit sous la promesse « c''est gratuit, et ça le restera »'
from students
on conflict (student_id) do nothing;
