import { useEffect } from "react";
import { studentFetch, isStudentLoggedIn } from "@/lib/student";

/** Intervalle entre deux signaux. Doit rester égal à ACTIVITE_PAS_MINUTES côté serveur :
 *  c'est le plafond que le serveur applique à chaque crédit. */
const PAS_MS = 5 * 60 * 1000;

/**
 * Compte le temps réellement passé dans l'espace étudiant.
 *
 * ── Ce que « visible » change ──
 *
 * Le signal ne part que si l'onglet est au premier plan. Un onglet laissé ouvert toute la nuit
 * derrière une autre fenêtre ne compte donc pas : on mesure une présence, pas une session
 * oubliée. C'est la différence entre « il a travaillé vingt minutes » et « son navigateur
 * était allumé ».
 *
 * ── Pourquoi rien n'est envoyé au montage ──
 *
 * Le premier signal part APRÈS un intervalle. Une page ouverte puis refermée dans la seconde
 * ne crédite rien, alors qu'un envoi immédiat lui aurait offert cinq minutes. Le serveur, de
 * son côté, ne crédite jamais plus que le temps écoulé depuis le signal précédent : les deux
 * bouts se protègent, et aucun ne fait confiance à l'autre.
 */
export function usePresence() {
  useEffect(() => {
    if (!isStudentLoggedIn()) return;
    let vivant = true;

    const signaler = () => {
      if (!vivant) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      // L'échec est sans conséquence : c'est une mesure, pas une fonctionnalité. Il ne doit
      // surtout pas remonter une erreur à l'étudiant, qui n'a rien demandé.
      studentFetch("/api/academy/activite", { method: "POST" }).catch(() => {});
    };

    const minuteur = setInterval(signaler, PAS_MS);
    return () => { vivant = false; clearInterval(minuteur); };
  }, []);
}
