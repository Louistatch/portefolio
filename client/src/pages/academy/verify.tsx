import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Mail, GraduationCap, RefreshCw } from "lucide-react";
import { studentFetch, isStudentLoggedIn } from "@/lib/student";

// Page publique : le lien de validation arrive par email et s'ouvre souvent sur un autre
// appareil que celui de l'inscription. Deux chemins possibles :
//  - avec ?token=… (le lien cliqué) : validation automatique, aucune session requise ;
//  - sans token : saisie du code à 6 chiffres, pour l'étudiant déjà connecté.
export default function AcademyVerify() {
  const [, navigate] = useLocation();
  const hasToken = typeof window !== "undefined" && !!new URLSearchParams(window.location.search).get("token");
  const [state, setState] = useState<"loading" | "ok" | "error" | "code">(hasToken ? "loading" : "code");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;
    (async () => {
      try {
        const res = await fetch("/api/academy/verify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setState("ok"); setMessage(data.message);
      } catch (e: any) { setState("error"); setMessage(e.message); }
    })();
  }, []);

  async function submitCode() {
    if (code.trim().length < 6) { setCodeMsg("Le code comporte 6 chiffres."); return; }
    setBusy(true); setCodeMsg("");
    try {
      const res = await studentFetch("/api/academy/verify-code", {
        method: "POST", body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setState("ok"); setMessage(data.message || "Email vérifié avec succès");
    } catch (e: any) { setCodeMsg(e.message || "Code incorrect."); } finally { setBusy(false); }
  }

  async function resend() {
    setBusy(true); setCodeMsg("");
    try {
      const res = await studentFetch("/api/academy/resend-verify", { method: "POST" });
      const data = await res.json();
      setCodeMsg(data.emailSent
        ? "Nouveau code envoyé — pensez à regarder dans vos spams."
        : "L'envoi d'email est indisponible pour le moment. Vous pouvez continuer votre formation : votre compte sera validé par l'équipe.");
    } catch { setCodeMsg("Erreur, réessayez."); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <SEO title="Vérification email — LouisFarm Learning" description="Validation de votre adresse email." />

      {state === "loading" && (<><Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" /><p className="text-muted-foreground">Vérification en cours…</p></>)}

      {state === "ok" && (<>
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"><CheckCircle2 className="w-8 h-8 text-primary" /></div>
        <h1 className="text-2xl font-bold mb-2">Email vérifié ! 🎉</h1>
        <p className="text-muted-foreground mb-6">Votre compte est confirmé. Vos attestations et certificats pourront être délivrés à cette adresse.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/elearning")} className="gap-2"><GraduationCap className="w-4 h-4" /> Passer le test</Button>
          <Button variant="outline" onClick={() => navigate("/academy/dashboard")}>Mon espace</Button>
        </div>
      </>)}

      {state === "code" && (<>
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"><Mail className="w-8 h-8 text-primary" /></div>
        <h1 className="text-2xl font-bold mb-2">Confirmer mon email</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Saisissez le code à 6 chiffres reçu par email, ou cliquez simplement le lien du message.
        </p>

        {isStudentLoggedIn() ? (
          <>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={e => e.key === "Enter" && submitCode()}
              inputMode="numeric"
              placeholder="123456"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-4"
            />
            <Button className="w-full gap-2" onClick={submitCode} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Valider mon email
            </Button>
            <button onClick={resend} disabled={busy} className="text-sm text-primary hover:underline mt-4 inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Renvoyer le code
            </button>
            {codeMsg && <p className="text-sm text-muted-foreground mt-4">{codeMsg}</p>}
            <p className="text-xs text-muted-foreground mt-6 bg-muted/40 rounded-xl p-3">
              La confirmation n'est pas obligatoire pour suivre les cours — elle l'est pour recevoir vos attestations.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">Connectez-vous pour saisir votre code.</p>
            <Button onClick={() => navigate("/academy/login")}>Se connecter</Button>
          </>
        )}
      </>)}

      {state === "error" && (<>
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5"><XCircle className="w-8 h-8 text-destructive" /></div>
        <h1 className="text-2xl font-bold mb-2">Validation échouée</h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => { setState("code"); setMessage(""); }}>Utiliser un code</Button>
          <Button variant="outline" onClick={() => navigate("/academy/login")}>Se connecter</Button>
        </div>
      </>)}
    </div>
  );
}
