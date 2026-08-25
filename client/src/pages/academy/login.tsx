// Connexion étudiant
import { useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { setStudentToken, setStudent } from "@/lib/student";
import { AuthShell, Points, Champ, champ } from "@/components/academy/auth-shell";

export default function AcademyLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
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
    <>
      <SEO title="Connexion — LouisFarm Learning" description="Connectez-vous à votre espace étudiant." />
      <AuthShell
        titre="Votre relevé de notes vous attend"
        intro="Vos leçons validées, vos travaux de groupe, vos échéances et vos certificats — tout est dans votre espace, et rien n'en sort sans votre accord."
        aside={<Points points={[
          { titre: "Une leçon par semaine", texte: "Le rythme est conseillé, jamais un couperet. Vous pouvez prendre de l'avance." },
          { titre: "Trois travaux de groupe", texte: "Équipe tirée au sort à chaque fois, en semaines 4, 8 et 12." },
          { titre: "Un certificat vérifiable", texte: "Numéro unique et page de vérification publique : un recruteur contrôle seul." },
        ]} />}
        note={<>Une question&nbsp;? <a href="mailto:contact@louisfarm.com" className="text-background/75 hover:text-background underline underline-offset-2">contact@louisfarm.com</a></>}
      >
        <h1 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight">Connexion</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-8">
          Pas encore de compte&nbsp;?{" "}
          <button onClick={() => navigate("/academy/register")} className="text-primary font-semibold hover:underline">Créer un compte</button>
        </p>

        <div className="space-y-4">
          <Champ label="Adresse email" >
            <input type="email" className={champ} value={email} onChange={e => setEmail(e.target.value)}
              placeholder="vous@organisation.org" autoComplete="email"
              onKeyDown={e => e.key === "Enter" && submit()} />
          </Champ>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="text-[13px] font-semibold">Mot de passe</label>
              <button onClick={() => navigate("/academy/forgot-password")} className="text-xs text-primary hover:underline">
                Mot de passe oublié&nbsp;?
              </button>
            </div>
            <div className="relative">
              <input type={showPwd ? "text" : "password"} className={`${champ} pr-11`} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Votre mot de passe" autoComplete="current-password"
                onKeyDown={e => e.key === "Enter" && submit()} />
              <button type="button" onClick={() => setShowPwd(s => !s)}
                aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="flex items-start gap-2 text-sm text-destructive mt-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </p>
        )}

        <Button className="w-full mt-6 gap-2" size="lg" onClick={submit} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Se connecter
        </Button>

        {/* Le chemin de celui qui n'a pas encore de compte, dit ici plutôt que découvert
            après l'inscription. */}
        <div className="mt-8 p-4 rounded-lg border border-border bg-muted/40">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Vous n'avez pas encore de compte&nbsp;?</strong>{" "}
            L'inscription est libre et gratuite&nbsp;; l'accès aux cours passe ensuite par un test
            d'admission, que vous pouvez repasser après sept jours en cas d'échec.
          </p>
        </div>

        <p className="text-xs text-muted-foreground/80 text-center mt-6">
          Espace formateur&nbsp;?{" "}
          <button onClick={() => navigate("/admin/login")} className="hover:text-foreground underline underline-offset-2">
            Connexion administration
          </button>
        </p>
      </AuthShell>
    </>
  );
}
