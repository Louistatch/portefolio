import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { setStudentToken, setStudent } from "@/lib/student";

export default function AcademyRegister() {
  const [, navigate] = useLocation();
  const [entryScore, setEntryScore] = useState<number | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", country: "", organization: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Score du test stocké après réussite
    const s = sessionStorage.getItem("academy_entry_score");
    if (s) setEntryScore(Number(s));
  }, []);

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
        body: JSON.stringify({ ...form, entry_score: entryScore ?? 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur d'inscription");
      setStudentToken(data.token);
      setStudent(data.student);
      navigate("/academy/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const noScore = entryScore === null;
  const failed = entryScore !== null && entryScore < 21;

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <SEO title="Inscription — DataMEAL Academy" description="Créez votre compte étudiant DataMEAL Academy." />
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Créer mon compte étudiant</h1>
        <p className="text-muted-foreground text-sm mt-2">DataMEAL Academy — formation gratuite par projets</p>
      </div>

      {noScore && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-300">Test de sélection requis</p>
            <p className="text-amber-700 dark:text-amber-400/80 mt-1">Vous devez d'abord réussir le test (21/30 minimum).</p>
            <button onClick={() => navigate("/elearning")} className="text-amber-800 dark:text-amber-300 underline mt-2">Passer le test →</button>
          </div>
        </div>
      )}

      {failed && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Score insuffisant ({entryScore}/30)</p>
            <button onClick={() => navigate("/elearning")} className="text-destructive underline mt-2">Reprendre le test →</button>
          </div>
        </div>
      )}

      {entryScore !== null && entryScore >= 21 && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-6 flex gap-3 items-center">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm font-medium text-primary">Test réussi : {entryScore}/30 — bienvenue !</p>
        </div>
      )}

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
              disabled={noScore || failed}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50" />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive mt-4">{error}</p>}

      <Button className="w-full mt-6 gap-2" size="lg" onClick={submit} disabled={loading || noScore || failed}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
        Créer mon compte
      </Button>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Déjà inscrit ? <button onClick={() => navigate("/academy/login")} className="text-primary hover:underline">Se connecter</button>
      </p>
    </div>
  );
}
