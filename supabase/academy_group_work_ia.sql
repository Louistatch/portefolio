-- ══════════════ Correction automatique des travaux de groupe par Gemini ══════════════
--
-- Les étudiants travaillent désormais ensemble sur un Google Doc (voir les consignes
-- affichées dans /academy/group-work), puis exportent ce document en PDF et le déposent
-- comme avant — le mécanisme de dépôt ne change pas, seule la manière de RÉDIGER change.
-- Une tâche quotidienne (voir api/index.ts, corpsCorrectionIAGroupWork) lit ensuite chaque
-- rapport PDF en attente, le fait noter par Gemini selon la grille du travail, et applique
-- directement la note — comme le ferait un formateur, mais bornée par le quota gratuit de
-- l'API Gemini, qui se renouvelle chaque jour.
--
-- `graded_by` distingue une note posée par l'IA d'une note posée à la main : le panneau
-- d'administration en fait un badge, pour qu'une correction automatique reste repérable
-- au premier coup d'œil et jamais confondue avec le jugement d'un formateur.
--
-- `ai_attempts`/`ai_error` gardent la trace d'un échec (PDF illisible, réponse Gemini
-- invalide, quota épuisé au milieu d'un lot) SANS bloquer le rendu : il reste au statut
-- « submitted » et repasse dans le prochain lot, ou attend une correction manuelle si
-- l'échec se répète — jamais une note fantôme ni un rendu perdu.
alter table academy_group_submissions add column if not exists graded_by text;
alter table academy_group_submissions add column if not exists ai_attempts int not null default 0;
alter table academy_group_submissions add column if not exists ai_error text;

-- Compteur du jour : une ligne par date, incrémentée à chaque appel Gemini réellement
-- effectué. La tâche s'arrête dès que `utilisees` atteint GEMINI_DAILY_QUOTA (variable
-- d'environnement) — les rendus restants patientent, toujours au statut « submitted »,
-- jusqu'au lot du lendemain.
create table if not exists academy_gemini_quota (
  jour date primary key,
  utilisees int not null default 0
);
