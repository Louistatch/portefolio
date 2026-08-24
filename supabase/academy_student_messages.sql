-- ══════════════ Messages écrits à un étudiant depuis l'administration ══════════════
--
-- L'administration savait admettre, vérifier une adresse, réinitialiser un test, révoquer une
-- admission — mais pas écrire. Le seul moyen de s'adresser à un étudiant était la newsletter,
-- qui part à tout le monde, ou la boîte personnelle de Louis, qui ne laisse aucune trace dans
-- la plateforme. Un message individuel destiné à expliquer une décision — une admission
-- d'office, un parcours réorganisé — n'avait nulle part où exister.
--
-- ── Pourquoi un brouillon, et pas un envoi direct ──
--
-- Un message à un étudiant se relit. Il porte le nom de Louis, il annonce souvent une
-- décision, et il ne se rattrape pas une fois parti. L'état `draft` permet de l'écrire, de le
-- laisser reposer et de le relire avant de cliquer. L'envoi est alors un geste explicite,
-- distinct de l'écriture.
--
-- ── Pourquoi conserver le corps après l'envoi ──
--
-- academy_emails garde la trace qu'un courriel est parti, avec son objet, mais pas son texte.
-- Quand un étudiant répond « vous m'aviez dit que… » trois semaines plus tard, il faut pouvoir
-- relire ce qui lui a été écrit. Le corps reste donc ici, figé à l'envoi.

create table if not exists academy_student_messages (
  id          bigserial primary key,
  student_id  bigint not null references students(id) on delete cascade,

  subject     text not null,
  -- Texte au format simple : ligne vide = paragraphe, **gras**, « - » en début de ligne = puce.
  -- Volontairement pas de HTML libre : le corps est composé dans l'administration et rendu
  -- dans le gabarit du site, pas collé tel quel dans un courriel.
  body        text not null,

  -- draft → sent, ou draft → failed si l'envoi échoue. Un message envoyé n'est plus modifiable.
  status      text not null default 'draft',
  error       text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  sent_at     timestamptz,

  constraint academy_student_messages_status_check
    check (status in ('draft', 'sent', 'failed'))
);

create index if not exists idx_student_messages_student
  on academy_student_messages (student_id, created_at desc);
create index if not exists idx_student_messages_status
  on academy_student_messages (status, created_at desc);

comment on table academy_student_messages is
  'Messages individuels écrits depuis l''administration : brouillon, puis envoi explicite.';
