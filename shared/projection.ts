// ══════════════ La projection, par le canal de données ══════════════
//
// La règle qui décide si un message reçu fait tourner la page, isolée ici pour la même
// raison que celles du rythme et des notifications : elle vit sinon dans un écouteur Jitsi,
// où on ne peut l'interroger qu'avec une vraie conférence — donc jamais.
//
// Ce qu'elle remplace : chaque participant demandait à l'API, toutes les quatre secondes,
// quelle diapositive afficher. 28 350 invocations serverless pour une séance de 90 minutes à
// 21 étudiants, et jusqu'à 4 s de retard. Jitsi tient déjà une liaison directe entre tous ;
// un message par changement suffit.

/** Marqueur d'application : la salle peut voir passer d'autres messages que les nôtres. */
export const APP_PROJECTION = "louisfarm";

export type MessageProjection = { app: string; t: string; i: number };

export type RefusProjection =
  | "sans_texte"        // l'événement ne porte aucune charge lisible
  | "json_invalide"
  | "autre_application" // un message qui ne vient pas de nous
  | "autre_type"
  | "index_invalide"
  | "expediteur_non_moderateur";

/**
 * Faut-il suivre ce message, et vers quelle diapositive ?
 *
 * `null` en cas de refus — accompagné de la raison, parce que « pourquoi l'écran n'a-t-il
 * pas suivi ? » est la seule question qu'on se posera ensuite en séance.
 *
 * `roleExpediteur` vaut `null` quand l'expéditeur est inconnu de la liste des participants,
 * ce qui arrive normalement dans la fraction de seconde qui suit une arrivée. On accepte
 * alors : refuser ferait manquer un changement au moment précis où quelqu'un rejoint, pour
 * un gain de sécurité nul — un inconnu de la liste n'est pas plus suspect qu'un autre.
 */
export function lireMessageProjection(
  texte: unknown,
  roleExpediteur: string | null | undefined,
  nombreDeDiapos: number,
): { index: number } | { refus: RefusProjection } {
  if (typeof texte !== "string" || !texte) return { refus: "sans_texte" };

  let charge: any;
  try { charge = JSON.parse(texte); } catch { return { refus: "json_invalide" }; }

  if (charge?.app !== APP_PROJECTION) return { refus: "autre_application" };
  if (charge?.t !== "diapo") return { refus: "autre_type" };

  // Sans ce filtre, n'importe quel participant ferait défiler les diapositives de toute la
  // salle. Le garde-fou n'est pas parfait — Jitsi accorde le rôle de modérateur au premier
  // arrivé — mais il relève la barre, et la conséquence d'un contournement reste bénigne :
  // des écrans désynchronisés, que le formateur remet d'accord d'un clic.
  if (roleExpediteur != null && roleExpediteur !== "moderator") {
    return { refus: "expediteur_non_moderateur" };
  }

  const i = Number(charge.i);
  if (!Number.isFinite(i)) return { refus: "index_invalide" };

  // Borné avant d'être appliqué : un index venu du réseau ne commande pas un tableau.
  const haut = Math.max(0, nombreDeDiapos - 1);
  return { index: Math.max(0, Math.min(Math.trunc(i), haut)) };
}

/**
 * Le texte utile d'un événement `endpointTextMessageReceived`.
 *
 * Sa forme varie selon les versions de Jitsi — le texte se trouve tantôt sous
 * `eventData.text`, tantôt sous `data.eventData.text`, tantôt à la racine. On essaie les
 * trois plutôt que de parier sur une : cette page tourne sur l'instance publique
 * meet.jit.si, dont nous ne choisissons pas la version.
 */
export function texteDuMessage(e: any): unknown {
  return e?.eventData?.text ?? e?.data?.eventData?.text ?? e?.text;
}

/** L'identifiant de l'expéditeur, avec la même prudence sur la forme. */
export function expediteurDuMessage(e: any): string | undefined {
  return e?.senderInfo?.id ?? e?.data?.senderInfo?.id;
}
