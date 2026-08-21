-- ════════════════════════════════════════════════════════════════
-- Newsletter — cibler une campagne sur un groupe d'abonnés
--
-- Jusqu'ici, envoyer une campagne l'expédiait à TOUS les abonnés actifs. Un message
-- destiné aux étudiants d'une formation partait donc aussi aux abonnés de la newsletter
-- générale, qui n'avaient rien demandé.
--
-- `newsletter_campaigns.target_source` restreint l'envoi aux abonnés dont
-- `subscribers.source` correspond. NULL conserve le comportement historique : tous les
-- abonnés actifs. Les campagnes déjà en base restent donc inchangées.
--
-- Le groupe se choisit dans l'interface d'administration (Newsletter → Destinataires),
-- qui affiche le nombre réel de destinataires avant l'envoi et le rappelle dans la
-- fenêtre de confirmation.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS target_source text;

COMMENT ON COLUMN newsletter_campaigns.target_source IS
  'Source d''abonnés visée (subscribers.source). NULL = tous les abonnés actifs.';

-- ── Rapport : les groupes disponibles et leur effectif ──
SELECT source AS groupe, count(*) AS abonnes_actifs,
       count(*) FILTER (WHERE name IS NOT NULL AND name <> '') AS avec_nom
FROM subscribers
WHERE status = 'active'
GROUP BY source
ORDER BY abonnes_actifs DESC;
