/**
 * Ouvrir le livret de révision d'un parcours, depuis n'importe quelle page.
 *
 * L'onglet est créé AVANT le premier await : un window.open lancé après un fetch n'est
 * plus couvert par le clic de l'utilisateur, et les bloqueurs de fenêtres l'avalent.
 * L'onglet vide reçoit l'adresse du document une fois la réponse arrivée, ou se referme
 * si le serveur refuse — c'est lui qui juge l'achèvement du parcours, jamais la page.
 *
 * `recuperer` est studentFetch côté étudiant, adminFetch côté administration : le même
 * geste sert les deux portes (/api/academy/... et /api/admin/academy/...).
 */
export async function ouvrirLivret(
  url: string,
  recuperer: (url: string) => Promise<Response>,
  signalerErreur: (message: string) => void,
): Promise<void> {
  const onglet = window.open("", "_blank");
  try {
    const r = await recuperer(url);
    if (!r.ok) {
      onglet?.close();
      const d = await r.json().catch(() => null);
      signalerErreur(d?.message || "Livret indisponible pour le moment. Réessayez plus tard.");
      return;
    }
    const adresse = URL.createObjectURL(await r.blob());
    if (onglet) onglet.location = adresse;
    // L'onglet a chargé le document bien avant : on ne libère l'adresse qu'ensuite.
    setTimeout(() => URL.revokeObjectURL(adresse), 60_000);
  } catch {
    onglet?.close();
    signalerErreur("Vérifiez votre connexion puis réessayez.");
  }
}
