-- Expose le plan de rapport (propre à chaque GW) que generate-gw-docs.ts bake déjà dans le
-- modèle DOCX téléchargeable, mais qui restait invisible à l'API et donc à la page
-- « Travaux de groupe ». Sans lui, les instructions de rédaction dans Google Docs ne
-- montraient que la grille de notation — générique — sans le plan de rapport du travail.
ALTER TABLE academy_group_works ADD COLUMN IF NOT EXISTS plan JSONB;

UPDATE academy_group_works SET plan = '[
  {"titre": "1. Cadrage de l''enquête", "consigne": "Question d''évaluation, population cible, indicateurs nutritionnels retenus et pourquoi ceux-là."},
  {"titre": "2. Le formulaire", "consigne": "Structure, types de réponse, contraintes de validation et sauts conditionnels. Expliquez ce que chaque contrainte empêche."},
  {"titre": "3. Plan d''échantillonnage", "consigne": "Taille, méthode de tirage, base de sondage. Un échantillon non justifié est un échantillon non défendable."},
  {"titre": "4. Test de terrain et limites", "consigne": "Ce que vos 5 soumissions de test ont révélé, et ce que votre dispositif ne permettra pas de conclure."}
]'::jsonb WHERE gw_index = 1;

UPDATE academy_group_works SET plan = '[
  {"titre": "1. Données et préparation", "consigne": "Sources, projection retenue, import des points GPS, nettoyages effectués. Quelqu''un doit pouvoir refaire vos cartes à partir de cette section."},
  {"titre": "2. L''analyse tampon", "consigne": "Comment vous avez construit les zones de 500 m, et combien de ménages tombent hors couverture. Donnez le chiffre."},
  {"titre": "3. Choix cartographiques", "consigne": "Variable représentée, discrétisation, symbologie, mise en page. Justifiez la discrétisation."},
  {"titre": "4. Lecture et limites", "consigne": "Ce que montre la carte — nommez les zones, chiffrez — puis ce qu''elle ne montre pas."}
]'::jsonb WHERE gw_index = 2;

UPDATE academy_group_works SET plan = '[
  {"titre": "1. Architecture de la chaîne", "consigne": "De l''API Kobo au PDF : quelles étapes, quels outils, quels formats intermédiaires."},
  {"titre": "2. Le moteur d''analyse", "consigne": "Les indicateurs calculés, et ce qui rend le moteur réutilisable sur une autre enquête."},
  {"titre": "3. Le rapport produit", "consigne": "Ce que le rapport affiche, pour qui, à quelle fréquence. Cette section doit rester valable après une mise à jour des données."},
  {"titre": "4. Éthique, qualité et limites", "consigne": "Anonymisation, consentement, contrôles qualité — et ce qui reste manuel dans la chaîne."}
]'::jsonb WHERE gw_index = 3;
