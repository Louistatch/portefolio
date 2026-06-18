import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";

export default function AcademyResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (t) setToken(t); else setError("Lien de réinitialisation invalide.");
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

  if (done) return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <SEO title="Mot de passe réinitialisé — DataMEAL Academy" description="Mot de passe modifié." />
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"><CheckCircle2 className="w-8 h-8 text-primary" /></div>
      <h1 className="text-2xl font-bold mb-2">Mot de passe réinitialisé</h1>
      <p className="text-muted-foreground mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
      <Button onClick={() => navigate("/academy/login")}>Se connecter</Button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <SEO title="Réinitialiser le mot de passe — DataMEAL Academy" description="Choisissez un nouveau mot de passe." />
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"><Lock className="w-7 h-7 text-primary" /></div>
        <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
        <p className="text-muted-foreground text-sm mt-2">Choisissez un mot de passe sécurisé (6 caractères minimum).</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nouveau mot de passe</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Confirmer le mot de passe</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && submit()}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      <Button className="w-full mt-6 gap-2" size="lg" onClick={submit} disabled={loading || !token}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Réinitialiser
      </Button>
    </div>
  );
}
