import { ChevronRight, Check, ArrowDown, Info } from "lucide-react";

/**
 * Briques de la page de présentation.
 *
 * Chaque information marquante est un objet visuel réutilisable plutôt qu'un bloc de texte :
 * le lecteur reconnaît la forme avant de lire, et la même carte se réemploie ailleurs sans
 * la redessiner. Toutes les couleurs passent par les jetons du thème, à une exception près —
 * l'accent propre à chaque outil, qui est une donnée du module et arrive du serveur.
 */

/** Vert foncé de la marque, en dur et non en jeton : les blocs immersifs (héros, appel final)
 *  restent sombres dans les deux thèmes, sinon ils s'effondrent en mode sombre. */
export const VERT_FONCE = "hsl(160 84% 11%)";
export const VERT_FONCE_2 = "hsl(160 72% 17%)";
export const VERT_CLAIR = "hsl(152 70% 62%)";

export function Section({ id, titre, sousTitre, children, fond = false, vert = false }: {
  id?: string; titre?: string; sousTitre?: string; children: React.ReactNode;
  fond?: boolean; vert?: boolean;
}) {
  return (
    <section id={id}
      className={`scroll-mt-20 py-14 sm:py-20 ${vert ? "bg-primary/5" : fond ? "bg-muted/40" : ""}`}>
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        {titre && (
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-[2rem] font-bold tracking-tight">{titre}</h2>
            {sousTitre && <p className="text-muted-foreground mt-2.5 max-w-2xl mx-auto">{sousTitre}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/** Bénéfice immédiat : icône, titre court, une ligne d'explication. */
export function CarteBenefice({ icone: Icone, titre, texte }: { icone: any; titre: string; texte: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary grid place-items-center shrink-0">
        <Icone className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-sm leading-snug">{titre}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{texte}</p>
      </div>
    </div>
  );
}

/**
 * Carte de module — l'objet central de la page.
 *
 * Elle porte l'outil enseigné, le projet réel qui sert de fil conducteur, les compétences
 * acquises et le volume de travail. Ce dernier point compte : annoncer « 7 leçons et
 * 50 exercices » engage bien davantage qu'un « formation complète » creux.
 *
 * Le bandeau supérieur tient lieu de visuel. Il est dessiné à partir de l'accent de l'outil
 * plutôt que chargé comme photo : rien à télécharger, aucun décalage de mise en page pendant
 * le chargement, et le rendu reste juste quand un module est ajouté sans qu'on ait d'image.
 */
export function CarteModule({ module: m, onDetail }: { module: any; onDetail: () => void }) {
  const NIVEAUX: Record<string, string> = {
    debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé",
  };
  return (
    <article
      className="group flex flex-col bg-card rounded-3xl border border-border/60 overflow-hidden
                 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-border">
      {/* Visuel de l'outil — le seul endroit où la couleur vient de la donnée */}
      <div className="relative h-32 shrink-0 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${m.accent} 0%, ${m.accent}b0 100%)` }}
        aria-hidden>
        <span className="absolute -right-3 -bottom-5 text-[5.5rem] font-black text-white/15 leading-none tracking-tighter select-none">
          {m.outil.slice(0, 4)}
        </span>
        <span className="absolute left-5 top-5 text-white/90 text-[11px] font-mono tracking-wide">
          {m.code}
        </span>
      </div>

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold leading-tight">{m.outil}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{m.objectif}</p>
          </div>
          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground shrink-0">
            {NIVEAUX[m.niveau] || m.niveau}
          </span>
        </div>

        <div className="mt-4 p-3 rounded-2xl bg-muted/50">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Projet fil rouge</p>
          <p className="text-[13px] font-medium mt-0.5 leading-snug">{m.titreProjet}</p>
        </div>

        <ul className="mt-4 space-y-2 flex-1">
          {m.competences.map((c: string) => (
            <li key={c} className="flex items-start gap-2 text-[13px]">
              <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: m.accent }} />
              <span className="text-muted-foreground">{c}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-5 pt-4 border-t border-border/50 text-[11px] text-muted-foreground">
          <span><strong className="text-foreground">{m.lecons}</strong> leçons</span>
          {m.exercices > 0 && <><span aria-hidden>·</span>
            <span><strong className="text-foreground">{m.exercices}</strong> exercices notés</span></>}
        </div>

        <button onClick={onDetail}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium transition-colors self-start"
          style={{ color: m.accent }}>
          En savoir plus
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </article>
  );
}

/** Argument de valeur : une raison de choisir, pas une fonctionnalité. */
export function CarteValeur({ icone: Icone, titre, texte }: { icone: any; titre: string; texte: string }) {
  return (
    <div className="text-center px-4">
      <span className="w-14 h-14 rounded-2xl bg-background/80 text-primary grid place-items-center mx-auto mb-4 shadow-sm">
        <Icone className="w-6 h-6" />
      </span>
      <p className="font-semibold leading-snug">{titre}</p>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{texte}</p>
    </div>
  );
}

/**
 * Carte de session du calendrier.
 *
 * L'admission étant continue, ces cartes informent d'un rythme, elles ne verrouillent rien.
 * Le libellé le dit explicitement, faute de quoi un visiteur arrivant entre deux fenêtres
 * conclurait qu'il doit attendre.
 */
export function CarteSession({ session, rang, prochaine }: { session: any; rang: number; prochaine: boolean }) {
  const ouverte = session.statut === "ouverte";
  const marquee = ouverte || prochaine;
  const mois = (v: string) => v.replace(/ \d{4}$/, "");
  // Le dernier jour du mois vient de la date de fin renvoyée par le serveur, pas d'un
  // tableau 30/31 recopié à la main — février et les années bissextiles s'en chargent seuls.
  const dernierJour = session.finInscription ? new Date(session.finInscription).getDate() : null;

  return (
    <div className={`relative rounded-2xl border p-4 text-center transition-all hover:shadow-md ${
      ouverte ? "border-primary bg-primary/5"
      : prochaine ? "border-primary/40 bg-card"
      : "border-border/60 bg-card"}`}>
      <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold mx-auto mb-2.5 ${
        marquee ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {rang}
      </span>
      <p className="font-bold text-sm capitalize leading-tight">{mois(session.moisInscription)}</p>
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
        Inscription<br />
        {dernierJour ? <>du 1 au {dernierJour}<br /></> : null}
        <span className="capitalize">{mois(session.moisInscription)}</span>
      </p>
      <ArrowDown className="w-3.5 h-3.5 mx-auto my-2 text-muted-foreground/50" aria-hidden />
      <p className="text-[11px] font-medium px-2 py-1.5 rounded-xl bg-primary/10 text-primary leading-tight">
        Démarrage<br /><span className="capitalize">{mois(session.moisDemarrage)}</span>
      </p>
      {marquee && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
          {ouverte ? "en cours" : "prochaine"}
        </span>
      )}
    </div>
  );
}

/** Étape du parcours apprenant, numérotée. */
export function Etape({ n, titre, texte, verrou }: { n: number; titre: string; texte: string; verrou?: boolean }) {
  return (
    <div className="flex gap-3.5">
      <div className="flex flex-col items-center shrink-0">
        <span className={`w-8 h-8 rounded-full grid place-items-center text-xs font-bold ${
          verrou ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
          {n}
        </span>
        <span className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-6 min-w-0">
        <p className="font-semibold text-sm leading-tight">{titre}</p>
        <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{texte}</p>
      </div>
    </div>
  );
}

/** Chiffre marquant, compté en base. */
export function Chiffre({ valeur, libelle, clair = false }: {
  valeur: string | number; libelle: string; clair?: boolean;
}) {
  return (
    <div className="text-center">
      <p className={`text-2xl sm:text-3xl font-bold leading-none ${clair ? "" : "text-primary"}`}
        style={clair ? { color: VERT_CLAIR } : undefined}>
        {valeur}
      </p>
      <p className={`text-[11px] sm:text-xs mt-1.5 ${clair ? "text-white/70" : "text-muted-foreground"}`}>
        {libelle}
      </p>
    </div>
  );
}

/** Bandeau du calendrier, avec son avertissement sur l'admission continue. */
export function AvisAdmissionContinue({ prochaine }: { prochaine: any }) {
  return (
    <div className="flex items-start gap-2.5 mt-6 p-3.5 rounded-2xl bg-primary/5 border border-primary/20">
      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        <strong className="text-foreground">Vous n'avez pas à attendre une session.</strong>{" "}
        L'inscription est ouverte en permanence : créez votre compte, réussissez le test, et vos
        premières leçons s'ouvrent immédiatement. Le calendrier ci-dessus indique le rythme des
        promotions{prochaine ? <> — la prochaine démarre en <span className="capitalize">{prochaine.moisDemarrage.replace(/ \d{4}$/, "")}</span></> : null}.
      </p>
    </div>
  );
}
