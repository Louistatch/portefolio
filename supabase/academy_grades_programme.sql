-- ══════════════ Rattacher chaque note à son parcours ══════════════
--
-- Le relevé de notes mélangeait les cursus : un étudiant inscrit à la fois au MEAL et aux
-- Coopératives voyait ses notes des deux parcours entremêlées dans une seule liste
-- chronologique, sans séparation. Pour une leçon (course_id renseigné), le parcours se
-- déduit déjà du code du cours via programOf() — rien à stocker. Mais le test d'admission et
-- les travaux de groupe n'ont pas de course_id : leur seul indice de parcours était le texte
-- libre du titre ("Test d'admission — Coopératives..."), imprécis à relire côté serveur et
-- fragile au moindre changement de libellé. Une colonne explicite règle ça une fois pour
-- toutes, et les nouvelles notes la renseignent directement à l'écriture (voir api/index.ts).
alter table grades add column if not exists program_id text;

create index if not exists idx_grades_programme
  on grades (student_id, program_id) where program_id is not null;

-- Rattrapage des notes déjà enregistrées, à partir du texte du titre — seule information
-- disponible pour ces lignes anciennes.
update grades set program_id = 'meal'
  where program_id is null and type = 'entry_test' and title = 'Test d''admission MEAL';
-- Libellé le plus ancien, avant le renommage en « Test d'admission MEAL ».
update grades set program_id = 'meal'
  where program_id is null and type = 'entry_test' and title = 'Test de sélection MEAL';
update grades set program_id = 'tof'
  where program_id is null and type = 'entry_test' and title = 'Test d''admission — Formation de formateurs';
update grades set program_id = 'fca'
  where program_id is null and type = 'entry_test' and title = 'Test d''admission — Finance climatique agricole';
update grades set program_id = 'fcq'
  where program_id is null and type = 'entry_test' and title = 'Test d''admission — Finance climatique quantitative';
update grades set program_id = 'coop'
  where program_id is null and type = 'entry_test' and title = 'Test d''admission — Coopératives et organisation des acteurs';
-- Les travaux de groupe n'existent que dans le modèle WQU du cursus MEAL.
update grades set program_id = 'meal'
  where program_id is null and type = 'group_work';
