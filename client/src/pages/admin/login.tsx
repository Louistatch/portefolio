import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { setToken, ADMIN_BASE } from "@/lib/admin";
import { Loader2, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";

// Connexion à l'administration.
//
// Elle ne s'adresse pas au même public que la porte des étudiants et ne doit pas lui
// ressembler : pas de panneau d'accueil, pas d'invitation à créer un compte, rien qui
// laisse croire qu'on peut s'y inscrire. Sobre, étroite, sur la même encre sombre que le
// reste du site — jamais une couleur nouvelle.
export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const champ =
    "w-full h-11 px-3.5 rounded-lg border border-background/20 bg-background/10 text-sm " +
    "text-background placeholder:text-background/35 focus:outline-none focus:ring-2 " +
    "focus:ring-primary/40 focus:border-primary/60 transition-colors";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        // Un seul message pour les deux champs : dire lequel est faux confirmerait
        // l'existence d'un identifiant à qui le demande.
        setError("Identifiant ou mot de passe incorrect.");
        return;
      }
      const { token } = await res.json();
      setToken(token);
      navigate(ADMIN_BASE);
    } catch {
      setError("Connexion au serveur impossible. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-foreground text-background grid place-items-center px-6 py-16">
      <div className="w-full max-w-sm">

        <div className="flex items-center gap-3 mb-10">
          <span className="w-9 h-9 rounded-lg border border-background/25 grid place-items-center shrink-0">
            <ShieldCheck className="w-[18px] h-[18px] text-background/60" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-tight">Administration</span>
            <span className="block text-[10px] tracking-[0.14em] text-background/45">LOUISFARM</span>
          </span>
        </div>

        <h1 className="font-serif text-[26px] font-semibold tracking-tight mb-2 text-background">Connexion</h1>
        <p className="text-[13px] text-background/55 leading-relaxed mb-8">
          Accès réservé. Les comptes sont créés à la main&nbsp;; il n'y a pas d'inscription.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-user" className="block text-[13px] font-semibold text-background/85 mb-1.5">Identifiant</label>
            <input id="admin-user" className={champ} value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Nom d'utilisateur" autoComplete="username" required />
          </div>
          <div>
            <label htmlFor="admin-pwd" className="block text-[13px] font-semibold text-background/85 mb-1.5">Mot de passe</label>
            <div className="relative">
              <input id="admin-pwd" type={showPwd ? "text" : "password"} className={`${champ} pr-11`} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPwd(s => !s)}
                aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-background/50 hover:text-background">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Se connecter
          </Button>
        </form>

        {error && (
          <div className="mt-5 flex gap-2.5 items-start p-3.5 rounded-lg border border-red-900/60 bg-red-950/40">
            <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
            <span className="text-[13px] text-red-300 leading-relaxed">{error}</span>
          </div>
        )}

        <p className="text-xs text-background/35 text-center mt-8">
          <Link href="/" className="hover:text-background/70 underline underline-offset-2">Retour au site</Link>
        </p>
      </div>
    </div>
  );
}
