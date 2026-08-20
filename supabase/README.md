# Scripts SQL — DataMEAL Academy

Ces fichiers s'exécutent à la main dans le **SQL Editor de Supabase** (projet
`tilportefolio`). Il n'y a pas de système de migration automatique : rien ne garantit
qu'un fichier présent ici ait été exécuté, ni qu'il corresponde encore à ce qui est en
base. Lisez cette page avant d'en lancer un.

## Ordre d'installation (base vierge)

| # | Fichier | Rôle |
|---|---------|------|
| 1 | `school_management.sql` | Tables de l'Academy (`students`, `sms_courses`, `sms_lessons`, `enrollments`, `grades`, `submissions`, `attestations`) + les 3 cours MEAL |
| 2 | `academy_auth_v3.sql` | Colonnes d'authentification étudiant (vérification email, réinitialisation de mot de passe) |
| 3 | `academy_verify_code.sql` | Code de vérification à 6 chiffres |
| 4 | `academy_wqu_v4.sql` | Modèle WQU : admission, `lesson_progress`, types de certificat |
| 5 | `academy_grades_unique.sql` | `UNIQUE(student_id, lesson_id)` sur `grades` (dédoublonne d'abord) |
| 6 | `academy_emails_dedupe_key.sql` | Journal des emails + clé d'idempotence |
| 7 | `academy_meetings.sql` | Rencontres en ligne (Jitsi) |
| 8 | `kobo_course_enriched.sql` | Contenu de **MEAL-01** (7 leçons) |
| 9 | `tof_gestion_financiere_rurale.sql` | Cours **TOF-FIN-01** (12 leçons) |
| 10 | `academy_exercises_meal01.sql` | Exercices notés de MEAL-01, matière MEAL (24 exercices) |
| 11 | `academy_kobo_upgrade.sql` | Support de formation KoboToolbox fusionné dans MEAL-01, cas pratique de Kara (70 cellules, 30 captures) |
| 12 | `academy_exercises_kobo.sql` | Exercices notés sur la matière KoboToolbox (26 exercices) |
| 13 | `academy_student_names.sql` | État civil décomposé (prénom / deuxième prénom / nom) |

## Le contenu de MEAL-02 et MEAL-03 n'est PAS dans ce dépôt

Vérifié en production le 13/08/2026 : les leçons de `MEAL-02` (7 leçons, « découvrir
QGIS », « le tampon (buffer) », « Symbologie »…) et de `MEAL-03` (6 leçons) ne
correspondent à aucun fichier d'ici. Elles ont été écrites ou modifiées directement en
base. **La base de données est leur seule source de vérité.**

Conséquence pratique : avant toute restauration ou remise à plat, exportez d'abord le
contenu réel, sinon il est définitivement perdu.

```sql
-- Sauvegarde du contenu vivant avant toute manipulation destructive
SELECT c.code, l.order_index, l.title, l.points, l.content
FROM sms_lessons l JOIN sms_courses c ON c.id = l.course_id
ORDER BY c.order_index, l.order_index;
```

## Prudence avec les scripts de contenu

Un script de contenu commence en général par supprimer les leçons du cours qu'il
alimente, afin d'être rejouable :

```sql
DELETE FROM sms_lessons WHERE course_id = (SELECT id FROM sms_courses WHERE code = 'MEAL-01');
```

Sur une base vivante, cette ligne **détruit le contenu en place, les exercices ajoutés
depuis, et les `lesson_progress` liés** (cascade). Elle vide aussi le `lesson_id` des
notes déjà attribuées, ce qui laisse des notes orphelines dans les relevés.

C'est arrivé : `course_content_v2.sql` a été retiré du dépôt le 13/08/2026 pour cette
raison. Il déclarait un contenu obsolète pour les trois cours MEAL et l'aurait écrasé.
Il reste consultable dans l'historique git si besoin.

## Écrire des exercices pour un autre cours

`academy_exercises_meal01.sql` sert de modèle. Le format d'une cellule d'exercice y est
documenté en tête de fichier. Trois règles :

- le corrigé (`answer`, `accept`, `tolerance`, `explain`) reste en base et n'est jamais
  envoyé au navigateur — `stripExerciseAnswers` le retire dans `shared/exercises.ts` ;
- ciblez la leçon par mot-clé de son titre, pas par titre exact, et terminez le script
  par un `SELECT` de rapport : dans l'éditeur Supabase, un `UPDATE` sans effet affiche
  « Success. No rows returned » exactement comme un `UPDATE` réussi ;
- validez avant de déployer avec `npm run verify:exercises`, qui relit les blocs JSON de
  tous les `academy_exercises_*.sql` et rejoue la correction ;
- préfixez les identifiants d'exercice par jeu (`l…` pour la matière MEAL, `k…` pour la
  matière Kobo) : deux exercices de même id dans une leçon partageraient la même réponse
  saisie, et le second écraserait le premier à la correction.

Les captures d'écran des leçons vivent dans `client/public/academy/`, servies en statique
et référencées par un chemin interne (`/academy/kobo/…`). Elles doivent être déployées
avant d'exécuter un script qui les référence, sinon les leçons affichent des images
cassées.
