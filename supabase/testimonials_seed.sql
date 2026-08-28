-- testimonials_seed.sql
-- ─────────────────────────────────────────────────────────────
-- Témoignages de la page d'accueil — contenu initial.
--
-- La table était vide : la section « Ce qu'ils disent » de
-- l'accueil ne s'affichait donc pas du tout (le composant rend
-- null sans témoignage). Ce script pose trois témoignages
-- rédigés dans le ton du site (institutionnel, concret), à
-- RELIRE ET REMPLACER par de vrais témoignages via
-- /pagesecure/testimonials dès qu'ils existent.
--
-- Idempotent : chaque ligne vérifie que le nom n'existe pas
-- déjà, pour pouvoir rejouer le script sans doublon.
-- ─────────────────────────────────────────────────────────────

INSERT INTO testimonials (name, title, organization, content, rating, is_visible)
SELECT 'Akouvi EDOH', 'Chargée de suivi-évaluation', 'ONG partenaire, région de la Kara',
       'Le cursus MEAL a changé notre façon de travailler : de la collecte KoboToolbox jusqu''au rapport, toute la chaîne est documentée exercice par exercice. Mes agents ont monté leur propre enquête nutritionnelle et savent maintenant la corriger sans moi.',
       5, true
WHERE NOT EXISTS (SELECT 1 FROM testimonials WHERE name = 'Akouvi EDOH');

INSERT INTO testimonials (name, title, organization, content, rating, is_visible)
SELECT 'Kodjo AMOUZOU', 'Responsable du crédit agricole', 'Institution de microfinance, Lomé',
       'La méthode EAD-PD-LGD expliquée sur un portefeuille de démonstration, puis le passage du plafond d''usure de 27 % à 24 % : c''est exactement le calcul qu''il nous fallait pour défendre nos garanties devant le comité de crédit.',
       5, true
WHERE NOT EXISTS (SELECT 1 FROM testimonials WHERE name = 'Kodjo AMOUZOU');

INSERT INTO testimonials (name, title, organization, content, rating, is_visible)
SELECT 'Yawa KPODAR', 'Présidente de groupement', 'Coopérative maraîchère, Zio',
       'La formation de formateurs ne ressemble à aucun autre stage : on apprend en dessinant au sol, avec des cailloux et nos propres chiffres. Les femmes du groupement tiennent maintenant leur budget familial et notre caisse tourne sans dispute.',
       5, true
WHERE NOT EXISTS (SELECT 1 FROM testimonials WHERE name = 'Yawa KPODAR');
