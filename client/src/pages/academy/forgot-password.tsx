import { useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function AcademyForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await fetch("/api/academy/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally { setLoading(false); }
  }

  if (sent) return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <SEO title="Mot de passe oublié — DataMEAL Academy" description="Réinitialisation du mot de passe." />
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"><CheckCircle2 className="w-8 h-8 text-primary" /></div>
      <h1 className="text-2xl font-bold mb-2">Vérifiez votre boîte mail</h1>
      <p className="text-muted-foreground mb-6">Si un compte existe avec l'adresse <strong>{email}</strong>, un lien de réinitialisation vient d'être envoyé. Le lien expire dans 1 heure.</p>
      <Button variant="outline" onClick={() => navigate("/academy/login")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Retour à la connexion</Button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <SEO title="Mot de passe oublié — DataMEAL Academy" description="Réinitialisation du mot de passe." />
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"><Mail className="w-7 h-7 text-primary" /></div>
        <h1 className="text-2xl font-bold">Mot de passe oublié ?</h1>
        <p className="text-muted-foreground text-sm mt-2">Entrez votre email, nous vous enverrons un lien de réinitialisation.</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@organisation.org"
          onKeyDown={e => e.key === "Enter" && email && submit()}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
      </div>
      <Button className="w-full mt-6 gap-2" size="lg" onClick={submit} disabled={loading || !email}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Envoyer le lien
      </Button>
      <p className="text-center text-sm text-muted-foreground mt-4">
        <button onClick={() => navigate("/academy/login")} className="text-primary hover:underline">← Retour à la connexion</button>
      </p>
    </div>
  );
}
