-- ══════════════════════════════════════════════════════════════
-- L'engagement pris au moment de l'admission
--
-- ── Ce que ces deux colonnes servent à prouver ──
--
-- Le jour où quelqu'un écrira « on ne m'avait jamais dit que c'était payant », il faut
-- pouvoir répondre autre chose qu'une conviction. `engagement_at` porte la date à
-- laquelle l'étudiant a coché la phrase, et `prix_annonce` le montant qui lui était
-- affiché À CE MOMENT-LÀ.
--
-- Ce second point est le plus important, et c'est celui qu'on oublie : le tarif du
-- registre changera. Sans copie datée, on ne saurait plus quel prix a été montré à qui,
-- et une hausse de tarif réécrirait rétroactivement ce que chacun avait accepté.
--
-- ── Pourquoi ce n'est pas un verrou ──
--
-- L'admission est accordée dès la réussite du test, avant toute case à cocher. Bloquer
-- quelqu'un qui vient de réussir parce qu'il n'a pas coché serait absurde et hostile.
-- L'engagement est un ENREGISTREMENT, pas une condition — et son absence se voit :
-- l'étudiant continue de recevoir le rappel du tarif à mi-parcours.
-- ══════════════════════════════════════════════════════════════

alter table academy_program_admissions
  add column if not exists engagement_at timestamptz,
  add column if not exists prix_annonce  integer;

comment on column academy_program_admissions.engagement_at is
  'Date à laquelle l''étudiant a reconnu le tarif de l''attestation. Enregistrement, pas condition d''admission.';
comment on column academy_program_admissions.prix_annonce is
  'Montant affiché à cet instant, en francs CFA. Copie datée : le tarif du registre changera, ce qui a été accepté ne doit pas changer avec lui.';
