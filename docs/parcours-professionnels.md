# Parcours professionnels DATA et COOP

Cette version clarifie la provenance des données, corrige le réglage de Ridge, ajoute
22 ateliers et introduit un dossier professionnel individuel corrigé sur 100.
Les cours DATA-01 et COOP-01 restent des étapes intermédiaires ; l’attestation du
second cours exige désormais tous les cours du parcours terminés et un projet approuvé.
Le paiement ne remplace pas la validation pédagogique. Les attestations déjà émises
ne sont ni supprimées ni révoquées.

## Déploiement

1. Sauvegarder les tables sms_courses et sms_lessons et comparer leur contenu aux
   fichiers de cours : les mises à jour remplacent les contenus des 22 leçons ciblées,
   y compris les éditions éventuellement réalisées dans l’administration depuis GitHub.
2. Exécuter supabase/academy_professional_projects.sql avant le déploiement de l’API.
   Cette table utilise la clé service_role côté serveur ; aucun accès direct du navigateur.
3. Relire puis appliquer les quatre fichiers academy_cours_data_01.sql,
   academy_cours_data_02.sql, academy_cours_coop_01.sql et academy_cours_coop_02.sql.
   Les UPDATE gardent les IDs, les points et la progression des leçons existantes.
   Les INSERT ne concernent que les leçons absentes. Aucun DELETE de leçon.
4. Déployer la branche après validation. Vérifier avec des comptes de test : dépôt,
   correction, reprise, validation, refus de l’attestation sans projet puis délivrance
   après validation et satisfaction des autres conditions habituelles.
5. Informer les apprenants déjà engagés du projet attendu avant activation ; les reprises
   de projet restent soumissibles après expiration de la période d’admission (une admission
   accordée demeure nécessaire). Les mécanismes d’accès aux leçons restent ceux du site.

Le code des projets passe par l’API Vercel ; le serveur historique server/index.ts
ne reprend pas encore l’ensemble de l’Academy. Utiliser l’environnement Vercel de
prévisualisation pour le test intégré. Ne pas présenter npm run dev comme un test complet.

## Correction

Administration → Projets professionnels. Les notes par critère sont calculées côté serveur.
75/100 est le minimum. Un défaut critique bloque la validation même avec une note supérieure.
Le commentaire doit expliquer les points forts, les erreurs et les reprises attendues.
Chaque version soumise est conservée ; une correction enregistrée est immuable.
Une nouvelle version n’est possible qu’après une demande de reprise.
La liste affiche les 200 derniers dépôts ; une pagination sera nécessaire au-delà.

Le correcteur ouvre le lien fourni ; le serveur ne télécharge pas le contenu externe.
Les liens doivent être accessibles au correcteur, sans identifiants dans l’URL ni données sensibles.
Les ateliers intermédiaires enrichissent le portfolio ; leur dépôt individuel n’est pas automatisé.

## Sources pédagogiques

- OIT, My.COOP (français) : https://www.ilo.org/fr/publications/mycoop-gerer-votre-cooperative-agricole
- OHADA, sociétés coopératives : https://www.ohada.org/en/cooperative-societies-law/
- FIDA, Operations Academy : https://www.ifad.org/en/w/publications/operations-academy-ifad-operational-guidelines-on-pro-poor-value-chain-development
- ONUDI/FIDA, 25 questions : https://www.unido.org/sites/default/files/2011-12/Pro-poor_value_chain_development_2011_0.pdf
- FAOSTAT : https://www.fao.org/faostat/en/
- Scikit-learn, validation : https://scikit-learn.org/stable/modules/cross_validation.html
- Scikit-learn, fuites de données : https://scikit-learn.org/stable/common_pitfalls.html

Ces références sont des ressources complémentaires ; elles ne constituent pas une affiliation
ou une accréditation de LouisFarm. Les diapositives existantes restent des supports historiques :
le cours et le notebook révisé prévalent pour le protocole de validation des modèles.

## Vérification

- npm run check
- npm run verify:api (quatre erreurs préexistantes consignées dans la référence)
- npm run verify:projects
- npm run verify:routes
- node --import tsx script/verify-rythme.ts
- npm run build:vercel
- Les quatre generate-*-sql.ts vérifient les 118 corrigés et leurs identifiants.

La migration et les paiements n’ont pas été exécutés sur la base de production.
