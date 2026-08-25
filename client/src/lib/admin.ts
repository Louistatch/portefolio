const TOKEN_KEY = "admin_token";

/**
 * Racine des pages d'administration, écrite ici et nulle part ailleurs.
 *
 * Ce chemin a déjà été renommé une fois — il s'appelait `/admin` — et le prochain
 * renommage doit rester une seule ligne à changer. D'où la constante plutôt que la
 * quarantaine de littéraux qu'il y avait avant.
 *
 * À garder en tête : ce nom n'est pas une protection. Il retire seulement l'administration
 * des URL que l'on devine au premier essai ; ce qui protège vraiment, c'est le mot de passe
 * et le jeton. Il ne faut donc ni le nommer dans robots.txt, ni le mettre dans le plan du
 * site, ni y renvoyer depuis une page publique — chacun de ces trois endroits le
 * publierait aussi sûrement qu'un lien en page d'accueil.
 *
 * Les routes de l'API (`/api/admin/...`) ne sont volontairement pas renommées : elles ne
 * sont pas devinables sans jeton, et les toucher casserait le contrat client/serveur sans
 * rien apporter.
 */
export const ADMIN_BASE = "/pagesecure";

// localStorage n'est pas toujours joignable — navigation privée stricte, données de site
// bloquées, certains WebView. L'accès ne renvoie alors pas null, il LÈVE une exception, qui
// appelée au rendu ferait écran blanc sur toute l'administration. Même durcissement que
// côté étudiant.
export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* stockage indisponible */ }
}

export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* stockage indisponible */ }
}

export async function adminFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const res = await fetch(url, {
    ...options,
    headers: {
      // Don't set Content-Type for FormData — browser sets it with boundary
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = `${ADMIN_BASE}/login`;
    throw new Error("Unauthorized");
  }
  return res;
}
