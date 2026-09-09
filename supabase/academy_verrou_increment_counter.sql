-- ══════════════ Fermeture de increment_counter au public ══════════════
--
-- Appliqué en production le 2026-09-09. Ce fichier documente le correctif ; la base le
-- porte déjà.
--
-- ── Ce qui était ouvert ──
--
-- `increment_counter(p_table, p_column, p_id)` est SECURITY DEFINER : elle s'exécute avec
-- les droits de son propriétaire et contourne donc RLS par construction. PostgreSQL accorde
-- EXECUTE à PUBLIC sur toute fonction créée, et Supabase expose le schéma public via
-- PostgREST : la fonction était donc appelable par le rôle `anon`, sur
-- /rest/v1/rpc/increment_counter, avec la clé anon — qui est publique par nature (elle est
-- livrée au navigateur par client/src/lib/supabase.ts et figure en clair dans vercel.json,
-- dans un dépôt public).
--
-- Le corps utilise `format('%I')`, donc l'injection SQL était bien bloquée. Ce n'était pas
-- le problème : la FONCTIONNALITÉ elle-même était la faille — un « +1 sur n'importe quelle
-- colonne entière de n'importe quelle table portant un id », offert à tout le monde.
-- Ce qu'elle atteignait réellement dans ce schéma :
--
--   students.entry_score                     le score du test d'admission (21/30 requis)
--   students.test_attempts                   le compteur de tentatives
--   grades.score, submissions.score          les notes
--   academy_ambassador_commissions.amount    un montant que Louis verse à la main
--   students.referred_by_student_id          le rattachement d'un filleul à son parrain
--
-- ── Pourquoi révoquer à PUBLIC et pas seulement à anon ──
--
-- Un premier correctif n'a retiré le droit qu'à `anon` et `authenticated`, et la
-- vérification a montré qu'ils l'avaient toujours : les deux rôles l'héritaient de PUBLIC,
-- que le REVOKE nominatif ne touche pas. C'est PUBLIC qu'il faut retirer, puis rendre le
-- droit explicitement aux seuls rôles qui l'exercent.
--
-- ── Pourquoi le serveur n'est pas affecté ──
--
-- Les huit appels du code (api/index.ts, server/routes.ts — compteurs de vues et de
-- « j'aime » sur posts et publications) passent tous par la clé service_role, à qui le droit
-- est rendu ci-dessous. Aucun appel client n'existe.
revoke execute on function public.increment_counter(text, text, integer) from public;
revoke execute on function public.increment_counter(text, text, integer) from anon, authenticated;
grant  execute on function public.increment_counter(text, text, integer) to service_role, postgres;

-- Un search_path mutable laisse l'appelant décider dans quel schéma `format` et l'UPDATE se
-- résolvent — sur une fonction SECURITY DEFINER, c'est un vecteur d'exécution de code.
alter function public.increment_counter(text, text, integer) set search_path = public, pg_temp;
alter function public.support_chercher(text, text[], integer)  set search_path = public, pg_temp;

-- ── academy_gemini_quota ──
--
-- Seule table du schéma public restée sans RLS : PostgREST la servait donc en lecture ET en
-- écriture à quiconque détient la clé anon. Remettre `utilisees` à zéro drainait le quota
-- Gemini du jour ; le saturer coupait la correction automatique des travaux de groupe.
-- Aucune policy n'est créée, comme pour les quarante autres tables : le refus par défaut EST
-- la règle, le serveur passant par service_role (voir academy_rls_lockdown.sql).
alter table public.academy_gemini_quota enable row level security;
