import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { AlertTriangle, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";

// ══════════════════════════════════════════════════════════════
// Ce qui demande une décision, en tête du tableau de bord.
//
// ── Ce qui a été corrigé ici ──
//
// La première version posait un bandeau pleine largeur par sujet : titre, paragraphe
// d'explication, liste, ligne de marche à suivre. Deux sujets, et sur un téléphone de
// 390 px le tableau de bord commençait sous 1 500 pixels de préambule. L'alerte avait
// mangé la page qu'elle devait servir.
//
// Le registre était celui d'un rapport, pas d'un tableau de bord. C'est compréhensible —
// ces textes ont été écrits au moment où le défaut venait d'être trouvé, quand il fallait
// l'expliquer. Mais une explication qu'on relit à chaque connexion cesse d'être lue, et
// couvre alors ce qu'elle annonce.
//
// ── La grammaire retenue ──
//
// Celle de l'alerte de retard côté étudiant (components/academy/alerte-retard.tsx), déjà
// en service : une ligne par sujet, le détail REPLIÉ par défaut. La raison y était déjà
// écrite et vaut ici — qui a compris n'a pas besoin de relire, qui découvre peut ouvrir.
//
// Même palette de gravité que l'alerte étudiante, appliquée à la puce plutôt qu'au fond :
// l'administrateur voit une FILE de sujets, l'étudiant en voit UN qui le concerne. Même
// langage, densité différente, parce que ce n'est pas le même travail.
// ══════════════════════════════════════════════════════════════

export type PointAttention = {
  cle: string;
  /** Gravité : `grave` pour ce qui est cassé, `attention` pour ce qui attend une décision. */
  ton: "grave" | "attention";
  /** La ligne qu'on lit sans ouvrir. Elle doit suffire à savoir s'il faut agir aujourd'hui. */
  resume: string;
  /** Le détail, replié. */
  detail: ReactNode;
  action?: { libelle: string; href: string };
};

const PUCE = {
  grave: "bg-red-500",
  attention: "bg-amber-500",
} as const;

const TEXTE = {
  grave: "text-red-700 dark:text-red-300",
  attention: "text-amber-700 dark:text-amber-300",
} as const;

export function PointsAttention({ points }: { points: PointAttention[] }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  if (!points.length) return null;

  const graves = points.filter(p => p.ton === "grave").length;

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-[var(--shadow-1)]">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border/50 bg-muted/30">
        <AlertTriangle className={`w-4 h-4 shrink-0 ${graves ? TEXTE.grave : TEXTE.attention}`} />
        <h2 className="text-sm font-semibold">À votre attention</h2>
        <span className="ml-auto text-xs text-muted-foreground chiffres-tabulaires">
          {points.length} sujet{points.length > 1 ? "s" : ""}
        </span>
      </div>

      <ul className="divide-y divide-border/50">
        {points.map(p => {
          const estOuvert = ouvert === p.cle;
          return (
            <li key={p.cle}>
              <button
                onClick={() => setOuvert(estOuvert ? null : p.cle)}
                aria-expanded={estOuvert}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${PUCE[p.ton]}`} aria-hidden="true" />
                <span className="text-[13.5px] min-w-0 flex-1">{p.resume}</span>
                {estOuvert
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>

              {estOuvert && (
                <div className="px-5 pb-4 pl-10 text-[13px] text-muted-foreground leading-relaxed space-y-2">
                  {p.detail}
                  {p.action && (
                    <Link href={p.action.href}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-accent transition-colors pt-0.5">
                      {p.action.libelle} <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
