-- support_articles_seed.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Les vingt premiers articles du centre d'aide.
--
-- Écrits d'après les blocages CONSTATÉS, pas imaginés. Au 2 septembre 2026, sur
-- 37 inscrits : 7 n'ont jamais validé leur adresse, 6 sont vérifiés mais non
-- admis. Un tiers de l'effectif arrêté à deux étapes — d'où le poids donné aux
-- familles « inscription » et « admission ».
--
-- Chaque chiffre cité vient du code, jamais d'une supposition :
--
--   ADMISSION_MONTHS = 3            api/index.ts
--   RETRY_DAYS = 7                  api/index.ts
--   lessonsPerWeek, seuil, nbQuestions   shared/programs.ts
--   AVANCE_MAX_MS = 1 semaine       shared/rythme.ts
--   EXERCISE_PASS_PCT = 70          shared/exercises.ts
--   TENTATIVES_SANS_PENALITE = 2, plafonds 90 / 80 / 70   shared/exercises.ts
--   GROUP_WORK_WEEKS = 4, 8, 12     shared/groupwork.ts
--   GROUP_TARGET_SIZE = 3, MAX = 4  shared/groupwork.ts
--   GROUP_FORMATION_LEAD_WEEKS = 1  shared/groupwork.ts
--   GROUP_WORK_ELIGIBILITY_WEEKS = 2  shared/groupwork.ts
--   PEER_REVIEW : 4 critères x 3 points  shared/groupwork.ts
--
-- Si l'une de ces constantes change, l'article correspondant ment. C'est le
-- risque assumé d'écrire les règles en toutes lettres plutôt qu'en vague.
--
-- Le corps est en dollar-quoting : les apostrophes sont partout en français, et
-- les doubler à la main est le meilleur moyen d'introduire une coquille.
-- Réexécutable : ON CONFLICT (slug) met à jour.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.support_articles (slug, titre, resume, contenu, famille, audience, ordre) VALUES

-- ══ Inscription ═════════════════════════════════════════════════════════════

('creer-mon-compte',
 $t$Comment m'inscrire à LouisFarm Learning$t$,
 $r$L'inscription est gratuite et immédiate. C'est le test d'admission, ensuite, qui ouvre les cours.$r$,
 $c$L'inscription se fait depuis la page Inscription : nom, adresse électronique, mot de passe. Elle est gratuite et ne demande aucune pièce justificative.

Un courriel de validation part aussitôt vers l'adresse indiquée. Tant qu'il n'est pas ouvert, le compte existe mais le test d'admission reste fermé — c'est la seule chose que la validation débloque, et c'est là que s'arrête un inscrit sur cinq.

Une fois l'adresse validée, vous choisissez un parcours et passez son test d'admission. La réussite du test ouvre les cours, le calendrier et, selon le parcours, les travaux de groupe.$c$,
 'inscription', 'public', 1),

('valider-mon-adresse',
 $t$Je n'ai pas reçu le lien de validation$t$,
 $r$Le courriel arrive souvent dans les indésirables. Vous pouvez en demander un nouveau à tout moment.$r$,
 $c$À l'inscription, un lien de validation part vers votre adresse. Tant qu'il n'a pas été ouvert, le test d'admission reste fermé.

Trois choses à essayer, dans cet ordre :

1. Regardez dans vos courriers indésirables, et dans l'onglet Promotions si vous utilisez Gmail. C'est là qu'il se trouve neuf fois sur dix.
2. Le message contient aussi un code à six chiffres. Si le lien ne s'ouvre pas sur votre téléphone, saisissez le code depuis votre espace : il fait exactement la même chose.
3. Demandez un nouveau lien depuis la fenêtre d'aide. Le bouton renvoie le message immédiatement.

Le lien reste valable sept jours. Passé ce délai, il faut en demander un nouveau — l'ancien ne fonctionnera plus.

Le lien s'ouvre sur n'importe quel appareil, même un autre que celui de l'inscription : vous n'avez pas besoin d'être connecté pour valider.$c$,
 'inscription', 'public', 2),

('mot-de-passe-oublie',
 $t$J'ai oublié mon mot de passe$t$,
 $r$Depuis la page de connexion, « Mot de passe oublié » envoie un lien de réinitialisation.$r$,
 $c$Depuis la page de connexion, le lien « Mot de passe oublié » demande votre adresse et envoie un courriel de réinitialisation.

Comme pour la validation, regardez d'abord dans vos indésirables. Le lien de réinitialisation est à usage unique : une fois le nouveau mot de passe enregistré, il cesse de fonctionner.

Si vous ne recevez rien, vérifiez que vous saisissez bien l'adresse utilisée à l'inscription. Pour des raisons de confidentialité, la page répond la même chose que l'adresse existe ou non — elle ne vous dira donc pas que vous vous êtes trompé.$c$,
 'inscription', 'public', 3),

-- ══ Admission ═══════════════════════════════════════════════════════════════

('passer-le-test-dadmission',
 $t$Le test d'admission : ce qu'il contient et ce qu'il ouvre$t$,
 $r$Trente questions pour le cursus MEAL, quinze pour les autres parcours. Le seuil est de 70 %.$r$,
 $c$Chaque parcours a sa propre porte d'entrée. Réussir celui du cursus MEAL n'admet pas aux autres, et inversement.

Cursus MEAL : 30 questions, 21 bonnes réponses exigées.
Formation de formateurs, Finance climatique agricole, Finance de la chaîne de valeur : 15 questions, 11 bonnes réponses exigées.

Le seuil est le même partout — 70 % — seul le nombre de questions change. Quinze questions pour les trois derniers parcours parce que leur public anime sur le terrain et n'est pas toujours à l'aise avec un questionnaire en ligne.

Le test se passe en une fois, sans limite de temps. La réussite ouvre immédiatement les cours du parcours, génère votre calendrier et déclenche l'attestation d'admission.

Un échec n'est pas définitif : le test se repasse après sept jours.$c$,
 'admission', 'public', 1),

('repasser-le-test-dadmission',
 $t$Repasser le test après un échec$t$,
 $r$Sept jours séparent deux tentatives. Le délai sert à revoir le contenu, pas à écarter.$r$,
 $c$Après un échec, le test se rouvre au bout de sept jours. Ce délai n'est pas une sanction : il existe pour que la seconde tentative se joue sur ce que vous aurez revu entre-temps, et non sur la mémoire des questions.

Le nombre de tentatives n'est pas limité. Aucune n'est pénalisante : c'est la dernière qui compte, et une admission obtenue à la troisième tentative vaut exactement la même chose qu'à la première.

Entre deux tentatives, la page du parcours reste consultable : le programme détaillé y figure, et c'est la meilleure préparation.

Si votre situation le justifie — une coupure pendant le test, par exemple — l'équipe peut rouvrir le test avant les sept jours. Écrivez-nous depuis la fenêtre d'aide.$c$,
 'admission', 'public', 2),

('ma-fenetre-dadmission-est-terminee',
 $t$Ma fenêtre d'admission de trois mois est écoulée$t$,
 $r$L'admission ouvre l'accès pendant trois mois. Passé ce terme, une prolongation se demande à l'équipe.$r$,
 $c$L'admission à un parcours ouvre l'accès pendant trois mois, comptés depuis le jour de la réussite du test. Le calendrier des leçons est construit pour tenir dans cette fenêtre : c'est la raison du rythme hebdomadaire.

Passé ce terme, les leçons non terminées ne se valident plus. Ce qui a déjà été validé reste acquis — les notes, les attestations de cours et le certificat obtenu ne sont jamais retirés.

Une prolongation se demande depuis la fenêtre d'aide. Dites où vous en êtes et ce qui a empêché d'avancer : la demande est examinée à partir de votre dossier, qui est joint automatiquement.$c$,
 'admission', 'etudiant', 3),

-- ══ Leçons ══════════════════════════════════════════════════════════════════

('pourquoi-ma-lecon-est-verrouillee',
 $t$Pourquoi ma leçon est-elle verrouillée ?$t$,
 $r$Le calendrier ouvre les leçons semaine par semaine, et vous pouvez prendre une semaine d'avance.$r$,
 $c$Trois conditions ouvrent une leçon. La première suffit à elle seule ; les deux autres permettent d'aller plus vite.

1. Sa semaine est arrivée. Le calendrier ouvre la leçon à sa date, quoi qu'il arrive. Personne n'est donc jamais coincé : même bloqué sur une leçon difficile, vous verrez la suivante s'ouvrir.
2. C'est la leçon suivante d'un cours déjà entamé, et vous avez terminé celle d'avant.
3. C'est la première leçon d'un cours dont le précédent est entièrement terminé.

Les conditions 2 et 3 sont bornées à une semaine d'avance. Vous pouvez donc anticiper de sept jours au maximum, pas d'un trimestre : le rythme existe pour que le parcours tienne dans la fenêtre de trois mois, et pour que les séances en direct et les travaux de groupe tombent au moment où le groupe en est au même point.

Une leçon déjà ouverte ne se referme jamais, même si le calendrier change.$c$,
 'lecons', 'etudiant', 1),

('combien-de-lecons-par-semaine',
 $t$Combien de leçons s'ouvrent chaque semaine ?$t$,
 $r$Deux par semaine pour le cursus MEAL, une pour les trois autres parcours.$r$,
 $c$Le rythme dépend du parcours, et il est calculé pour que le programme entier tienne dans les treize semaines de la fenêtre d'admission.

Cursus MEAL : 2 leçons par semaine. Vingt leçons, donc dix semaines.
Formation de formateurs : 1 leçon par semaine. Douze leçons, donc douze semaines.
Finance climatique agricole et Finance de la chaîne de valeur : 1 leçon par semaine.

Les parcours avancent en parallèle : si vous êtes admis à deux d'entre eux, leurs calendriers courent en même temps et sont indépendants. À l'intérieur d'un parcours, en revanche, les cours s'enchaînent : on termine le premier avant d'entamer le second.

Votre calendrier personnel figure sur votre tableau de bord, avec la date d'ouverture de chaque leçon.$c$,
 'lecons', 'etudiant', 2),

('valider-un-exercice',
 $t$Comment les exercices sont notés$t$,
 $r$Il faut 70 % pour valider. Les deux premières tentatives sont sans conséquence sur la note.$r$,
 $c$Chaque leçon se termine par des exercices, et il faut 70 % de bonnes réponses pour la valider.

Les deux premières tentatives sont sans conséquence : une connexion qui lâche à l'envoi, un doigt qui valide trop tôt sur un petit écran, une consigne relue de travers — la première reprise ne dit rien de ce que vous savez.

À partir de la troisième, la note est plafonnée : 90 % à la troisième tentative, 80 % à la quatrième, 70 % ensuite. Le plancher est le seuil lui-même : la persévérance valide toujours la leçon, elle cesse seulement de valoir autant que la maîtrise. Une leçon qu'on ne pourrait plus valider après cinq essais serait un cul-de-sac.

En cas d'échec, vous voyez QUELS items sont faux, mais pas les bonnes réponses — sinon un échec volontaire serait le chemin le plus court vers le corrigé.

La correction est faite par le serveur. Rien de ce qui tourne dans votre navigateur n'attribue de points.$c$,
 'lecons', 'etudiant', 3),

('executer-du-python',
 $t$Exécuter du Python dans la leçon$t$,
 $r$Python tourne dans votre navigateur, à la demande. Il sert à voir tourner votre code, pas à vous noter.$r$,
 $c$Certaines leçons contiennent des cellules de code Python exécutables. Le langage tourne entièrement dans votre navigateur : rien n'est envoyé à un serveur, et vous pouvez tout modifier.

Le moteur pèse 11,5 Mo et n'est téléchargé qu'au premier clic sur « Exécuter ». Il ne part jamais tout seul : si vous ne cliquez pas, votre forfait n'est pas entamé. Une fois chargé, il reste disponible pour toute la session.

Sur une connexion mobile lente, comptez une à deux minutes pour ce premier chargement. Il n'a lieu qu'une fois par session, et seuls les paquets réellement importés par votre code sont ensuite téléchargés.

Ce que cette exécution ne fait PAS : vous noter. Ce qui tourne dans votre navigateur est modifiable par vous, donc sans valeur comme preuve. C'est une boucle de retour — « mon code tourne, voici ce qu'il affiche » — et rien d'autre. Les points viennent de la valeur que vous saisissez dans l'exercice, comparée à une clé qui ne quitte jamais le serveur.$c$,
 'lecons', 'etudiant', 4),

('je-suis-en-retard',
 $t$Je suis en retard sur mon calendrier$t$,
 $r$Le retard n'efface rien. Les leçons dépassées restent accessibles jusqu'au terme des trois mois.$r$,
 $c$Une leçon dont la date de rendu est passée apparaît comme manquée, mais elle reste ouverte et validable : le retard ne referme rien avant le terme de la fenêtre de trois mois.

Des rappels automatiques partent quand le retard s'installe. Ils ne sont pas une sanction, mais un signal : à partir d'un certain écart, rattraper devient difficile sans réorganiser, et mieux vaut le savoir tôt.

Si le retard devient trop important pour être rattrapé dans la fenêtre, l'équipe peut remettre le parcours à zéro plutôt que de le laisser expirer. Vous recommencez alors avec un calendrier neuf, en conservant ce qui a été validé.

Dans tous les cas, écrivez plutôt que d'attendre : une demande envoyée dans les trois mois se traite ; après l'expiration, il faut refaire le test d'admission.$c$,
 'lecons', 'etudiant', 5),

-- ══ Travaux de groupe ═══════════════════════════════════════════════════════

('travaux-de-groupe-comment-ca-marche',
 $t$Comment fonctionnent les travaux de groupe$t$,
 $r$Trois travaux collectifs, aux semaines 4, 8 et 12. Ils comptent pour le certificat au même titre que les leçons.$r$,
 $c$Trois travaux collectifs jalonnent le parcours, un par mois : semaines 4, 8 et 12 après votre admission.

Les groupes comptent trois personnes — exceptionnellement quatre quand l'effectif ne tombe pas juste. Ils sont tirés au sort à chaque travail : vous ne gardez pas les mêmes coéquipiers d'un travail à l'autre, et la place de quatrième tourne d'elle-même.

Le groupe est constitué une semaine avant l'ouverture du travail. Assez tôt pour se présenter, lire l'énoncé et se répartir la charge ; pas plus tôt, car une équipe annoncée un mois à l'avance est une équipe oubliée le jour venu. Un forum de groupe est ouvert en même temps, et chaque message y déclenche une notification par courriel.

La fenêtre de dépôt dure une semaine. Ce qui est borné à une semaine, c'est la remise, pas la préparation.

Point important : les travaux de groupe comptent pour le certificat final au même titre que les leçons. Avoir terminé toutes les leçons ne suffit pas.$c$,
 'groupes', 'admis', 1),

('je-nai-pas-de-groupe',
 $t$Je n'ai pas encore de groupe$t$,
 $r$Les groupes se forment une semaine avant chaque travail. Le dispositif ne concerne pas les parcours déjà bien entamés.$r$,
 $c$Deux raisons possibles, et aucune n'est un refus.

La première : ce n'est pas encore le moment. Les équipes du premier travail se forment en semaine 3, celles du deuxième en semaine 7, celles du troisième en semaine 11. Avant cela, il n'y a rien à afficher.

La seconde : votre parcours était déjà entamé quand les travaux de groupe ont été ajoutés au dispositif. Ils ne s'appliquent qu'aux étudiants dont le parcours commence à peine — au plus tard dans leur deuxième semaine. Imposer trois évaluations collectives à quelqu'un déjà en semaine 9 reviendrait à changer les règles au milieu de la partie : deux d'entre elles seraient en retard le jour même de leur apparition.

Si vous pensez être dans le premier cas et que la semaine est passée, écrivez-nous : votre dossier sera joint automatiquement à la demande.$c$,
 'groupes', 'admis', 2),

('evaluation-par-les-pairs',
 $t$L'évaluation par les pairs$t$,
 $r$Noter ses coéquipiers : quatre critères à trois points. Elle documente les contributions, elle ne change pas la note du projet.$r$,
 $c$À la fin de chaque travail collectif, chaque membre note ses coéquipiers — les AUTRES membres de son groupe, jamais lui-même — sur quatre critères, trois points chacun, soit douze au total.

Elle tient en un écran, ce qui est la condition pour qu'elle soit réellement remplie.

Ce qu'elle fait : documenter la contribution de chaque coéquipier. Un rendu collectif sans trace des contributions devient ingérable dès qu'un membre conteste.

Ce qu'elle ne fait pas : changer la note du projet. Celle-ci est attribuée par l'équipe pédagogique sur le rendu lui-même, avec sa propre grille.

Les notes que vous donnez à vos coéquipiers ne leur sont pas montrées nominativement.$c$,
 'groupes', 'admis', 3),

-- ══ Séances en direct ═══════════════════════════════════════════════════════

('rejoindre-une-seance',
 $t$Rejoindre une séance en direct$t$,
 $r$Un salon d'entrée vérifie caméra et micro avant d'entrer, et estime ce que la séance consommera.$r$,
 $c$Les séances figurent sur votre tableau de bord, avec leur date et leur durée. Le bouton pour entrer apparaît peu avant l'heure.

Avant d'entrer, un salon d'entrée vous montre votre image, fait bouger un indicateur quand vous parlez, et affiche ce que la séance consommera en données selon que vous entrez en vidéo ou en voix seule. Vérifiez-y les deux avant d'entrer : régler une caméra pendant que quinze personnes attendent est le meilleur moyen de perdre le début.

Le salon relâche la caméra et le micro au moment d'entrer. C'est nécessaire : sur beaucoup d'appareils Android, un périphérique encore tenu par la page ne peut pas être ouvert une seconde fois, et vous entreriez sans image à cause de l'écran censé la vérifier.

Depuis un téléphone, préférez le navigateur plutôt que d'installer une application : la séance fonctionne directement dans Chrome et Safari.$c$,
 'seances', 'admis', 1),

('la-salle-attend-un-moderateur',
 $t$La salle affiche « en attente d'un modérateur »$t$,
 $r$C'est normal : la séance n'ouvre qu'à l'arrivée du formateur. Il n'y a rien à faire de votre côté.$r$,
 $c$Si l'écran indique qu'il attend un modérateur, la séance n'a pas encore été ouverte par le formateur. Ce n'est pas une panne, et ce n'est pas votre connexion.

Ce que cela veut dire : le service de visioconférence n'ouvre la salle qu'à l'arrivée de la personne qui l'anime. Tant qu'elle n'est pas entrée, les participants patientent sur cet écran, quel que soit leur nombre.

Ce qu'il faut faire : rester sur la page. Vous entrerez automatiquement dès l'ouverture, sans avoir à recharger.

Si l'attente dépasse largement l'heure annoncée, écrivez-nous depuis la fenêtre d'aide plutôt que de quitter : la séance a peut-être été déplacée.$c$,
 'seances', 'admis', 2),

('economiser-mes-donnees',
 $t$Suivre une séance sans épuiser mon forfait$t$,
 $r$La voix seule consomme environ quinze fois moins que la vidéo. L'estimation est affichée avant d'entrer.$r$,
 $c$Une séance en vidéo consomme de l'ordre de 1 000 kbit/s, la voix seule environ 60. Sur une séance de 90 minutes, la différence se compte en centaines de mégaoctets.

Le salon d'entrée affiche l'estimation en mégaoctets avant que vous entriez, et la met à jour quand vous basculez en voix seule. Regardez-la : c'est la seule information qui permette de décider en connaissance de cause.

Entrer en voix seule ne vous coupe pas de la séance. Vous voyez les diapositives et le partage d'écran du formateur, vous entendez tout, vous pouvez parler et écrire dans la conversation. Seule votre propre image n'est pas transmise, et vous pouvez l'activer à tout moment pendant la séance.

Sur une connexion instable, la voix seule est aussi le moyen le plus sûr de rester audible : c'est la vidéo qui saute en premier quand le débit baisse.$c$,
 'seances', 'admis', 3),

-- ══ Certificats ═════════════════════════════════════════════════════════════

('ou-est-mon-certificat',
 $t$Où est mon certificat ?$t$,
 $r$Je n'ai rien reçu : terminer toutes les leçons ne suffit pas, les travaux de groupe doivent aussi être rendus et notés.$r$,
 $c$Si vous n'avez rien reçu, c'est presque toujours qu'une des deux conditions manque. Le certificat final est délivré automatiquement, sans démarche de votre part, dès que les deux sont réunies :

1. toutes les leçons du parcours sont terminées ;
2. tous vos travaux de groupe sont rendus ET notés.

C'est la seconde qui surprend le plus souvent. On peut avoir terminé les vingt leçons du cursus MEAL et attendre encore la note d'un travail collectif : le certificat ne part qu'à la dernière note enregistrée.

Un travail rendu mais pas encore noté compte donc comme non terminé. Le délai de correction dépend de l'équipe pédagogique, pas d'une machine.

Le certificat arrive par courriel et reste téléchargeable depuis votre espace. Si le courriel n'est pas arrivé alors que les deux conditions sont remplies, regardez dans vos indésirables, puis écrivez-nous.

Chaque parcours délivre son propre titre : réussir le cursus MEAL ne délivre pas celui de la formation de formateurs.$c$,
 'certificats', 'admis', 1),

('attestation-de-cours',
 $t$Attestation de cours et certificat final : la différence$t$,
 $r$L'attestation porte sur un cours et se demande. Le certificat porte sur le parcours entier et part tout seul.$r$,
 $c$Deux documents différents, souvent confondus.

L'attestation de cours porte sur UN cours achevé. Elle se demande depuis votre espace une fois le cours terminé à 100 % et votre adresse validée. Elle est ensuite examinée par l'équipe : ce n'est pas automatique, et un refus est motivé — vous pouvez alors redemander.

Le certificat final porte sur le parcours ENTIER. Il ne se demande pas : il part automatiquement quand toutes les leçons et tous les travaux de groupe sont validés.

Les deux portent un numéro vérifiable publiquement.$c$,
 'certificats', 'etudiant', 2),

('verifier-un-certificat',
 $t$Vérifier l'authenticité d'un certificat$t$,
 $r$Chaque document porte un numéro vérifiable en ligne, sans compte ni connexion.$r$,
 $c$Chaque attestation et chaque certificat délivrés par LouisFarm Learning portent un numéro unique.

La page de vérification est publique : elle ne demande ni compte, ni connexion, ni adresse électronique. Saisissez le numéro figurant sur le document, et la page confirme — ou non — qu'il a bien été délivré, à qui, pour quel parcours et à quelle date.

Un employeur, une banque ou une ONG peut donc contrôler un document reçu sans passer par vous ni par nous. C'est le but : un certificat qui ne se vérifie pas ne vaut que la confiance qu'on accorde au papier.

Si un numéro ne renvoie rien, c'est qu'il n'a pas été délivré par la plateforme.$c$,
 'certificats', 'public', 3)

ON CONFLICT (slug) DO UPDATE SET
  titre    = EXCLUDED.titre,
  resume   = EXCLUDED.resume,
  contenu  = EXCLUDED.contenu,
  famille  = EXCLUDED.famille,
  audience = EXCLUDED.audience,
  ordre    = EXCLUDED.ordre,
  updated_at = NOW();


-- ── Ce que ces vingt articles couvrent, mesuré ──────────────────────────────
--
-- Vingt questions écrites comme un étudiant les taperait — sans accents, en
-- phrases — passées à support_chercher() : les vingt trouvent leur article EN
-- TÊTE de résultat, aucune ne renvoie rien.
--
-- Deux ne l'ont pas fait au premier essai, et c'étaient les ARTICLES qui étaient
-- en tort, pas la recherche :
--
--   « noter mes coequipiers »        → tombait sur « Comment les exercices sont
--     notés », parce que le mot « coéquipier » ne figurait nulle part dans
--     l'article sur l'évaluation par les pairs, qui disait « les autres membres
--     de son groupe ».
--   « je nai pas recu mon certificat » → tombait sur « Vérifier l'authenticité
--     d'un certificat », seul article à contenir « reçu ».
--
-- Les deux articles emploient maintenant les mots des étudiants. C'est la règle
-- qu'il faut garder en écrivant les suivants : un article se rédige avec le
-- vocabulaire de celui qui cherche, pas avec celui du code.
