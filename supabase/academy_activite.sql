-- ══════════════ Temps réellement passé sur le site ══════════════
--
-- Appliqué en production le 2026-09-09. Ce fichier documente la table ; la base la porte déjà.
--
-- ── Ce qui manquait ──
--
-- `students.last_login` disait QUAND un étudiant s'était connecté, jamais COMBIEN de temps il
-- était resté. Un compte ouvert cinq minutes et un compte ouvert trois heures se ressemblaient
-- exactement. Pour qui encadre une promotion, c'est la seule des deux données qui distingue
-- quelqu'un qui décroche de quelqu'un qui travaille sans encore marquer de points.
--
-- ── Une ligne par étudiant et par jour, pas une par session ──
--
-- Le besoin est « combien de minutes », pas « à quelle heure exactement ». Un journal de
-- sessions grossirait sans fin pour une question à laquelle un agrégat journalier répond
-- déjà, et il faudrait le purger. Ici, trente-huit étudiants sur un an font au pire quelques
-- milliers de lignes.
--
-- ── Comment le compteur est alimenté, et pourquoi il n'est pas falsifiable ──
--
-- Le client émet un signal toutes les cinq minutes, UNIQUEMENT si l'onglet est au premier
-- plan (voir client/src/hooks/use-presence.ts) : un onglet laissé ouvert derrière une autre
-- fenêtre ne compte pas — on mesure une présence, pas une session oubliée.
--
-- Le serveur, lui, ne crédite jamais un forfait : il ajoute le temps réellement écoulé depuis
-- `dernier_ping`, plafonné à l'intervalle. Appeler la route en boucle n'ajoute donc rien, et
-- deux onglets ouverts ne comptent pas double — le second signal ne trouve presque rien à
-- ajouter. C'est l'EFFET qui est plafonné, pas le nombre d'appels : un `rateLimit` par adresse
-- IP aurait puni une salle informatique entière, où plusieurs étudiants partagent une IP.
create table if not exists academy_activite (
  student_id   integer     not null references students(id) on delete cascade,
  jour         date        not null,
  minutes      integer     not null default 0,
  dernier_ping timestamptz not null default now(),
  primary key (student_id, jour)
);

comment on table academy_activite is
  'Temps de présence réel par étudiant et par jour, en minutes. Alimenté par un signal envoyé toutes les 5 minutes tant que l''onglet est visible ; le serveur ne crédite jamais plus que le temps réellement écoulé depuis le signal précédent.';

-- Le classement de l'administration lit les sept derniers jours pour toute la promotion :
-- c'est la seule requête qui balaie par date plutôt que par étudiant.
create index if not exists idx_activite_jour on academy_activite (jour desc);

alter table academy_activite enable row level security;
