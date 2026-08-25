import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Mail, GraduationCap, RefreshCw } from "lucide-react";
import { studentFetch, isStudentLoggedIn } from "@/lib/student";
import { AuthShell, Points, champ } from "@/components/academy/auth-shell";

// Page publique : le lien de validation arrive par email et s'ouvre souvent sur un autre
// appareil que celui de l'inscription. Deux chemins possibles :
//  - avec ?token=… (le lien cliqué) : validation automatique, aucune session requise ;
//  - sans token : saisie du code à 6 chiffres, pour l'étudiant déjà connecté.
const POINTS = [
  { titre: "Deux façons de confirmer", texte: "Le lien du message, ou le code à six chiffres si vous ouvrez l'email sur un autre appareil." },
  { titre: "Un lien valable 24 heures", texte: "Au-delà, il ne fonctionne plus : demandez-en un nouveau, rien n'est perdu." },
  { titre: "Sans blocage des cours", texte: "Un compte non confirmé n'empêche pas d'apprendre — il empêche la délivrance des attestations et du certificat." },
];

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
        ? "Nouveau code envoyé — pensez à regarder dans vos indésirables."
        : "L'envoi d'email est indisponible pour le moment. Vous pouvez continuer votre formation : votre compte sera validé par l'équipe.");
    } catch { setCodeMsg("Erreur, réessayez."); } finally { setBusy(false); }
  }

  const titre = state === "ok" ? "Adresse confirmée"
    : state === "error" ? "Ce lien n'est plus valable"
    : "Confirmer votre adresse";
  const intro = state === "ok"
    ? "Votre compte peut désormais recevoir vos attestations et votre certificat."
    : state === "error"
    ? "Les liens de confirmation expirent au bout de vingt-quatre heures. Votre compte et vos données sont intacts."
    : "Une adresse confirmée est ce qui permet d'émettre un document à votre nom.";

  return (
    <>
      <SEO title="Vérification email — LouisFarm Learning" description="Validation de votre adresse email." />
      <AuthShell titre={titre} intro={intro} aside={<Points points={POINTS} />}>

        {state === "loading" && (
          <div className="flex items-center gap-3 text-muted-foreground py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" /> Vérification en cours…
          </div>
        )}

        {state === "ok" && (<>
          <div className="w-14 h-14 rounded-lg bg-primary/10 grid place-items-center mb-5">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight mb-3">Adresse confirmée</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {message || "Votre compte est confirmé."} Vos attestations et votre certificat pourront être
            délivrés à cette adresse.
          </p>

          {/* Ne jamais laisser un écran de succès sans la suite : c'est là qu'on perd
              l'étudiant, au moment précis où il est prêt à continuer. */}
          <div className="p-4 rounded-lg border border-border bg-muted/40 mb-6">
            <div className="text-[11px] tracking-[0.1em] uppercase font-bold text-primary mb-1.5">Étape suivante</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Le test d'admission</strong> — un questionnaire sur votre
              métier, résultat immédiat.
            </p>
          </div>

          <Button className="w-full gap-2" size="lg" onClick={() => navigate("/elearning")}>
            <GraduationCap className="w-4 h-4" /> Passer le test d'admission
          </Button>
          <p className="text-center mt-4">
            <button onClick={() => navigate("/academy/dashboard")} className="text-sm text-primary hover:underline">
              Plus tard — aller à mon espace
            </button>
          </p>
        </>)}

        {state === "code" && (<>
          <div className="w-14 h-14 rounded-lg bg-primary/10 grid place-items-center mb-5">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight mb-2">
            Vérifiez votre boîte mail
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-7">
            Saisissez le code à six chiffres reçu par email, ou cliquez simplement le lien du message.
          </p>

          {isStudentLoggedIn() ? (
            <>
              <label className="block text-[13px] font-semibold mb-1.5">Code de confirmation</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={e => e.key === "Enter" && submitCode()}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                aria-label="Code de confirmation à six chiffres"
                className={`${champ} h-14 text-center text-2xl font-mono tracking-[0.4em]`}
              />
              <Button className="w-full mt-5 gap-2" size="lg" onClick={submitCode} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmer mon adresse
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Rien reçu&nbsp;? Regardez dans les indésirables, puis{" "}
                <button onClick={resend} disabled={busy} className="text-primary hover:underline inline-flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> renvoyez le code
                </button>.
              </p>
              {codeMsg && <p className="text-sm text-muted-foreground mt-4">{codeMsg}</p>}
              <p className="text-xs text-muted-foreground leading-relaxed mt-7 p-4 rounded-lg border border-border bg-muted/40">
                La confirmation n'est pas obligatoire pour suivre les cours — elle l'est pour recevoir vos
                attestations et votre certificat.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-5">Connectez-vous pour saisir votre code.</p>
              <Button className="w-full" size="lg" onClick={() => navigate("/academy/login")}>Se connecter</Button>
            </>
          )}
        </>)}

        {state === "error" && (<>
          <div className="w-14 h-14 rounded-lg bg-destructive/10 grid place-items-center mb-5">
            <XCircle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight mb-3">
            Ce lien n'est plus valable
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-7">
            {message || "Le lien de confirmation a expiré."} Ce n'est pas grave&nbsp;: saisissez le code à six
            chiffres du message, ou demandez-en un nouveau depuis votre espace.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1" onClick={() => { setState("code"); setMessage(""); }}>Utiliser un code</Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate("/academy/login")}>Se connecter</Button>
          </div>
        </>)}
      </AuthShell>
    </>
  );
}
