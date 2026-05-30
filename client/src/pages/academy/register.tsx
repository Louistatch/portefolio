import { useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, CheckCircle2, Mail } from "lucide-react";
import { setStudentToken, setStudent } from "@/lib/student";

export default function AcademyRegister() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", country: "", organization: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    setError("");
    if (!form.full_name || !form.email || !form.password) { setError("Nom, email et mot de passe sont obligatoires."); return; }
    if (form.password.length < 6) { setError("Le mot de passe doit faire au moins 6 caractères."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/academy/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur d'inscription");
      setStudentToken(data.token);
      setStudent(data.student);
      setRegistered(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <SEO title="Inscription réussie — DataMEAL Academy" description="Confirmez votre email." />
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"><Mail className="w-8 h-8 text-primary" /></div>
        <h1 className="text-2xl font-bold mb-2">Vérifiez votre email</h1>
        <p className="text-muted-foreground mb-6">Un email de confirmation vient d'être envoyé à <strong>{form.email}</strong>. Cliquez sur le lien pour activer votre compte.</p>
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 text-sm text-muted-foreground text-left">
          <p>Vous pouvez déjà passer le test d'aptitude — la vérification de l'email pourra se faire plus tard depuis votre profil.</p>
        </div>
        <Button className="gap-2" size="lg" onClick={() => navigate("/elearning")}><CheckCircle2 className="w-4 h-4" /> Passer au test d'aptitude</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <SEO title="Inscription — DataMEAL Academy" description="Créez votre compte étudiant DataMEAL Academy." />
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Créer mon compte étudiant</h1>
        <p className="text-muted-foreground text-sm mt-2">Inscrivez-vous, puis passez le test d'aptitude pour accéder aux cours</p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">📋 Comment ça marche</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Créez votre compte (gratuit)</li>
          <li>Passez le test d'aptitude de 30 questions</li>
          <li>Score ≥ 21/30 → accès immédiat aux cours</li>
        </ol>
      </div>

      <div className="space-y-4">
        {[
          { k: "full_name", label: "Nom complet *", ph: "Louis TATCHIDA", type: "text" },
          { k: "email", label: "Email *", ph: "vous@organisation.org", type: "email" },
          { k: "password", label: "Mot de passe *", ph: "Minimum 6 caractères", type: "password" },
          { k: "phone", label: "Téléphone", ph: "+228 ...", type: "tel" },
          { k: "organization", label: "Organisation", ph: "ONG, Université...", type: "text" },
          { k: "country", label: "Pays", ph: "Togo", type: "text" },
        ].map(f => (
          <div key={f.k}>
            <label className="block text-sm font-medium mb-1.5">{f.label}</label>
            <input type={f.type} value={(form as any)[f.k]} onChange={e => update(f.k, e.target.value)} placeholder={f.ph}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive mt-4">{error}</p>}

      <Button className="w-full mt-6 gap-2" size="lg" onClick={submit} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
        Créer mon compte & passer au test
      </Button>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Déjà inscrit ? <button onClick={() => navigate("/academy/login")} className="text-primary hover:underline">Se connecter</button>
      </p>
    </div>
  );
}
