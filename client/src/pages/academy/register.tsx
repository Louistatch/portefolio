// Création de compte étudiant
import { useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Mail, Eye, EyeOff, Check, X, AlertCircle } from "lucide-react";
import { setStudentToken, setStudent } from "@/lib/student";
import { AuthShell, Etapes, GroupeChamps, Champ, champ, JaugeMotDePasse } from "@/components/academy/auth-shell";

// Les quatre étapes du parcours d'entrée. Les montrer dès la première évite l'abandon à
// la découverte du test d'admission, et dit à quoi sert la confirmation d'email.
const ETAPES = [
  { titre: "Créer votre compte", texte: "Deux minutes. C'est cette page." },
  { titre: "Confirmer votre email", texte: "Un code à six chiffres vous est envoyé. Sans lui, pas de certificat." },
  { titre: "Passer le test d'admission", texte: "Un questionnaire sur votre métier, jamais sur du code. Résultat immédiat ; en cas d'échec, nouvelle tentative après sept jours." },
  { titre: "Commencer le parcours", texte: "Trois mois pour le terminer, à raison d'une à deux leçons par semaine." },
];

export default function AcademyRegister() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ first_name: "", middle_name: "", last_name: "", email: "", password: "", confirm: "", phone: "", country: "", organization: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const pwd = form.password;
  const identiques = pwd.length > 0 && pwd === form.confirm;

  async function submit() {
    if (loading) return;
    setError("");
    if (!form.first_name || !form.last_name || !form.email || !form.password) { setError("Prénom, nom, email et mot de passe sont obligatoires."); return; }
    if (form.password.length < 8) { setError("Le mot de passe doit faire au moins 8 caractères."); return; }
    if (form.password !== form.confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/academy/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name, middle_name: form.middle_name, last_name: form.last_name,
          email: form.email, password: form.password,
          phone: form.phone, country: form.country, organization: form.organization,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur d'inscription");
      setStudentToken(data.token);
      setStudent(data.student);
      setEmailSent(!!data.emailSent);
      setRegistered(true);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  // ── Compte créé : on enchaîne aussitôt sur l'étape suivante ──
  if (registered) {
    return (
      <>
        <SEO title="Inscription réussie — LouisFarm Learning" description="Confirmez votre email." />
        <AuthShell
          titre="Compte créé. Reste le test."
          intro="Vous êtes connecté(e). Les deux étapes qui suivent se font dans l'ordre que vous voulez."
          aside={<Etapes etapes={ETAPES} courant={1} />}
        >
          <div className="w-14 h-14 rounded-lg bg-primary/10 grid place-items-center mb-5">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight mb-3">
            Bienvenue, {form.first_name}
          </h1>
          {/* L'état affiché reflète le résultat réel de l'envoi, pas une supposition. */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {emailSent
              ? <>Votre compte est créé. Un code de confirmation à six chiffres a été envoyé à <strong className="text-foreground">{form.email}</strong>. Rien reçu&nbsp;? Regardez dans vos indésirables.</>
              : <>Votre compte est créé et vous êtes connecté(e). <strong className="text-foreground">L'email de confirmation n'a pas pu partir</strong> (service d'envoi indisponible) — ce n'est pas bloquant.</>}
          </p>

          <div className="p-4 rounded-lg border border-border bg-muted/40 mb-6">
            <div className="text-[11px] tracking-[0.1em] uppercase font-bold text-primary mb-1.5">Étape suivante</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Le test d'admission</strong> — vous pouvez le passer dès
              maintenant. La confirmation d'email n'est nécessaire que pour recevoir vos attestations et
              votre certificat.
            </p>
          </div>

          <Button className="gap-2 w-full" size="lg" onClick={() => navigate("/elearning")}>
            <CheckCircle2 className="w-4 h-4" /> Passer le test d'admission
          </Button>
          <p className="text-center mt-4">
            <button onClick={() => navigate("/academy/verify")} className="text-sm text-primary hover:underline">
              J'ai un code de confirmation
            </button>
          </p>
        </AuthShell>
      </>
    );
  }

  return (
    <>
      <SEO title="Inscription — LouisFarm Learning" description="Créez votre compte étudiant LouisFarm Learning." />
      <AuthShell
        large
        asideSurMobile
        titre="Ce qui se passe après cette page"
        intro="Quatre étapes, dont trois vous prennent moins d'une heure au total."
        aside={<Etapes etapes={ETAPES} courant={0} />}
        note="L'inscription et la formation sont gratuites. Vos données ne sont ni revendues ni partagées ; votre adresse ne sert qu'à vos cours et à vos attestations."
      >
        <h1 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight">Créer un compte</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-8">
          Déjà inscrit&nbsp;?{" "}
          <button onClick={() => navigate("/academy/login")} className="text-primary font-semibold hover:underline">Se connecter</button>
        </p>

        <div className="space-y-7">
          {/* Groupe 1 — l'état civil décomposé : ces trois champs composent le nom imprimé
              sur les attestations. Un champ libre unique produisait des documents ne
              portant qu'un nom de famille, ou qu'un prénom. */}
          <GroupeChamps titre="Votre identité" note="Ces noms figureront tels quels sur vos attestations et votre certificat.">
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Champ label="Prénom" requis>
                <input className={champ} value={form.first_name} onChange={e => update("first_name", e.target.value)} placeholder="Issodo" autoComplete="given-name" />
              </Champ>
              <Champ label="Nom de famille" requis>
                <input className={champ} value={form.last_name} onChange={e => update("last_name", e.target.value)} placeholder="TATCHIDA" autoComplete="family-name" />
              </Champ>
            </div>
            <Champ label="Deuxième prénom">
              <input className={champ} value={form.middle_name} onChange={e => update("middle_name", e.target.value)} placeholder="Louis — facultatif" autoComplete="additional-name" />
            </Champ>
          </GroupeChamps>

          {/* Groupe 2 — les identifiants. */}
          <GroupeChamps titre="Vos identifiants">
            <Champ label="Adresse email" requis aide="Le code de confirmation y sera envoyé.">
              <input className={champ} type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="vous@organisation.org" autoComplete="email" />
            </Champ>

            <Champ label="Mot de passe" requis>
              <div className="relative">
                <input className={`${champ} pr-11`} type={showPwd ? "text" : "password"} value={form.password}
                  onChange={e => update("password", e.target.value)} placeholder="8 caractères minimum" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <JaugeMotDePasse pwd={pwd} />
            </Champ>

            <Champ label="Confirmer le mot de passe" requis>
              <input className={champ} type={showPwd ? "text" : "password"} value={form.confirm}
                onChange={e => update("confirm", e.target.value)} placeholder="Retapez votre mot de passe"
                autoComplete="new-password" onKeyDown={e => e.key === "Enter" && submit()} />
              {form.confirm.length > 0 && (
                <p className={`text-xs mt-1.5 flex items-center gap-1 ${identiques ? "text-primary" : "text-destructive"}`}>
                  {identiques ? <><Check className="w-3 h-3" /> Les mots de passe correspondent</> : <><X className="w-3 h-3" /> Les mots de passe ne correspondent pas</>}
                </p>
              )}
            </Champ>
          </GroupeChamps>

          {/* Groupe 3 — le contexte, facultatif et annoncé comme tel avec sa raison d'être. */}
          <GroupeChamps titre="Votre contexte — facultatif" accent={false}
            note="Sert à adapter les exemples de cours à votre terrain. Rien de tout cela n'est publié.">
            <div className="grid sm:grid-cols-3 gap-3.5">
              <Champ label="Téléphone">
                <input className={champ} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+228 …" autoComplete="tel" />
              </Champ>
              <Champ label="Organisation">
                <input className={champ} value={form.organization} onChange={e => update("organization", e.target.value)} placeholder="ONG, SFD…" autoComplete="organization" />
              </Champ>
              <Champ label="Pays">
                <input className={champ} value={form.country} onChange={e => update("country", e.target.value)} placeholder="Togo" autoComplete="country-name" />
              </Champ>
            </div>
          </GroupeChamps>
        </div>

        {error && (
          <p className="flex items-start gap-2 text-sm text-destructive mt-5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </p>
        )}

        <Button className="w-full mt-7 gap-2" size="lg" onClick={submit} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Créer mon compte
        </Button>
      </AuthShell>
    </>
  );
}
