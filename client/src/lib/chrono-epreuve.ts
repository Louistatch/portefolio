import { useEffect, useRef, useState } from "react";
import { formatCompteARebours, PROPORTION_ALERTE, type FenetreChrono } from "@shared/chronometrage";

export type { FenetreChrono };

export type EtatChrono = {
  restantSecondes: number;
  /** mm:ss, jamais négatif. */
  affichage: string;
  /** Dans les derniers 20 % du temps alloué — c'est ici que l'affichage doit changer de ton. */
  alerte: boolean;
  expire: boolean;
};

/**
 * Compte à rebours d'une épreuve chronométrée, partagé entre program-test.tsx et
 * elearning.tsx — les deux portes par lesquelles un étudiant démarre un test.
 *
 * `fenetre` vient du serveur (POST .../start-test ou GET .../test-status), jamais recalculée
 * depuis une horloge locale : recharger la page ne doit ni remettre le compteur à zéro, ni
 * en offrir davantage. `onExpire` est appelé UNE seule fois, exactement quand le temps
 * s'épuise — c'est l'endroit où la page appelante doit soumettre automatiquement les
 * réponses déjà données.
 */
export function useChronoEpreuve(fenetre: FenetreChrono | null, onExpire: () => void): EtatChrono | null {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const declenche = useRef(false);

  useEffect(() => {
    if (!fenetre) return;
    declenche.current = false;
    const id = setInterval(() => {
      setMaintenant(Date.now());
      if (new Date(fenetre.expiresAt).getTime() <= Date.now()) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [fenetre?.testStartedAt, fenetre?.expiresAt]);

  const restantSecondes = fenetre ? Math.max(0, (new Date(fenetre.expiresAt).getTime() - maintenant) / 1000) : 0;
  const expire = !!fenetre && restantSecondes <= 0;

  useEffect(() => {
    if (expire && !declenche.current) { declenche.current = true; onExpireRef.current(); }
  }, [expire]);

  if (!fenetre) return null;
  return {
    restantSecondes,
    affichage: formatCompteARebours(restantSecondes),
    alerte: restantSecondes <= fenetre.durationSeconds * PROPORTION_ALERTE,
    expire,
  };
}
