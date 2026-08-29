-- ══════════════════════════════════════════════════════════════
-- Compteur de tentatives sur une leçon
--
-- Pourquoi
-- --------
-- Un échec aux exercices n'enregistrait rien : ni note, ni trace. La réponse
-- d'échec renvoyait en revanche la correction rédigée de CHAQUE exercice, y
-- compris les ratés — et `explain` énonce la bonne réponse en toutes lettres.
-- La suite tenait en trois gestes : soumettre n'importe quoi, lire les
-- corrections, resoumettre. Note maximale, aucune trace.
--
-- Deux verrous en découlent, et il faut les deux. Ne plus livrer la correction
-- ne suffit pas : sur un QCM à quatre options, savoir seulement QUELS items sont
-- faux permet encore de converger en quelques essais. Compter les tentatives
-- rend cette convergence visible, et coûteuse.
--
-- Le compteur ne se remet jamais à zéro : c'est l'historique de l'effort, pas un
-- solde.
-- ══════════════════════════════════════════════════════════════

alter table lesson_progress
  add column if not exists tentatives integer not null default 0;
