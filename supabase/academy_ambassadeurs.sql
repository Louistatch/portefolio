-- ══════════════ Programme ambassadeur ══════════════
--
-- Un étudiant qui a fait ses preuves — un mois de cours effectivement terminé, pas
-- seulement écoulé — peut devenir ambassadeur : il reçoit un code de parrainage, et touche
-- 20 % du prix de l'attestation payée par tout filleul qu'il a recruté, dès que ce paiement
-- est confirmé par le webhook FedaPay.
--
-- ── Pourquoi sur `students` et pas une table à part pour le statut ──
--
-- Le statut d'ambassadeur est un attribut de l'étudiant, au même titre que `admitted_at` ou
-- `final_certificate_no` : une valeur, jamais un historique. Une ligne par ambassadeur
-- n'apporterait rien qu'une colonne ne donne déjà, et forcerait une jointure partout où le
-- statut est juste consulté (tableau de bord, éligibilité, garde d'accès).
--
-- ── Pourquoi une vraie table pour les commissions, elle ──
--
-- Les commissions, elles, sont un historique : plusieurs filleuls, plusieurs paiements,
-- chacun avec son propre statut (en attente / payée) et sa propre date. C'est exactement la
-- distinction déjà faite ailleurs dans ce schéma entre un attribut (`final_certificate_no`
-- sur `students`) et un journal (`grades`, `academy_paiements`).
alter table students add column if not exists ambassador_code text unique;
alter table students add column if not exists ambassador_since timestamptz;

-- Qui a recruté cet étudiant, capturé à l'inscription (POST /api/academy/register avec
-- ?ref=CODE). ON DELETE SET NULL plutôt que CASCADE : la suppression d'un ambassadeur ne doit
-- pas emporter avec elle les comptes de ses filleuls.
alter table students add column if not exists referred_by_student_id integer references students(id) on delete set null;

create table if not exists academy_ambassador_commissions (
  id                  bigserial primary key,
  ambassador_id       integer not null references students(id) on delete cascade,
  referred_student_id integer not null references students(id) on delete cascade,
  -- Une commission par paiement : si le webhook FedaPay rejoue le même événement, l'insertion
  -- échoue sur cette contrainte plutôt que de créditer deux fois le même ambassadeur.
  payment_id          bigint  not null references academy_paiements(id) on delete cascade unique,
  program_id          text    not null,
  amount              integer not null,
  devise              text    not null default 'XOF',
  status              text    not null default 'en_attente', -- en_attente | payee
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);

create index if not exists idx_ambassador_commissions_ambassadeur
  on academy_ambassador_commissions (ambassador_id, status);

alter table academy_ambassador_commissions enable row level security;

comment on table academy_ambassador_commissions is
  'Commissions dues aux ambassadeurs — 20% du prix payé par chaque filleul, créditées au moment du paiement confirmé.';
