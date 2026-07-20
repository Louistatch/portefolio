const STUDENT_TOKEN = "academy_token";
const STUDENT_INFO = "academy_student";

export interface Student {
  id: number;
  full_name: string;
  email: string;
  avatar_url?: string | null;
}

export function getStudentToken(): string | null {
  return localStorage.getItem(STUDENT_TOKEN);
}

export function setStudentToken(token: string) {
  localStorage.setItem(STUDENT_TOKEN, token);
}

export function getStudent(): Student | null {
  const raw = localStorage.getItem(STUDENT_INFO);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    clearStudentSession();
    return null;
  }
}

export function setStudent(s: Student) {
  localStorage.setItem(STUDENT_INFO, JSON.stringify(s));
}

export function clearStudentSession() {
  localStorage.removeItem(STUDENT_TOKEN);
  localStorage.removeItem(STUDENT_INFO);
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
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
