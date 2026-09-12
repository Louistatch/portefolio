-- Appliquer avant de déployer les routes et l’interface des projets.
-- Aucun accès direct depuis le navigateur : authentification applicative dans l’API.
begin;
create table if not exists public.academy_professional_projects (
  id bigint generated always as identity primary key,
  student_id integer not null references public.students(id) on delete cascade,
  program_id text not null check (program_id in ('data','coop')),
  title text not null,
  url text not null check (url like 'https://%'),
  summary text not null,
  status text not null default 'submitted' check (status in ('submitted','approved','changes_requested')),
  score numeric check (score between 0 and 100),
  rubric_scores jsonb,
  critical_issue boolean,
  feedback text,
  reviewed_by integer,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (status <> 'approved' or (score is not null and score >= 75 and critical_issue is false and reviewed_at is not null and feedback is not null))
);
create unique index if not exists academy_project_active
  on public.academy_professional_projects(student_id, program_id)
  where status in ('submitted','approved');
alter table public.academy_professional_projects enable row level security;
revoke all on public.academy_professional_projects from anon, authenticated;
grant all on public.academy_professional_projects to service_role;
grant usage, select on sequence public.academy_professional_projects_id_seq to service_role;
commit;
