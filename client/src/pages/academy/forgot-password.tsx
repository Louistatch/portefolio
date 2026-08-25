// Mot de passe oublié — la demande.
//
// Une règle tient cet écran : la réponse est TOUJOURS la même, que l'adresse existe ou
// non. Confirmer l'existence d'un compte reviendrait à livrer la liste des inscrits, une
// adresse à la fois. Le serveur applique déjà cette règle ; l'écran ne doit pas la trahir.
import { useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
import { AuthShell, Points, Champ, champ } from "@/components/academy/auth-shell";

const POINTS = [
  { titre: "Un lien valable une heure", texte: "Passé ce délai, il ne fonctionne plus — refaites simplement une demande." },
  { titre: "Une réponse toujours identique", texte: "Nous ne disons jamais si une adresse a un compte : ce serait livrer la liste des inscrits." },
  { titre: "Rien n'est perdu", texte: "Vos leçons validées, vos notes et vos attestations restent intactes." },
];

export default function AcademyForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading || !email) return;
    setLoading(true);
    try {
      await fetch("/api/academy/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally { setLoading(false); }
  }

  return (
    <>
      <SEO title="Mot de passe oublié — LouisFarm Learning" description="Réinitialisation du mot de passe." />
      <AuthShell
        titre={sent ? "Demande enregistrée" : "Reprendre la main sur votre compte"}
        intro={sent
          ? "Le message ci-contre est le même pour toutes les adresses. C'est volontaire."
          : "Un lien, valable une heure, et vous reprenez là où vous en étiez."}
        aside={<Points points={POINTS} />}
        note={<>Une question&nbsp;? <a href="mailto:contact@louisfarm.com" className="text-background/75 hover:text-background underline underline-offset-2">contact@louisfarm.com</a></>}
      >
        {sent ? (
          <>
            <div className="w-14 h-14 rounded-lg bg-primary/10 grid place-items-center mb-5">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight mb-3">
              Vérifiez votre boîte mail
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Si un compte existe pour <strong className="text-foreground">{email}</strong>, un lien de
              réinitialisation vient d'y être envoyé. Il est valable une heure.
            </p>

            <div className="flex gap-3 p-4 rounded-lg border border-border bg-muted/40 mb-7">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ce message est le même que l'adresse existe ou non. Confirmer l'existence d'un compte
                reviendrait à livrer la liste des inscrits, une adresse à la fois.
              </p>
            </div>

            <Button className="w-full gap-2" size="lg" onClick={() => navigate("/academy/login")}>
              <ArrowLeft className="w-4 h-4" /> Retour à la connexion
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Rien après cinq minutes&nbsp;? Regardez dans vos indésirables, puis{" "}
              <button onClick={() => setSent(false)} className="text-primary hover:underline">réessayez</button>.
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-lg bg-primary/10 grid place-items-center mb-5">
              <KeyRound className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight mb-2">
              Réinitialiser le mot de passe
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-7">
              Indiquez l'adresse de votre compte. Nous vous envoyons un lien valable une heure.
            </p>

            <Champ label="Adresse email">
              <input type="email" className={champ} value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vous@organisation.org" autoComplete="email"
                onKeyDown={e => e.key === "Enter" && submit()} />
            </Champ>

            <Button className="w-full mt-6 gap-2" size="lg" onClick={submit} disabled={loading || !email}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Envoyer le lien
            </Button>
            <p className="text-center mt-4">
              <button onClick={() => navigate("/academy/login")} className="text-sm text-primary hover:underline">
                ← Retour à la connexion
              </button>
            </p>
          </>
        )}
      </AuthShell>
    </>
  );
}
