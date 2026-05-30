import { useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, CheckCircle2, Mail, Eye, EyeOff, Check, X } from "lucide-react";
import { setStudentToken, setStudent } from "@/lib/student";

export default function AcademyRegister() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "", phone: "", country: "", organization: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  // Force du mot de passe
  const pwd = form.password;
  const checks = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    match: pwd.length > 0 && pwd === form.confirm,
  };
  const strength = [checks.length, checks.upper, checks.number].filter(Boolean).length;
  const strengthLabel = ["", "Faible", "Moyen", "Fort"][strength];
  const strengthColor = ["bg-muted", "bg-destructive", "bg-amber-500", "bg-primary"][strength];

  async function submit() {
    setError("");
    if (!form.full_name || !form.email || !form.password) { setError("Nom, email et mot de passe sont obligatoires."); return; }
    if (form.password.length < 6) { setError("Le mot de passe doit faire au moins 6 caractères."); return; }
    if (form.password !== form.confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/academy/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name, email: form.email, password: form.password,
          phone: form.phone, country: form.country, organization: form.organization,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur d'inscription");
      setStudentToken(data.token);
      setStudent(data.student);
      setRegistered(true);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  if (registered) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <SEO title="Inscription réussie — DataMEAL Academy" description="Confirmez votre email." />
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"><Mail className="w-8 h-8 text-primary" /></div>
        <h1 className="text-2xl font-bold mb-2">Bienvenue, {form.full_name.split(" ")[0]} !</h1>
        <p className="text-muted-foreground mb-6">Votre compte est créé. Un email de confirmation a été envoyé à <strong>{form.email}</strong>.</p>
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 text-sm text-muted-foreground text-left">
          <p className="mb-2">📩 <strong className="text-foreground">Vous ne voyez pas l'email ?</strong> Vérifiez vos spams, ou demandez un renvoi depuis votre profil.</p>
          <p>Vous pouvez passer le test d'aptitude dès maintenant — la vérification de l'email peut se faire plus tard.</p>
        </div>
        <Button className="gap-2 w-full" size="lg" onClick={() => navigate("/elearning")}><CheckCircle2 className="w-4 h-4" /> Passer le test d'aptitude</Button>
      </div>
    );
  }

  const field = "w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <SEO title="Inscription — DataMEAL Academy" description="Créez votre compte étudiant DataMEAL Academy." />
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Créer mon compte étudiant</h1>
        <p className="text-muted-foreground text-sm mt-2">Gratuit · Inscrivez-vous puis passez le test d'aptitude</p>
      </div>

      {/* Étapes */}
      <div className="flex items-center justify-center gap-2 mb-8 text-xs">
        <span className="flex items-center gap-1.5 text-primary font-medium"><span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">1</span> Compte</span>
        <span className="w-6 h-px bg-border" />
        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">2</span> Test</span>
        <span className="w-6 h-px bg-border" />
        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">3</span> Cours</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nom complet *</label>
          <input className={field} value={form.full_name} onChange={e => update("full_name", e.target.value)} placeholder="Louis TATCHIDA" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Email *</label>
          <input className={field} type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="vous@organisation.org" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Mot de passe *</label>
          <div className="relative">
            <input className={field} type={showPwd ? "text" : "password"} value={form.password} onChange={e => update("password", e.target.value)} placeholder="8 caractères minimum" />
            <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pwd.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1.5">
                {[1,2,3].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColor : "bg-muted"}`} />)}
              </div>
              <p className="text-xs text-muted-foreground">Force : <span className="font-medium">{strengthLabel || "—"}</span></p>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Confirmer le mot de passe *</label>
          <input className={field} type={showPwd ? "text" : "password"} value={form.confirm} onChange={e => update("confirm", e.target.value)} placeholder="Retapez votre mot de passe"
            onKeyDown={e => e.key === "Enter" && submit()} />
          {form.confirm.length > 0 && (
            <p className={`text-xs mt-1.5 flex items-center gap-1 ${checks.match ? "text-primary" : "text-destructive"}`}>
              {checks.match ? <><Check className="w-3 h-3" /> Les mots de passe correspondent</> : <><X className="w-3 h-3" /> Les mots de passe ne correspondent pas</>}
            </p>
          )}
        </div>

        {/* Champs optionnels repliés */}
        <details className="group">
          <summary className="text-sm text-primary cursor-pointer hover:underline list-none flex items-center gap-1">
            + Informations complémentaires (facultatif)
          </summary>
          <div className="space-y-4 mt-4">
            <div><label className="block text-sm font-medium mb-1.5">Téléphone</label><input className={field} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+228 ..." /></div>
            <div><label className="block text-sm font-medium mb-1.5">Organisation</label><input className={field} value={form.organization} onChange={e => update("organization", e.target.value)} placeholder="ONG, Université..." /></div>
            <div><label className="block text-sm font-medium mb-1.5">Pays</label><input className={field} value={form.country} onChange={e => update("country", e.target.value)} placeholder="Togo" /></div>
          </div>
        </details>
      </div>

      {error && <p className="text-sm text-destructive mt-4">{error}</p>}

      <Button className="w-full mt-6 gap-2" size="lg" onClick={submit} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
        Créer mon compte
      </Button>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Déjà inscrit ? <button onClick={() => navigate("/academy/login")} className="text-primary hover:underline">Se connecter</button>
      </p>
    </div>
  );
}
