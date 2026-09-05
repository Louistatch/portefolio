-- ══════════════ Exclusion des classements ══════════════
--
-- Louis a un compte étudiant qu'il utilise pour tester les fonctionnalités de l'académie —
-- ses propres notes de test y apparaissaient, et le classement (top 10, cumul de points,
-- admin comme par parcours) le montrait aux côtés de vrais étudiants. Un administrateur qui
-- teste n'est pas en compétition avec sa propre promotion : cette colonne le retire du
-- calcul sans supprimer ni son compte ni ses notes, qui restent utiles pour vérifier que la
-- notation fonctionne.
--
-- Générale plutôt que nommée "exclure_admin" : elle sert tout compte à écarter d'un
-- classement pour une raison quelconque (compte de test, litige, demande de l'étudiant),
-- pas seulement celui de Louis.
alter table students add column if not exists exclude_from_leaderboard boolean not null default false;

update students set exclude_from_leaderboard = true where id = 5; -- Louis Tatchida (ccsagro2.0@gmail.com)
