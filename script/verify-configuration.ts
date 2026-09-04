/**
 * L'écran de configuration ne doit jamais laisser fuir une valeur secrète.
 *
 *   npm run verify:config
 *
 * Le panneau « Configuration du serveur » du tableau de bord affiche la PRÉSENCE des
 * variables d'environnement. La tentation d'y ajouter la valeur est réelle et arrive
 * toujours de bonne foi : on débogue un paiement qui échoue, on veut vérifier qu'on a
 * collé la bonne clé, on ajoute `valeur: process.env.FEDAPAY_SECRET_KEY` « une minute ».
 * La minute survit au commit, et la clé secrète de production part alors dans le
 * navigateur de tout administrateur — donc dans un cache, une capture d'écran, un partage
 * d'écran pendant une réunion.
 *
 * Ce contrôle remplit l'environnement de valeurs reconnaissables et refuse qu'une seule
 * d'entre elles ressorte, sauf pour les deux réglages non secrets explicitement autorisés.
 * Il échoue donc au moment où la ligne est écrite, pas le jour où la clé a fui.
 */
import { configurationDuServeur, VARIABLES_AFFICHABLES } from "../api/configuration.js";

let ko = 0;
const v = (nom: string, cond: boolean, detail = "") => {
  if (!cond) ko++;
  console.log((cond ? "  ok  " : "  KO  ") + nom + (cond ? "" : "  → " + detail));
};

// Des valeurs qu'on reconnaîtra n'importe où dans la charge renvoyée.
const SECRETES: Record<string, string> = {
  CRON_SECRET: "SECRET-CRON-A-NE-PAS-DIVULGUER",
  FEDAPAY_SECRET_KEY: "sk_live_SECRET-CLE-PAIEMENT",
  FEDAPAY_WEBHOOK_SECRET: "wh_SECRET-SIGNATURE",
  RESEND_API_KEY: "re_SECRET-EMAIL",
};
for (const [nom, valeur] of Object.entries(SECRETES)) process.env[nom] = valeur;
process.env.FEDAPAY_ENV = "live";
process.env.SITE_URL = "https://www.exemple.org";

const SITE = "https://www.exemple.org";
const etat = configurationDuServeur(SITE);
const charge = JSON.stringify(etat);

// ── La garantie principale ──
for (const [nom, valeur] of Object.entries(SECRETES)) {
  v(`la valeur de ${nom} ne sort pas`, !charge.includes(valeur),
    "elle apparaît dans la charge envoyée au navigateur");
}

// ── Et seuls deux réglages ont le droit d'exposer la leur ──
const avecValeur = etat.filter(e => e.valeur !== undefined).map(e => e.nom).sort();
v("seuls les réglages non secrets portent une valeur",
  JSON.stringify(avecValeur) === JSON.stringify([...VARIABLES_AFFICHABLES].sort()),
  `porteurs d'une valeur : ${avecValeur.join(", ")}`);

// ── La présence est correctement rapportée ──
v("une variable définie est signalée présente",
  etat.find(e => e.nom === "CRON_SECRET")?.presente === true);
v("l'environnement de paiement est lisible", etat.find(e => e.nom === "FEDAPAY_ENV")?.valeur === "live");
v("l'adresse du site est lisible", etat.find(e => e.nom === "SITE_URL")?.valeur === SITE);

// ── Et l'absence aussi ──
for (const nom of Object.keys(SECRETES)) delete process.env[nom];
delete process.env.FEDAPAY_ENV;
const vide = configurationDuServeur(SITE);
for (const nom of Object.keys(SECRETES)) {
  v(`${nom} absente est signalée absente`, vide.find(e => e.nom === nom)?.presente === false);
}
// FEDAPAY_ENV absente doit valoir sandbox : c'est le réglage prudent, et l'écran doit le
// dire plutôt que de laisser croire qu'on encaisse réellement.
v("sans FEDAPAY_ENV, l'écran annonce « sandbox »",
  vide.find(e => e.nom === "FEDAPAY_ENV")?.valeur === "sandbox");

// ── Chaque ligne doit être lisible par un humain ──
// Une variable sans conséquence écrite est une ligne qu'on regarde sans savoir quoi en
// faire — donc une ligne qu'on finit par ignorer, y compris le jour où elle est rouge.
for (const e of vide) {
  v(`${e.nom} : rôle et conséquence renseignés`, !!e.role && !!e.consequence);
}

console.log(ko === 0 ? "\nTOUT PASSE" : `\n${ko} ÉCHEC(S)`);
process.exit(ko ? 1 : 0);
