-- ══════════════════════════════════════════════════════════════
-- TOF-FIN-01 : les douze quiz deviennent des exercices notés
--
-- Le défaut
-- ---------
-- Les douze leçons du parcours ne contenaient aucune cellule `exercise`. Or
-- `complete-lesson` accorde la note maximale quand il n'y a rien à corriger :
--
--     const finalScore = graded ? Math.round(maxScore * pct / 100) : maxScore;
--
-- Douze notes de 10/10 pour douze clics, sur le parcours qui forme les
-- animateurs ruraux — et sur un site qui écrit, en page d'accueil, « évalués par
-- exercices corrigés, pas par attestation de présence ».
--
-- Ce qui existait déjà
-- -------------------
-- Chaque leçon portait pourtant UNE question, en cellule `quiz` : auto-corrigée
-- dans le navigateur, jamais notée, et dont la réponse (`ans`) partait au client
-- puisque stripExerciseAnswers ne filtre que les cellules `exercise`. Le matériel
-- était donc là — quatre de ces questions sont de vrais calculs en FCFA — dans le
-- mauvais type de cellule.
--
-- Ce que fait cette migration
-- ---------------------------
-- Elle convertit, sans rien réécrire du fond :
--
--     type "quiz"  → "exercise"        question → prompt
--     ans          → answer            opts     → opts (inchangé)
--                    kind "choice"     id       → "tof-l<n>-e1", stable
--
-- `explain` reprend le texte de l'option juste, préfixé « Réponse attendue : ».
-- Ce n'est pas une correction rédigée — c'est ce que le quiz montrait déjà, rendu
-- au moment où il est mérité. Les douze corrections restent à écrire.
--
-- Effet immédiat : la réponse cesse de partir au navigateur, la note se gagne, et
-- le plafond par tentative s'applique comme sur les autres parcours.
--
-- Un seul QCM par leçon reste maigre. C'est une reprise de contrôle, pas une
-- évaluation aboutie : à terme, trois ou quatre exercices par leçon, dont les
-- calculs déjà présents dans le texte.
--
-- Idempotente : la clause finale ne retient que les leçons portant encore un quiz.
-- ══════════════════════════════════════════════════════════════

update sms_lessons l
set content = jsonb_set(
  l.content,
  '{cells}',
  (
    select jsonb_agg(
      case
        when e->>'type' = 'quiz' then jsonb_build_object(
          'id',      'tof-l' || l.order_index || '-e1',
          'type',    'exercise',
          'kind',    'choice',
          'prompt',  e->>'question',
          'opts',    e->'opts',
          'answer',  (e->>'ans')::int,
          'explain', 'Réponse attendue : ' || (e->'opts'->>((e->>'ans')::int))
        )
        else e
      end
      order by ord
    )
    from jsonb_array_elements(l.content->'cells') with ordinality as t(e, ord)
  )
)
from sms_courses c
where c.id = l.course_id
  and c.code = 'TOF-FIN-01'
  and l.content->'cells' @> '[{"type":"quiz"}]';

-- Contrôle : doit renvoyer 12 exercices et 0 quiz.
-- select count(*) filter (where e->>'type'='exercise') as exercices,
--        count(*) filter (where e->>'type'='quiz')     as quiz
-- from sms_lessons l join sms_courses c on c.id = l.course_id
-- cross join lateral jsonb_array_elements(l.content->'cells') e
-- where c.code = 'TOF-FIN-01';
