import { useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { alerteDeRetard, type ConstatRetard } from "@shared/retard";

// Bandeau d'alerte de retard, affiché en tête de l'espace étudiant.
//
// Il dit une chose que le tableau de bord ne disait nulle part : ce qu'il advient d'un
// parcours qu'on cesse de suivre. Le texte vient de shared/retard.ts, d'où l'email de
// relance le tire aussi — l'écran et la boîte mail ne peuvent donc pas annoncer deux
// échéances différentes.

const TONS = {
  info: {
    boite: "bg-muted/50 border-border",
    titre: "text-foreground",
    icone: "text-muted-foreground",
    corps: "text-muted-foreground",
    bouton: "bg-foreground text-background hover:bg-foreground/90",
  },
  attention: {
    boite: "bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-900/40",
    titre: "text-amber-900 dark:text-amber-200",
    icone: "text-amber-600 dark:text-amber-400",
    corps: "text-amber-800/90 dark:text-amber-200/80",
    bouton: "bg-amber-700 text-white hover:bg-amber-800",
  },
  grave: {
    boite: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40",
    titre: "text-red-900 dark:text-red-200",
    icone: "text-red-600 dark:text-red-400",
    corps: "text-red-800/90 dark:text-red-200/80",
    bouton: "bg-red-700 text-white hover:bg-red-800",
  },
} as const;

export function AlerteRetard({ constat }: { constat: ConstatRetard | null }) {
  // Le détail des conséquences est replié par défaut : l'étudiant qui a compris n'a pas
  // besoin de relire la liste à chaque connexion, et celui qui découvre peut l'ouvrir.
  const [ouvert, setOuvert] = useState(false);
  const alerte = constat ? alerteDeRetard(constat) : null;
  if (!alerte) return null;
  const t = TONS[alerte.ton];

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 ${t.boite}`}>
      <div className="flex gap-3.5">
        <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${t.icone}`} />
        <div className="min-w-0 flex-1">
          <h2 className={`font-serif text-lg sm:text-xl font-semibold leading-snug ${t.titre}`}>
            {alerte.titre}
          </h2>
          <p className={`text-sm font-semibold mt-1 ${t.titre}`}>{alerte.resume}</p>

          <div className={`text-[13px] leading-relaxed mt-3 space-y-2.5 ${t.corps}`}>
            {alerte.paragraphes.map(p => <p key={p}>{p}</p>)}
          </div>

          {alerte.consequences.length > 0 && (
            <div className="mt-4">
              <button onClick={() => setOuvert(o => !o)}
                className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${t.titre} hover:underline`}>
                {ouvert ? "Masquer le détail" : "Ce qu'une remise à zéro entraîne"}
                {ouvert ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {ouvert && (
                <div className="grid sm:grid-cols-2 gap-4 mt-3.5">
                  <div>
                    <div className={`text-[11px] tracking-[0.1em] uppercase font-bold mb-2 ${t.titre}`}>
                      Ce qui est effacé
                    </div>
                    <ul className={`text-[13px] leading-relaxed space-y-1.5 ${t.corps}`}>
                      {alerte.consequences.map(c => (
                        <li key={c} className="flex gap-2"><span aria-hidden="true">—</span><span>{c}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className={`text-[11px] tracking-[0.1em] uppercase font-bold mb-2 ${t.titre}`}>
                      Ce qui est conservé
                    </div>
                    <ul className={`text-[13px] leading-relaxed space-y-1.5 ${t.corps}`}>
                      {alerte.conserve.map(c => (
                        <li key={c} className="flex gap-2"><span aria-hidden="true">—</span><span>{c}</span></li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {alerte.joursAvantRemiseAZero > 0 && (
            <p className={`text-[13px] font-semibold mt-4 ${t.titre}`}>
              {alerte.joursAvantRemiseAZero} jour{alerte.joursAvantRemiseAZero > 1 ? "s" : ""} avant le seuil de remise à zéro
              {alerte.dateRemiseAZero && <> — {new Date(alerte.dateRemiseAZero).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</>}
            </p>
          )}

          <Link href={alerte.action.href}
            className={`inline-block mt-4 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors ${t.bouton}`}>
            {alerte.action.libelle}
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Constat de retard calculé depuis le planning déjà chargé par l'écran — aucun appel
 * supplémentaire. La mesure est celle du serveur : l'âge de la plus ancienne échéance non
 * tenue, et non le nombre de leçons manquantes, qui punirait autant l'étudiant rapide
 * parti en congés que celui qui a décroché.
 */
export function constatDepuisPlanning(
  planning: any[],
  finAdmission?: string | null,
): ConstatRetard | null {
  const now = Date.now();
  const enRetard = (planning || []).filter(
    (l: any) => l?.status !== "completed" && l?.due_at && new Date(l.due_at).getTime() < now,
  );
  if (!enRetard.length) return null;
  const jours = Math.floor(
    Math.max(...enRetard.map((l: any) => now - new Date(l.due_at).getTime())) / 86400000,
  );
  return { jours, leconsEnRetard: enRetard.length, finAdmission: finAdmission ?? null };
}
