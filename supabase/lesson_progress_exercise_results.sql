-- Persiste la correction détaillée d'un quiz « à vous de jouer » (par exercice : réponse de
-- l'étudiant, bonne réponse, statut, explication), jusqu'ici calculée à la volée dans la
-- réponse HTTP de complete-lesson puis jetée. Sans elle, un étudiant qui recharge la page ou
-- revient plus tard sur un quiz déjà remis ne voit plus que son score — il ne peut jamais
-- revenir sur son propre travail pour comprendre ses erreurs.
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS exercise_results JSONB;
