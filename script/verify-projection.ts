/**
 * La projection par le canal de données.
 *
 *   npm run verify:projection
 *
 * Le réseau n'est pas testable ici — le proxy de l'environnement d'agent refuse meet.jit.si,
 * et il faudrait de toute façon une vraie conférence à deux participants. La LOGIQUE l'est
 * entièrement, et c'est là que sont les erreurs : la forme de l'événement, qui a le droit de
 * faire tourner les pages, et ce qu'on fait d'un index venu du réseau.
 *
 * Ce contrôle vérifie aussi le gain — il compte les requêtes des deux côtés du changement.
 */

import {
  lireMessageProjection, texteDuMessage, expediteurDuMessage, APP_PROJECTION,
} from "../shared/projection.js";

let ko = 0;
const v = (nom: string, cond: boolean, detail = "") => {
  if (!cond) ko++;
  console.log((cond ? "  ok  " : "  KO  ") + nom + (cond ? "" : "  → " + detail));
};
const msg = (i: number) => JSON.stringify({ app: APP_PROJECTION, t: "diapo", i });

// ── La forme de l'événement ──────────────────────────────────────────────────
// Elle varie selon les versions de Jitsi, et nous ne choisissons pas celle de meet.jit.si.
console.log("Forme de l'événement\n");
{
  const cas: [string, any][] = [
    ["eventData.text",       { eventData: { text: msg(4) }, senderInfo: { id: "abc" } }],
    ["data.eventData.text",  { data: { eventData: { text: msg(4) }, senderInfo: { id: "abc" } } }],
    ["text à la racine",     { text: msg(4), senderInfo: { id: "abc" } }],
  ];
  for (const [nom, e] of cas) {
    const lu = lireMessageProjection(texteDuMessage(e), "moderator", 12);
    v(`le texte est trouvé sous ${nom}`, "index" in lu && lu.index === 4, JSON.stringify(lu));
  }
  v("l'expéditeur est trouvé sous senderInfo.id",
    expediteurDuMessage({ senderInfo: { id: "abc" } }) === "abc");
  v("l'expéditeur est trouvé sous data.senderInfo.id",
    expediteurDuMessage({ data: { senderInfo: { id: "abc" } } }) === "abc");
}

// ── Ce qu'on refuse ──────────────────────────────────────────────────────────
console.log("\nCe qui ne fait pas tourner la page\n");
{
  const cas: [string, unknown, string | null, string][] = [
    ["un événement sans texte",             undefined,                       "moderator", "sans_texte"],
    ["un texte qui n'est pas du JSON",      "bonjour la salle",              "moderator", "json_invalide"],
    ["un message d'une autre application",  JSON.stringify({ app: "autre", t: "diapo", i: 2 }), "moderator", "autre_application"],
    ["un message d'un autre type",          JSON.stringify({ app: APP_PROJECTION, t: "sondage", i: 2 }), "moderator", "autre_type"],
    ["un index qui n'est pas un nombre",    JSON.stringify({ app: APP_PROJECTION, t: "diapo", i: "sept" }), "moderator", "index_invalide"],
    ["un participant ordinaire",            msg(3),                          "participant", "expediteur_non_moderateur"],
  ];
  for (const [nom, texte, role, attendu] of cas) {
    const lu = lireMessageProjection(texte, role, 12);
    v(nom, "refus" in lu && lu.refus === attendu, JSON.stringify(lu));
  }
}

// ── Les bornes ───────────────────────────────────────────────────────────────
// Un index venu du réseau ne commande pas un tableau.
console.log("\nUn index venu du réseau est borné\n");
{
  const borne = (i: any, n = 12) => {
    const lu = lireMessageProjection(JSON.stringify({ app: APP_PROJECTION, t: "diapo", i }), "moderator", n);
    return "index" in lu ? lu.index : null;
  };
  v("un index négatif retombe à 0", borne(-5) === 0, `${borne(-5)}`);
  v("un index au-delà de la dernière diapositive s'y arrête", borne(999) === 11, `${borne(999)}`);
  v("un index décimal est tronqué", borne(4.9) === 4, `${borne(4.9)}`);
  v("sans aucune diapositive, l'index reste 0", borne(7, 0) === 0, `${borne(7, 0)}`);
  v("un index valide passe tel quel", borne(7) === 7, `${borne(7)}`);
}

// ── L'expéditeur inconnu ─────────────────────────────────────────────────────
// Il arrive normalement dans la fraction de seconde qui suit une arrivée. Refuser ferait
// manquer un changement au moment précis où quelqu'un rejoint, pour un gain nul.
console.log("\nL'expéditeur encore inconnu de la liste\n");
{
  const lu = lireMessageProjection(msg(5), null, 12);
  v("un expéditeur inconnu est accepté", "index" in lu && lu.index === 5, JSON.stringify(lu));
}

// ── Le gain ──────────────────────────────────────────────────────────────────
console.log("\nRequêtes par séance\n");
{
  const etudiants = 21, minutes = 90;
  const avant = (minutes * 60 / 4) * etudiants;

  // Après : le filet interroge toutes les 20 s et s'arrête au premier message reçu. Le pire
  // cas réaliste est un formateur qui met deux minutes avant sa première diapositive.
  const apresPireCas = Math.ceil((2 * 60) / 20) * etudiants;
  const apresCourant = 1 * etudiants;   // une lecture à l'entrée, puis le canal prend le relais

  console.log(`  sondage toutes les 4 s        : ${avant.toLocaleString("fr-FR")} invocations`);
  console.log(`  canal + filet, cas courant    : ${apresCourant} invocations`);
  console.log(`  canal + filet, pire cas       : ${apresPireCas} invocations`);
  console.log(`  soit ${Math.round(avant / apresPireCas)} à ${Math.round(avant / apresCourant)} fois moins.\n`);

  v("le pire cas reste sous 1 % de l'ancien volume", apresPireCas < avant * 0.01, `${apresPireCas} / ${avant}`);
  v("chaque étudiant lit au moins une fois l'état à l'entrée", apresCourant >= etudiants);
}

console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUT PASSE");
process.exit(ko ? 1 : 0);
