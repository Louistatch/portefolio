import { useEffect, useState } from "react";

/**
 * Les fenêtres de consentement (conditions d'utilisation, cookies, newsletter) ne doivent
 * jamais s'empiler : chacune attend que la précédente soit résolue avant de s'armer, sans
 * quoi un premier visiteur reçoit la modale plein écran des conditions ET le bandeau
 * cookies au même instant, puis la carte newsletter par-dessus le bandeau cookies quelques
 * secondes plus tard — trois fenêtres en même temps, dans le même coin de l'écran.
 *
 * La résolution se lit dans le stockage local quand elle y laisse une trace (accepté), ou
 * dans un événement sinon (refusé : voir terms-popup.tsx, qui ne persiste pas un refus —
 * redemander l'accord vaut mieux que le supposer donné). L'état initial regarde le
 * stockage pour qu'un visiteur qui a déjà tout accepté ne revoie aucune attente.
 */
function dejaResolu(cleStockage: string): boolean {
  try { return !!localStorage.getItem(cleStockage); } catch { return false; }
}

export function useApresResolution(cleStockage: string, evenement: string): boolean {
  const [resolu, setResolu] = useState(() => dejaResolu(cleStockage));
  useEffect(() => {
    if (resolu) return;
    const onResolu = () => setResolu(true);
    window.addEventListener(evenement, onResolu);
    return () => window.removeEventListener(evenement, onResolu);
  }, [resolu, evenement]);
  return resolu;
}

export function signalerResolution(evenement: string) {
  window.dispatchEvent(new Event(evenement));
}

export const EVT_CONDITIONS_RESOLUES = "louisfarm:conditions-resolues";
export const EVT_COOKIES_RESOLUS = "louisfarm:cookies-resolus";
