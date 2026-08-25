import { ReactNode } from "react";
import { Link } from "wouter";
import { GraduationCap } from "lucide-react";

// Coquille commune aux écrans d'authentification.
//
// On n'arrive presque jamais sur une page de connexion par choix : on y arrive depuis un
// email, un lien partagé, un signet oublié. Le panneau sombre répond donc aux deux
// questions de l'arrivant — où suis-je, qu'est-ce qui m'attend — pendant que la colonne
// de droite ne fait qu'une chose : le formulaire. Sur téléphone, le panneau se réduit à
// un bandeau posé au-dessus du formulaire.

export const champ =
  "w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm " +
  "placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 " +
  "focus:ring-primary/25 focus:border-primary transition-colors";

/** Séparateur de groupe de champs : « VOTRE IDENTITÉ ────────── ». */
export function GroupeChamps({ titre, note, accent = true, children }: {
  titre: string; note?: ReactNode; accent?: boolean; children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2.5">
        <span className={`text-[11px] tracking-[0.1em] uppercase font-bold ${accent ? "text-primary" : "text-muted-foreground"}`}>
          {titre}
        </span>
        <span className="flex-1 h-px bg-border" />
      </div>
      {note && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{note}</p>}
      <div className="mt-4 space-y-3.5">{children}</div>
    </div>
  );
}

/** Un champ avec son étiquette, son astérisque et son aide éventuelle. */
export function Champ({ label, requis, aide, children }: {
  label: string; requis?: boolean; aide?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="block text-[13px] font-semibold mb-1.5">
        {label}{requis && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {aide && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{aide}</p>}
    </div>
  );
}

/** Liste numérotée du panneau sombre (connexion). */
export function Points({ points }: { points: { titre: string; texte: string }[] }) {
  return (
    <div className="space-y-5">
      {points.map((p, i) => (
        <div key={p.titre} className="flex gap-3.5 items-start">
          <span className="w-6 h-6 shrink-0 rounded-full border border-background/25 text-accent grid place-items-center text-[11px] font-bold">
            {i + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{p.titre}</span>
            <span className="block text-[13px] text-background/55 leading-relaxed mt-0.5">{p.texte}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Frise verticale du panneau sombre (inscription), l'étape courante marquée. */
export function Etapes({ etapes, courant = 0 }: {
  etapes: { titre: string; texte: string }[]; courant?: number;
}) {
  return (
    <div>
      {etapes.map((e, i) => (
        <div key={e.titre} className="flex gap-3.5">
          <span className="flex flex-col items-center shrink-0">
            <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${
              i === courant ? "bg-primary text-white" : "border border-background/25 text-background/50"
            }`}>
              {i + 1}
            </span>
            {i < etapes.length - 1 && <span className="w-px flex-1 bg-background/15 my-1.5" />}
          </span>
          <span className={`min-w-0 ${i < etapes.length - 1 ? "pb-5" : ""}`}>
            <span className="block text-sm font-semibold">{e.titre}</span>
            <span className="block text-[13px] text-background/55 leading-relaxed mt-0.5">{e.texte}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function AuthShell({ titre, intro, note, aside, children, large, asideSurMobile }: {
  /** Titre du panneau sombre. */
  titre: ReactNode;
  /** Phrase d'accroche sous le titre. */
  intro: ReactNode;
  /** Note de bas de panneau (contact, mention de gratuité…). */
  note?: ReactNode;
  /** Corps du panneau sombre : <Points/>, <Etapes/>, ou libre. */
  aside?: ReactNode;
  /** La colonne de droite : le formulaire. */
  children: ReactNode;
  /** Colonne de formulaire élargie (inscription). */
  large?: boolean;
  /**
   * Garde le corps du panneau visible sur téléphone. Par défaut il est masqué sous `lg` :
   * sur un écran de 390 px il repousserait le formulaire de six cents pixels, alors que
   * la page n'a qu'un seul travail — faire entrer. L'inscription fait exception : les
   * quatre étapes y sont l'argument, pas la décoration.
   */
  asideSurMobile?: boolean;
}) {
  return (
    <div className={`${large ? "max-w-6xl" : "max-w-5xl"} mx-auto px-6 pb-16`}>
      <div className="grid lg:grid-cols-12 rounded-lg border border-border overflow-hidden bg-card">

        {/* ── Panneau de contexte ── */}
        <aside className="lg:col-span-5 bg-foreground text-background p-7 lg:p-10 flex flex-col min-w-0">
          <Link href="/elearning" className="flex items-center gap-2.5 text-background hover:opacity-80 transition-opacity">
            <span className="w-9 h-9 rounded-lg bg-primary grid place-items-center shrink-0">
              <GraduationCap className="w-[18px] h-[18px] text-white" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">LouisFarm</span>
              <span className="block text-[10px] tracking-[0.14em] text-background/45">LEARNING</span>
            </span>
          </Link>

          <h2 className="font-serif text-[22px] lg:text-[28px] font-semibold leading-snug mt-7 lg:mt-14 mb-3 text-pretty text-background">
            {titre}
          </h2>
          <p className="text-sm leading-relaxed text-background/60">{intro}</p>

          {aside && <div className={`mt-8 ${asideSurMobile ? "" : "hidden lg:block"}`}>{aside}</div>}

          {note && (
            <div className={`mt-auto pt-8 text-xs text-background/50 leading-relaxed ${asideSurMobile ? "" : "hidden lg:block"}`}>
              {note}
            </div>
          )}
        </aside>

        {/* ── Formulaire ── */}
        <div className="lg:col-span-7 p-7 lg:p-11 min-w-0">{children}</div>
      </div>
    </div>
  );
}

/**
 * Jauge de robustesse du mot de passe. Elle nomme ce qui manque plutôt que de coller une
 * étiquette abstraite (« Moyen »), qui ne dit pas quoi corriger. Les trois critères sont
 * ceux que le serveur applique au minimum : huit caractères, une majuscule, un chiffre.
 */
export function forceMotDePasse(pwd: string) {
  const criteres = { longueur: pwd.length >= 8, majuscule: /[A-Z]/.test(pwd), chiffre: /[0-9]/.test(pwd) };
  const score = Object.values(criteres).filter(Boolean).length;
  const manque = !criteres.longueur ? "huit caractères au minimum"
    : !criteres.majuscule ? "une majuscule"
    : !criteres.chiffre ? "un chiffre"
    : null;
  return { criteres, score, manque };
}

export function JaugeMotDePasse({ pwd }: { pwd: string }) {
  if (!pwd) return null;
  const { score, manque } = forceMotDePasse(pwd);
  const couleur = ["bg-muted", "bg-destructive", "bg-amber-500", "bg-primary"][score];
  return (
    <div className="flex items-center gap-2.5 mt-2">
      <span className="flex gap-1 flex-1 min-w-0">
        {[1, 2, 3].map(i => (
          <span key={i} className={`h-[3px] flex-1 rounded-full ${i <= score ? couleur : "bg-muted"}`} />
        ))}
      </span>
      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
        {manque ? `Il manque ${manque}` : "Mot de passe solide"}
      </span>
    </div>
  );
}
