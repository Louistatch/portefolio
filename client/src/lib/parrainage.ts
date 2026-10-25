/**
 * Code de parrainage porté par les liens d'ambassadeur (?ref=CODE).
 *
 * ── Pourquoi une mémoire, et pas seulement l'URL ──
 *
 * L'inscription lisait le code sur sa propre URL, et uniquement là. Un lien
 * /academy/register?ref=CODE fonctionnait ; un lien vers une page de cours perdait le
 * parrain au premier clic — le visiteur arrivait sur /elearning, lisait, naviguait,
 * s'inscrivait trois pages plus loin, et l'ambassadeur n'était plus nulle part. C'est
 * précisément le trajet qu'on veut encourager : recommander UN parcours, pas un
 * formulaire. Le code est donc mémorisé dès qu'une page — n'importe laquelle — s'ouvre
 * avec ?ref=, et l'inscription le retrouve.
 *
 * ── Les règles ──
 *
 * - L'URL du moment l'emporte toujours sur la mémoire : si quelqu'un suit le lien d'un
 *   second ambassadeur, c'est le dernier lien suivi qui compte.
 * - La mémoire expire au bout de 30 jours : une recommandation vieille d'un trimestre
 *   n'en est plus une.
 * - localStorage n'est pas toujours joignable (navigation privée stricte, données de site
 *   bloquées) : chaque accès est enveloppé, et son absence redonne simplement le
 *   comportement d'avant — le code ne survit pas à la navigation, sans rien casser.
 */

const CLE = "academy_ref";
const VALIDITE_JOURS = 30;

function refDansLUrl(): string | null {
  const brut = new URLSearchParams(window.location.search).get("ref");
  const code = (brut || "").trim().toUpperCase();
  // Le serveur génère des codes courts alphanumériques ; un « code » exotique dans l'URL
  // (collage raté, tentative d'injection) ne mérite ni mémoire ni envoi.
  return /^[A-Z0-9-]{3,24}$/.test(code) ? code : null;
}

/** À l'ouverture de l'application : si l'URL porte un code valide, le retenir. */
export function memoriserCodeParrainage(): void {
  const code = refDansLUrl();
  if (!code) return;
  try {
    localStorage.setItem(CLE, JSON.stringify({ code, depuis: Date.now() }));
  } catch { /* stockage indisponible : le code vivra le temps de la page */ }
}

/** Le code à joindre à une inscription : l'URL d'abord, la mémoire (non périmée) ensuite. */
export function codeParrainage(): string | undefined {
  const immediat = refDansLUrl();
  if (immediat) return immediat;
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return undefined;
    const { code, depuis } = JSON.parse(brut);
    if (typeof code !== "string" || Date.now() - depuis > VALIDITE_JOURS * 86400000) {
      localStorage.removeItem(CLE);
      return undefined;
    }
    return code;
  } catch {
    return undefined;
  }
}
