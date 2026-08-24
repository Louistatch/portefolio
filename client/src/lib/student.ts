const STUDENT_TOKEN = "academy_token";
const STUDENT_INFO = "academy_student";

/**
 * Accès protégés au stockage local.
 *
 * `localStorage` n'est pas toujours joignable : navigation privée stricte, navigateur
 * configuré pour bloquer les données de site, certains WebView. L'accès ne renvoie alors pas
 * `null`, il LÈVE une exception — qui, appelée au rendu d'un composant, fait écran blanc sur
 * tout l'espace étudiant. Le repli silencieux vaut mieux qu'une page morte : au pire
 * l'étudiant devra se reconnecter.
 */
function lire(cle: string): string | null {
  try { return localStorage.getItem(cle); } catch { return null; }
}
function ecrire(cle: string, valeur: string) {
  try { localStorage.setItem(cle, valeur); } catch { /* stockage indisponible */ }
}
function effacer(cle: string) {
  try { localStorage.removeItem(cle); } catch { /* stockage indisponible */ }
}

export interface Student {
  id: number;
  full_name: string;
  email: string;
  avatar_url?: string | null;
}

export function getStudentToken(): string | null {
  return lire(STUDENT_TOKEN);
}

export function setStudentToken(token: string) {
  ecrire(STUDENT_TOKEN, token);
}

export function getStudent(): Student | null {
  const raw = lire(STUDENT_INFO);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    clearStudentSession();
    return null;
  }
}

export function setStudent(s: Student) {
  ecrire(STUDENT_INFO, JSON.stringify(s));
}

export function clearStudentSession() {
  effacer(STUDENT_TOKEN);
  effacer(STUDENT_INFO);
}

export function isStudentLoggedIn(): boolean {
  const token = getStudentToken();
  if (!token) return false;
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      clearStudentSession();
      return false;
    }
    return true;
  } catch {
    clearStudentSession();
    return false;
  }
}

export async function studentFetch(url: string, options: RequestInit = {}) {
  const token = getStudentToken();
  // Un envoi de fichier passe par FormData : imposer application/json écraserait le
  // Content-Type multipart et sa « boundary », que le navigateur est seul à savoir écrire.
  // Le serveur recevrait alors un corps qu'il ne sait pas découper, et le fichier serait
  // perdu sans erreur lisible.
  const isFormData = options.body instanceof FormData;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    clearStudentSession();
    window.location.href = "/academy/login";
    throw new Error("Session expirée");
  }
  return res;
}

export async function downloadStudentFile(url: string, baseFilename: string) {
  const res = await studentFetch(url);
  if (!res.ok) throw new Error("Téléchargement impossible");
  const blob = await res.blob();
  const ext = blob.type.includes("pdf") ? "pdf" : "html";
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `${baseFilename}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
