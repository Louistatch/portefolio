/**
 * Les emails de forum ne doivent pas devenir du bruit.
 *
 *   npm run verify:notifications
 *
 * Deux choses se vérifient ici. La règle, cas par cas — on ne se notifie pas soi-même, on
 * n'écrit pas à une adresse non confirmée, on respecte le désabonnement. Et surtout le
 * VOLUME : simulation d'une discussion réelle sur le forum de promotion, pour compter les
 * emails que la règle produirait.
 *
 * C'est ce compte qui justifie la fenêtre de trois heures. Sans elle, une discussion d'une
 * dizaine de réponses entre vingt-et-un étudiants envoie deux cents emails. On n'écrit ce
 * volume qu'une fois : ensuite les gens filtrent, se désabonnent ou signalent comme
 * indésirable, et ce qui se perd est l'email qui comptait — l'admission, le certificat.
 */

import {
  raisonDeNePasNotifier, FENETRE_NOTIF_FORUM_MS,
  type DestinataireForum, type RaisonSilence,
} from "../shared/notifications.js";

let ko = 0;
const v = (nom: string, cond: boolean, detail = "") => {
  if (!cond) ko++;
  console.log((cond ? "  ok  " : "  KO  ") + nom + (cond ? "" : "  → " + detail));
};

const T = Date.UTC(2026, 7, 29, 12, 0, 0);
const sain = (id: number): DestinataireForum =>
  ({ id, email: `e${id}@exemple.org`, course_emails: true, email_verified: true, status: "active" });

// ── La règle, cas par cas ────────────────────────────────────────────────────
console.log("Règle de silence\n");
const cas: [string, DestinataireForum, number, number | null, RaisonSilence | null][] = [
  ["un participant ordinaire est notifié", sain(2), 1, null, null],
  ["l'auteur ne se notifie pas lui-même", sain(1), 1, null, "auteur"],
  ["sans adresse, rien n'est envoyé", { ...sain(2), email: null }, 1, null, "sans_adresse"],
  ["le désabonnement est respecté", { ...sain(2), course_emails: false }, 1, null, "desabonne"],
  ["une adresse non confirmée n'est pas écrite", { ...sain(2), email_verified: false }, 1, null, "non_verifie"],
  ["un compte suspendu n'est pas écrit", { ...sain(2), status: "suspended" }, 1, null, "suspendu"],
  ["déjà notifié il y a une heure : silence", sain(2), 1, T - 60 * 60 * 1000, "deja_notifie"],
  ["notifié il y a quatre heures : on écrit", sain(2), 1, T - 4 * 60 * 60 * 1000, null],
  ["préférence absente = consentement", { id: 2, email: "e@x.org" }, 1, null, null],
];
for (const [nom, d, auteur, dernier, attendu] of cas) {
  const r = raisonDeNePasNotifier(d, auteur, dernier, T);
  v(nom, r === attendu, `attendu ${attendu ?? "envoi"}, obtenu ${r ?? "envoi"}`);
}

// ── Le volume, sur une discussion réelle ─────────────────────────────────────
//
// Vingt-et-un étudiants — l'effectif réel de la promotion — et une discussion animée :
// douze messages en deux heures, écrits par cinq personnes différentes.
console.log("\nVolume sur une discussion de promotion\n");

function emailsProduits(fenetreMs: number) {
  const promo = Array.from({ length: 21 }, (_, i) => sain(i + 1));
  const dernierEnvoi = new Map<number, number>();
  const auteurs = [3, 7, 3, 11, 7, 2, 3, 15, 7, 11, 3, 2];
  let total = 0;

  auteurs.forEach((auteur, i) => {
    const maintenant = T + i * 10 * 60 * 1000;          // un message toutes les dix minutes
    for (const d of promo) {
      const r = raisonDeNePasNotifier(d, auteur, dernierEnvoi.get(d.id) ?? null, maintenant, fenetreMs);
      if (r) continue;
      dernierEnvoi.set(d.id, maintenant);
      total++;
    }
  });
  return total;
}

const sansFenetre = emailsProduits(0);
const avecFenetre = emailsProduits(FENETRE_NOTIF_FORUM_MS);
console.log(`  sans fenêtre   : ${sansFenetre} emails`);
console.log(`  fenêtre de 3 h : ${avecFenetre} emails`);
console.log(`  soit ${(sansFenetre / avecFenetre).toFixed(1)} fois moins.\n`);

v("sans fenêtre, une seule discussion dépasse deux cents emails", sansFenetre > 200, `${sansFenetre}`);
v("avec la fenêtre, la même discussion tient sous trente emails", avecFenetre <= 30, `${avecFenetre}`);
v("chacun reste prévenu au moins une fois", avecFenetre >= 20, `${avecFenetre} pour 21 étudiants`);

// ── Le forum de groupe, où le volume n'est pas le sujet ──────────────────────
// Quatre membres : la fenêtre ne doit pas empêcher les coéquipiers d'être prévenus.
{
  const groupe = [1, 2, 3, 4].map(sain);
  const notifiesAuPremier = groupe.filter(d => !raisonDeNePasNotifier(d, 1, null, T)).length;
  v("dans un groupe de quatre, les trois autres sont prévenus", notifiesAuPremier === 3, `${notifiesAuPremier}`);
}

console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUT PASSE");
process.exit(ko ? 1 : 0);
