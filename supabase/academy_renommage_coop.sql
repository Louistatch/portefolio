-- ══════════════════════════════════════════════════════════════
-- Renommage : « droit coopératif » → « Coopératives et organisation des acteurs »
--
-- ── Pourquoi ──
--
-- Le parcours s'appelait « Droit coopératif OHADA ». Nom exact, produit invendable :
-- personne ne cherche à devenir juriste du droit coopératif. Ce que les termes de
-- référence des projets demandent, c'est quelqu'un qui sait structurer des producteurs
-- en organisations solides et les positionner dans une filière. Le droit reste la matière
-- du premier cours ; il n'est plus l'enseigne.
--
-- ── Pourquoi maintenant ──
--
-- Parce que le parcours est VIDE : zéro admission, zéro inscription, zéro planning, zéro
-- note — vérifié avant d'écrire ce fichier. Renommer un code de cours coûte une ligne
-- aujourd'hui ; dans six mois, il aurait fallu toucher aux plannings et aux relevés
-- d'étudiants réels, et ce genre de migration-là ne se fait plus.
--
-- Ce fichier n'a d'utilité que sur une base créée AVANT le renommage. Sur une base
-- vierge, academy_cours_coop_01.sql pose directement les bons noms.
-- ══════════════════════════════════════════════════════════════

update sms_courses
set code  = 'COOP-01',
    title = 'Monter et gouverner une société coopérative — le cadre OHADA'
where code = 'SCOOP-01';

update academy_program_admissions set program_id = 'coop' where program_id = 'scoops';
