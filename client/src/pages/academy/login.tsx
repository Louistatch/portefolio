// academy login
import { useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2 } from "lucide-react";
import { setStudentToken, setStudent } from "@/lib/student";

export default function AcademyLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/academy/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur de connexion");
      setStudentToken(data.token);
      setStudent(data.student);
      // Vérifie si le test a déjà été passé et réussi
      try {
        const st = await fetch("/api/academy/test-status", {
          headers: { Authorization: `Bearer ${data.token}` },
        }).then(r => r.json());
        navigate(st.passed ? "/academy/dashboard" : "/elearning");
      } catch {
        navigate("/academy/dashboard");
      }
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <SEO title="Connexion — DataMEAL Academy" description="Connectez-vous à votre espace étudiant." />
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Espace étudiant</h1>
        <p className="text-muted-foreground text-sm mt-2">Connectez-vous pour accéder à vos cours et vos notes</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@organisation.org"
            onKeyDown={e => e.key === "Enter" && submit()}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && submit()}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
      </div>

      <div className="text-right mt-2">
        <button onClick={() => navigate("/academy/forgot-password")} className="text-xs text-primary hover:underline">Mot de passe oublié ?</button>
      </div>

      {error && <p className="text-sm text-destructive mt-4">{error}</p>}

      <Button className="w-full mt-6 gap-2" size="lg" onClick={submit} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Se connecter
      </Button>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Pas encore de compte ? <button onClick={() => navigate("/academy/register")} className="text-primary hover:underline">Créer un compte</button>
      </p>
    </div>
  );
}
