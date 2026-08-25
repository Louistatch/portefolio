// Mot de passe oublié — le nouveau mot de passe.
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, CheckCircle2, Eye, EyeOff, AlertCircle, LinkIcon } from "lucide-react";
import { AuthShell, Points, Champ, champ, JaugeMotDePasse } from "@/components/academy/auth-shell";

const POINTS = [
  { titre: "Huit caractères au minimum", texte: "Une majuscule et un chiffre rendent le mot de passe nettement plus difficile à deviner." },
  { titre: "Un lien à usage unique", texte: "Il cesse de fonctionner dès qu'il a servi, et au bout d'une heure dans tous les cas." },
  { titre: "Rien d'autre ne change", texte: "Vos leçons validées, vos notes et vos attestations restent en place." },
];

export default function AcademyResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [lienInvalide, setLienInvalide] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (t) setToken(t); else setLienInvalide(true);
  }, []);

  async function submit() {
    setError("");
    if (password.length < 8) { setError("Le mot de passe doit faire au moins 8 caractères."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/academy/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setDone(true);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <>
      <SEO title="Réinitialiser le mot de passe — LouisFarm Learning" description="Choisissez un nouveau mot de passe." />
      <AuthShell
        titre={done ? "C'est fait" : "Choisir un nouveau mot de passe"}
        intro={done
          ? "Le lien que vous venez d'utiliser ne fonctionne plus : il ne sert qu'une fois."
          : "Le lien de réinitialisation vous a identifié(e) ; il ne reste qu'à choisir le mot de passe."}
        aside={<Points points={POINTS} />}
      >
        {done ? (
          <>
            <div className="w-14 h-14 rounded-lg bg-primary/10 grid place-items-center mb-5">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight mb-3">
              Mot de passe réinitialisé
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-7">
              Connectez-vous avec votre nouveau mot de passe pour retrouver votre espace.
            </p>
            <Button className="w-full" size="lg" onClick={() => navigate("/academy/login")}>Se connecter</Button>
          </>
        ) : lienInvalide ? (
          <>
            <div className="w-14 h-14 rounded-lg bg-destructive/10 grid place-items-center mb-5">
              <LinkIcon className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight mb-3">
              Ce lien n'est plus valable
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-7">
              Les liens de réinitialisation expirent au bout d'une heure et ne servent qu'une fois.
              Ce n'est pas grave&nbsp;: demandez-en un nouveau, votre compte et vos données sont intacts.
            </p>
            <Button className="w-full" size="lg" onClick={() => navigate("/academy/forgot-password")}>
              Demander un nouveau lien
            </Button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-lg bg-primary/10 grid place-items-center mb-5">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight mb-2">
              Nouveau mot de passe
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-7">
              Huit caractères minimum. Une majuscule et un chiffre sont vivement conseillés.
            </p>

            <div className="space-y-4">
              <Champ label="Nouveau mot de passe">
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} className={`${champ} pr-11`} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <JaugeMotDePasse pwd={password} />
              </Champ>

              <Champ label="Confirmer">
                <input type={showPwd ? "text" : "password"} className={champ} value={confirm}
                  onChange={e => setConfirm(e.target.value)} placeholder="Retapez le mot de passe"
                  autoComplete="new-password" onKeyDown={e => e.key === "Enter" && submit()} />
              </Champ>
            </div>

            {error && (
              <p className="flex items-start gap-2 text-sm text-destructive mt-4">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </p>
            )}

            <Button className="w-full mt-6 gap-2" size="lg" onClick={submit} disabled={loading || !token}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Enregistrer le nouveau mot de passe
            </Button>
          </>
        )}
      </AuthShell>
    </>
  );
}
