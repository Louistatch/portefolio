const TOKEN_KEY = "admin_token";

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
    window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }
  return res;
}
