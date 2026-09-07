import { type ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { BarreRemplissage, Spotlight } from "@/components/motion";
import { VERT_FONCE, VERT_FONCE_2, VERT_CLAIR } from "@/components/academy/landing-parts";

/**
 * Briques de l'espace ambassadeur.
 *
 * Séparées de la page pour la même raison que `landing-parts` l'est de `/elearning` : la page
 * raconte, ces objets dessinent. Elles reprennent la direction artistique de la page de
 * présentation — titre en serif, sur-titre à filet, chiffres au serif, une seule surface
 * sombre — pour qu'un étudiant qui arrive du site public reconnaisse le même produit.
 *
 * Aucun composant ici n'invente de donnée : tout ce qui s'affiche vient de
 * `/api/academy/ambassador/me` ou du registre `shared/programs`.
 */

/** Sur-titre à filet — le repère qui ouvre chaque section sans ajouter une taille de titre. */
export function SurTitre({ children, clair = false }: { children: ReactNode; clair?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-7 h-px shrink-0" style={{ background: clair ? VERT_CLAIR : "hsl(var(--accent))" }} />
      <span className={`sur-titre ${clair ? "" : "text-primary"}`} style={clair ? { color: VERT_CLAIR } : undefined}>
        {children}
      </span>
    </div>
  );
}

/** Titre de section : serif resserré, suivi du filet qui court jusqu'au bord. */
export function TitreSection({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-6 sm:mb-8">
      <h2 id={id} className="titre-affichage text-xl sm:text-2xl font-semibold">{children}</h2>
      <span aria-hidden className="flex-1 h-px bg-border" />
    </div>
  );
}

/**
 * La carte d'ambassadeur — l'objet que la page donne envie de posséder.
 *
 * Avant l'adhésion elle est montrée verrouillée, code masqué : c'est une carte qui existe et
 * qu'on n'a pas encore. Après, elle porte le vrai code. Rien n'est chargé — dégradé, filets et
 * texte seulement — donc aucun décalage de mise en page et un rendu net sur écran dense.
 */
export function CarteAmbassadeur({ nom, code, depuis, verrouillee = false }: {
  nom: string; code?: string; depuis?: string; verrouillee?: boolean;
}) {
  return (
    <div
      className="relative w-full max-w-[340px] aspect-[1.62/1] rounded-2xl overflow-hidden select-none
                 shadow-[0_18px_40px_-18px_rgba(0,0,0,.55)] ring-1 ring-white/10"
      style={{ background: `linear-gradient(145deg, ${VERT_FONCE_2} 0%, ${VERT_FONCE} 72%)` }}
    >
      {/* Halo d'angle — posé une fois, jamais animé : c'est de la lumière, pas un effet. */}
      <span aria-hidden className="absolute -top-16 -right-10 w-48 h-48 rounded-full opacity-40"
        style={{ background: `radial-gradient(closest-side, ${VERT_CLAIR}, transparent 70%)` }} />
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/15" />

      <div className="relative h-full flex flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="sur-titre text-white/55">Ambassadeur</span>
          {/* Puce, comme sur une carte physique : c'est ce détail qui fait lire « carte ». */}
          <span aria-hidden className="w-8 h-6 rounded-[5px] bg-white/15 ring-1 ring-white/20 grid place-items-center">
            <span className="w-4 h-px bg-white/40" />
          </span>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/45 mb-1">Code de parrainage</p>
          {verrouillee ? (
            <p className="font-mono text-lg sm:text-xl tracking-[0.28em] text-white/35 flex items-center gap-2">
              ••••••••
              <Lock className="w-3.5 h-3.5" aria-hidden />
              <span className="sr-only">Code non encore attribué</span>
            </p>
          ) : (
            <p className="font-mono text-lg sm:text-xl tracking-[0.28em] text-white">{code}</p>
          )}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Titulaire</p>
            <p className="text-sm font-medium text-white/90 truncate">{nom || "—"}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Membre depuis</p>
            <p className="text-sm font-medium text-white/90 chiffres-tabulaires">
              {depuis ? new Date(depuis).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Atout du programme.
 *
 * La valeur passe avant l'icône : un chiffre ou un mot court en serif, puis l'explication.
 * L'icône ne fait que baliser — elle grandit d'un cheveu au survol, ce qui suffit à dire que
 * le bloc est vivant sans qu'une animation coure en permanence.
 */
export function Atout({ icone: Icone, valeur, titre, texte }: {
  icone: any; valeur: string; titre: string; texte: string;
}) {
  return (
    <Spotlight className="group relative rounded-2xl border border-border/60 bg-card p-5 sm:p-6 h-full lift">
      <span aria-hidden className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-primary/40 to-transparent" />
      <div className="flex items-center gap-3 mb-4">
        <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0
                         transition-transform duration-300 group-hover:scale-110">
          <Icone className="w-[18px] h-[18px]" />
        </span>
        <span className="titre-affichage text-2xl font-semibold text-primary chiffres-tabulaires">{valeur}</span>
      </div>
      <p className="font-semibold text-[15px] leading-snug">{titre}</p>
      <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{texte}</p>
    </Spotlight>
  );
}

/**
 * Le mécanisme, en cinq temps.
 *
 * Vertical sur téléphone — c'est là que la majorité lit, et une frise horizontale de cinq
 * colonnes y devient illisible bien avant d'être belle. Le rail change d'axe à partir de
 * `lg`, les pastilles restent identiques : une seule liste, deux mises en page.
 */
export function Mecanisme({ etapes }: { etapes: { titre: string; texte: string }[] }) {
  return (
    <ol className="relative lg:grid lg:grid-cols-5 lg:gap-6">
      {etapes.map((e, i) => (
        <li key={e.titre} className="relative flex gap-4 pb-7 last:pb-0 lg:block lg:pb-0">
          {/* Le rail est fait de segments portés par chaque étape, pas d'une seule barre posée
              sur la liste : une barre traversante s'arrête au bord du conteneur, donc dépasse
              la dernière pastille d'une demi-colonne — un trait qui part dans le vide. Un
              segment par intervalle s'arrête là où le suivant commence. */}
          {i < etapes.length - 1 && (
            <>
              <span aria-hidden
                className="lg:hidden absolute left-[19px] top-11 bottom-1 w-px bg-border" />
              <span aria-hidden
                className="hidden lg:block absolute top-[19px] left-[46px] right-[-18px] h-px bg-border" />
            </>
          )}
          <span className="relative z-10 w-10 h-10 rounded-full shrink-0 grid place-items-center
                           bg-card border border-primary/25 text-primary text-sm font-bold chiffres-tabulaires">
            {i + 1}
          </span>
          <div className="min-w-0 lg:mt-4">
            <p className="font-semibold text-[15px] leading-snug">{e.titre}</p>
            <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{e.texte}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Condition d'accès, avec sa progression réelle.
 *
 * L'ancienne page cochait ou verrouillait — un état binaire qui ne dit rien à qui approche.
 * La barre, elle, montre la distance qui reste : c'est la seule progression que la page
 * possède avant l'adhésion, et elle vient de vraies valeurs (jours écoulés, leçons validées).
 */
export function Jauge({ fait, label, valeur, cible, unite }: {
  fait: boolean; label: string; valeur: number; cible: number; unite: string;
}) {
  const pct = cible > 0 ? Math.min(100, Math.round((valeur / cible) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className={`w-6 h-6 rounded-full grid place-items-center shrink-0 ${
          fait ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {fait ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
          <span className="sr-only">{fait ? "Condition remplie" : "Condition non remplie"}</span>
        </span>
        <p className="text-sm font-medium min-w-0 flex-1">{label}</p>
        <p className="text-sm font-semibold chiffres-tabulaires shrink-0">
          <span className={fait ? "text-primary" : ""}>{Math.min(valeur, cible)}</span>
          <span className="text-muted-foreground"> / {cible}</span>
        </p>
      </div>
      <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        aria-label={`${label} — ${valeur} sur ${cible} ${unite}`}>
        <BarreRemplissage pct={pct} className="h-1.5" />
      </div>
    </div>
  );
}

/** Indicateur du tableau de bord. Le chiffre d'abord, son libellé ensuite. */
export function Indicateur({ icone: Icone, label, enfant, accent = false }: {
  icone: any; label: string; enfant: ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${
      accent ? "border-primary/25 bg-primary/[0.04]" : "border-border/60 bg-card"}`}>
      <Icone className={`w-4 h-4 mb-3 ${accent ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
      <p className={`titre-affichage text-[26px] sm:text-3xl font-semibold leading-none chiffres-tabulaires ${
        accent ? "text-primary" : ""}`}>
        {enfant}
      </p>
      {/* Le gris atténué passe (4,66:1) sur la carte blanche, mais retombe à 4,23:1 dès qu'on
          le pose sur la teinte du bloc accentué — le fond monte, le contraste baisse. Sur cette
          variante-là, et seulement elle, le libellé prend l'encre du texte. */}
      <p className={`text-[11px] sm:text-xs mt-2 ${accent ? "text-foreground/70" : "text-muted-foreground"}`}>{label}</p>
    </div>
  );
}
