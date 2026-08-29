// ══════════════ Qui reçoit un email de forum, et quand ══════════════
//
// La règle vit ici et non au milieu des requêtes, pour la même raison que celle du rythme
// des leçons : une règle qu'on ne peut interroger qu'avec une base de données est une règle
// que personne n'interroge.
//
// Ce qui est en jeu tient en une phrase. Le forum de promotion réunit vingt-et-un étudiants ;
// notifier chaque message aurait produit deux cents emails pour une discussion d'une dizaine
// de réponses. Le coût n'est pas le vrai problème — on n'écrit ce volume qu'une fois. Ensuite
// les gens filtrent, se désabonnent, ou signalent comme indésirable, et ce qui se perd alors
// ce sont les emails qui comptent : l'admission, la correction d'un travail, le certificat.
// Une notification trop bavarde ne fait pas qu'agacer, elle détruit le canal.

/** Une notification par personne et par forum toutes les trois heures, pas une par message. */
export const FENETRE_NOTIF_FORUM_MS = 3 * 60 * 60 * 1000;

export type DestinataireForum = {
  id: number;
  email: string | null;
  /** Préférence explicite de l'étudiant. `null`/`undefined` valent « oui ». */
  course_emails?: boolean | null;
  /** `false` = adresse jamais confirmée. */
  email_verified?: boolean | null;
  status?: string | null;
};

export type RaisonSilence =
  | "auteur"            // on ne se notifie pas soi-même
  | "sans_adresse"
  | "desabonne"         // a coupé les emails de cours
  | "non_verifie"       // écrire à une adresse non confirmée abîme la réputation d'envoi
  | "suspendu"
  | "deja_notifie";     // déjà prévenu pour ce forum dans la fenêtre

/**
 * Faut-il écrire à cette personne ?
 *
 * Renvoie `null` s'il faut envoyer, sinon la raison du silence — une raison nommée plutôt
 * qu'un booléen, parce que « pourquoi cette personne n'a-t-elle rien reçu ? » est la seule
 * question qu'on se pose ensuite, et qu'un `false` n'y répond pas.
 *
 * `dernierEnvoiAt` est l'instant du dernier email de forum envoyé à cette personne POUR CE
 * FORUM, ou null si elle n'en a jamais reçu. Fenêtre glissante et non fenêtre fixe : un
 * message à 14 h 59 suivi d'un autre à 15 h 01 ne doit pas produire deux emails simplement
 * parce que l'heure a changé.
 */
export function raisonDeNePasNotifier(
  d: DestinataireForum,
  auteurId: number,
  dernierEnvoiAt: number | null,
  maintenant: number,
  fenetreMs: number = FENETRE_NOTIF_FORUM_MS,
): RaisonSilence | null {
  if (d.id === auteurId) return "auteur";
  if (!d.email) return "sans_adresse";
  if (d.course_emails === false) return "desabonne";
  if (d.email_verified === false) return "non_verifie";
  if (d.status === "suspended") return "suspendu";
  if (dernierEnvoiAt != null && maintenant - dernierEnvoiAt < fenetreMs) return "deja_notifie";
  return null;
}
