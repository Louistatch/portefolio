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
| 13 | `academy_exercises_meal02_meal03.sql` | Exercices notés de MEAL-02 et MEAL-03 (52 exercices) |
| 14 | `academy_student_names.sql` | État civil décomposé (prénom / deuxième prénom / nom) |
| 15 | `academy_reorder_lessons.sql` | Remise en ordre des cellules : cours d'abord, exercices notés en fin de leçon |
| 16 | `academy_group_work.sql` | Travaux de groupe (modèle WQU) : groupes, énoncés des 3 GW, rendus collectifs, calendrier individuel |
| 17 | `academy_group_work_v2.sql` | Forum de groupe, dépôt de fichiers du rendu, évaluation par les pairs, grille du formateur |
| 18 | `academy_cohort_forum.sql` | Forum de promotion (formateur ↔ cohorte) et journal des remises à zéro pour retard |
| 19 | `academy_group_work_v4.sql` | Un groupe **par travail** (équipes retirées au sort à chaque GW) + verrou de constitution |
| 20 | `academy_cron_runs.sql` | Journal des tâches planifiées — c'est l'ABSENCE de ligne récente qui alerte |
| 21 | `academy_tentatives.sql` | Compteur de tentatives sur une leçon — sans lui, un échec ne coûte rien |

## Verrouillage RLS (`academy_rls_lockdown.sql`)

À part : ce script n'est pas une migration, c'est un **durcissement de sécurité** qui
s'exécute **une fois le serveur déployé avec la clé service_role**
(`SUPABASE_SERVICE_ROLE_KEY` sur Vercel). Il active RLS sans policy sur toutes les tables
publiques qui ne l'avaient pas : la clé anon ne peut plus lire `students` (hashs de mot de
passe, jetons de vérification), `academy_emails`, `enrollments`, `grades`… L'application ne
passe jamais par PostgREST depuis le navigateur, donc rien ne change pour elle. Voir le
préambule du fichier pour l'ordre exact et les requêtes de contrôle.

## Contenus de vitrine (`testimonials_seed.sql`, `academy_illustrations_cours.sql`)

Deux scripts de **contenu**, pas de schéma, tous deux idempotents (rejouables sans doublon) :

- `testimonials_seed.sql` — pose trois témoignages pour la section « Ce qu'ils disent » de
  l'accueil (la section disparaît tant que la table est vide). Les textes sont des
  propositions à **remplacer par de vrais témoignages** depuis l'administration.
- `academy_illustrations_cours.sql` — insère les schémas pédagogiques des cours (SVG de
  `client/public/academy/{qgis,meal,tof}`) avant le premier quiz/exercice de chaque leçon.
  MEAL-02 (QGIS) était 100 % texte malgré son sujet ; TOF-FIN-01 reçoit des visuels de
  gestion financière paysanne pour un public peu lecteur.

## Les travaux de groupe (GW)

`academy_group_work.sql` ne crée que des tables **vides**. Les trois énoncés sont semés par
l'API au premier chargement de `/api/academy/group-work` (ou du tableau de bord), à partir de
`shared/groupwork.ts` ; une fois en base, c'est la base qui fait foi et les énoncés se
modifient depuis `/admin/group-work`, sans redéploiement.

Le calendrier est individuel : GW1 s'ouvre 4 semaines après l'admission de l'étudiant, GW2
après 8, GW3 après 12, avec deux semaines pour rendre chacun. Les groupes, eux, se forment
par **cohorte** — le mois d'admission — pour que les coéquipiers aient des échéances proches.
La répartition est automatique à l'ouverture du premier GW (on remplit un groupe jusqu'à
4 membres avant d'en ouvrir un autre) et se rectifie à la main dans l'administration.

Une note de GW est écrite dans `grades` pour **chaque membre**, avec `type = 'group_work'` et
`course_id` nul : elle compte dans la moyenne et le relevé comme une évaluation ordinaire,
mais n'appartient à aucun cours et ne joue donc pas sur `enrollments.progress`. L'intitulé
commence toujours par `GW1 `, `GW2 ` ou `GW3 ` — c'est ce repère qui permet à une correction
rejouée de remplacer la précédente au lieu de la doubler.

Ce script n'est pas destructif : il ne contient que des `CREATE TABLE IF NOT EXISTS`.

## L'ordre des cellules d'une leçon

Chaque apport (support Kobo, exercices) ajoutait ses cellules **à la fin** de
`content->'cells'`. Les leçons de MEAL-01 se lisaient donc « cours → exercices → encore
du cours → encore des exercices », et le cours lui-même était désordonné (la leçon 1
présentait l'outil, puis annonçait neuf cellules plus loin « Le métier, avant l'outil »).
`academy_reorder_lessons.sql` a remis les 7 leçons de MEAL-01 dans l'ordre le 20/08/2026.

**Règle à tenir pour tout nouvel apport :**

1. tout le cours ;
2. le chapeau de mise en situation (la cellule `md` qui introduit les exercices) ;
3. les exercices notés, en fin de leçon.

L'étape 3 n'est pas cosmétique : la validation d'une leçon exige d'avoir répondu à **tous**
les exercices avant de soumettre. Un exercice placé au milieu oblige donc l'étudiant à
lire la fin du cours avant de pouvoir répondre au début.

Si vous ajoutez du cours à une leçon de MEAL-01, ajoutez aussi sa clé dans la table `plan`
du script, sinon la cellule sera reléguée en fin de partie cours. Le script est idempotent
et ne perd jamais une cellule ; son `SELECT` de rapport final doit afficher `OK` ou
`sans exercice` sur toutes les lignes.

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
- écrivez **4 exercices par leçon** : le seuil de validation étant de 70 %, à 3 exercices
  2/3 = 67 % échoue et il faudrait un sans-faute, alors qu'à 4, 3/4 = 75 % passe et
  l'étudiant a droit à une erreur ;
- préfixez les identifiants d'exercice par jeu (`l…` matière MEAL de MEAL-01, `k…` matière
  Kobo de MEAL-01, `m2l…` et `m3l…` pour MEAL-02 et MEAL-03) : deux exercices de même id dans une leçon partageraient la même réponse
  saisie, et le second écraserait le premier à la correction.

Les captures d'écran des leçons vivent dans `client/public/academy/`, servies en statique
et référencées par un chemin interne (`/academy/kobo/…`). Elles doivent être déployées
avant d'exécuter un script qui les référence, sinon les leçons affichent des images
cassées.


## Relances de vérification d'adresse (tâche planifiée)

`POST /api/cron/verify-reminders` relance les étudiants dont l'adresse n'est pas confirmée.
Déclenché tous les jours à 9 h UTC par l'ordonnanceur Vercel (`crons` dans `vercel.json`).

Trois relances : **J+1**, **J+3**, **J+7** après l'inscription, puis plus rien. Au-delà de
**30 jours** le compte est considéré comme abandonné et sort de la sélection.

Le rang de la relance se déduit de l'âge du compte, jamais d'un compteur : si la tâche saute
un jour, l'étudiant reçoit la relance qui correspond à son ancienneté au lieu de la manquer.
La clé de déduplication `verify_reminder:<étudiant>:<rang>` garantit qu'un même rang ne part
qu'une fois, même si la tâche est rejouée.

**Le jeton est régénéré à chaque envoi.** `verify_expires` vaut 24 heures : réutiliser le
jeton de l'inscription enverrait un lien mort dès la relance du troisième jour. Si l'écriture
du nouveau jeton échoue, l'email n'est pas envoyé — mieux vaut pas de message qu'un lien
invalide.

### Variable d'environnement à définir

| Variable | Rôle |
|---|---|
| `CRON_SECRET` | Autorise un appel manuel : `Authorization: Bearer <secret>` |

L'ordonnanceur Vercel est reconnu par son en-tête `x-vercel-cron` et n'a pas besoin du secret.
**Sans secret défini, tout appel externe est refusé** (401) : un endpoint ouvert permettrait à
n'importe qui de déclencher un envoi de masse et de brûler la réputation du domaine d'envoi.

### Déclencher une exécution à la main

```bash
curl -X POST https://www.louisfarm.com/api/cron/verify-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

La réponse détaille le résultat : `{"candidats":5,"envoyees":3,"ignorees":2,"parEtape":{"J+1":1,"J+3":1,"J+7":1}}`.
