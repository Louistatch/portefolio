-- ══════════════ Admission et certificat propres à un parcours ══════════════
--
-- LouisFarm délivre deux titres finaux distincts : le certificat Super-Expert MEAL, et
-- celui de la formation de formateurs. Ce sont deux cursus sans rapport, pour deux publics
-- différents. Jusqu'ici un seul test d'admission — celui du MEAL — ouvrait l'accès à TOUS
-- les cours publiés : un formateur rural devait donc répondre à trente questions sur pandas
-- et QGIS pour accéder à un cours de gestion financière paysanne.
--
-- ── Pourquoi une table et non des colonnes de plus sur `students` ──
--
-- `students` porte déjà admitted_at, admission_expires, entry_score, test_attempts,
-- next_test_allowed, final_certificate_no et final_certified_at. Dupliquer ces sept colonnes
-- par parcours n'aurait tenu qu'un temps : au troisième parcours, la table serait devenue
-- illisible et chaque ajout aurait demandé une migration. Une ligne par (étudiant, parcours)
-- absorbe les parcours suivants sans rien changer au schéma.
--
-- ── Pourquoi le cursus MEAL reste sur `students` ──
--
-- Les colonnes historiques de `students` sont lues en une trentaine d'endroits : tableau de
-- bord d'administration, relances par courriel, attestations, statistiques. Les migrer d'un
-- bloc aurait mis en jeu les 19 admissions en cours pour un gain nul le jour même. Le cursus
-- MEAL continue donc de vivre sur `students`, les autres parcours sur cette table, et le
-- code passe par une seule fonction qui sait où regarder. L'asymétrie est assumée et
-- documentée ; elle se résorbera le jour où le MEAL sera migré ici à son tour.

create table if not exists academy_program_admissions (
  id                 bigserial primary key,
  student_id         bigint not null references students(id) on delete cascade,
  -- Identifiant du parcours, tel que déclaré dans shared/programs.ts (ex. 'tof').
  program_id         text   not null,

  -- Admission
  admitted_at        timestamptz,
  admission_expires  timestamptz,
  entry_score        integer,
  test_attempts      integer not null default 0,
  last_test_at       timestamptz,
  next_test_allowed  timestamptz,

  -- Titre final du parcours
  final_certificate_no text,
  final_certified_at   timestamptz,

  created_at         timestamptz not null default now(),

  -- Une seule ligne par étudiant et par parcours : c'est ce qui rend l'octroi d'admission
  -- idempotent, deux requêtes simultanées ne pouvant pas créer deux admissions.
  unique (student_id, program_id)
);

create index if not exists idx_program_admissions_student
  on academy_program_admissions (student_id);
create index if not exists idx_program_admissions_program
  on academy_program_admissions (program_id, admitted_at);
create unique index if not exists idx_program_admissions_cert_no
  on academy_program_admissions (final_certificate_no)
  where final_certificate_no is not null;

-- ── Étudiants déjà engagés dans la formation de formateurs ──
--
-- Deux étudiants ont validé des leçons de TOF-FIN-01 via leur admission MEAL, avant que ce
-- parcours ait son propre test. Leur demander de passer un examen pour un cours qu'ils ont
-- déjà entamé leur retirerait un acquis : on les admet d'office, à la date de leur admission
-- MEAL, avec la même échéance. entry_score reste nul — ils n'ont pas passé ce test-là, et
-- inventer une note serait un mensonge dans leur dossier.
insert into academy_program_admissions
  (student_id, program_id, admitted_at, admission_expires, entry_score, test_attempts)
select distinct
  s.id, 'tof', s.admitted_at, s.admission_expires, null::integer, 0
from students s
where s.admitted_at is not null
  and exists (
    select 1
    from lesson_progress p
    join sms_lessons l on l.id = p.lesson_id
    join sms_courses c on c.id = l.course_id
    where p.student_id = s.id
      and c.code like 'TOF-%'
      and p.status = 'completed'
  )
on conflict (student_id, program_id) do nothing;

comment on table academy_program_admissions is
  'Admission et titre final propres à un parcours autre que le cursus MEAL (qui reste porté par les colonnes de students).';
