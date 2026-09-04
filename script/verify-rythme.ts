/**
 * Le calendrier tient-il ?
 *
 *   npm run verify:rythme
 *
 * Rejoue le scénario qui a révélé la faille : une étudiante qui enchaîne, sans jamais
 * s'arrêter, tout ce que le site lui ouvre. Elle a validé les 20 leçons du cursus MEAL —
 * douze semaines de planning, jusqu'au 30 octobre — entre le 23 et le 26 août. Cinq jours.
 *
 * La simulation n'imite pas la règle, elle appelle celle de shared/rythme.ts, la même que
 * l'API. Un test qui recopierait la règle passerait au vert en même temps qu'elle se
 * retromperait.
 *
 * Ce qui est mesuré : le nombre de jours qu'il faut, au minimum, pour terminer un parcours
 * en travaillant sans relâche. C'est le plancher — personne ne peut aller plus vite.
 */

import { PROGRAMS, type Program } from "../shared/programs.js";
import { leconOuverte, AVANCE_MAX_MS, SEMAINE_MS, type EtatLecon } from "../shared/rythme.js";
import { LECONS_FCA_01 } from "../shared/fca-01.js";
import { LECONS_FCQ_01 } from "../shared/fcq-01.js";
import { LECONS_COOP_01 } from "../shared/coop-01.js";
import { LECONS_COOP_02 } from "../shared/coop-02.js";

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Le cursus MEAL tel qu'il est en base aujourd'hui : trois cours, 7 + 7 + 6 leçons. */
const MEAL_REEL = [7, 7, 6];

/**
 * Le découpage réel de chaque parcours en cours, et le nombre de leçons de chacun.
 *
 * Il était auparavant remplacé par un forfait de douze leçons pour tout parcours autre que
 * MEAL. Le contrôle passait donc au vert sans rien savoir des cours réellement publiés :
 * le parcours « coop » compte treize leçons pour une fenêtre de treize semaines, et le
 * forfait de douze le déclarait confortable alors qu'il est exactement à la limite. Les
 * cours écrits en TypeScript se comptent tout seuls ; le jour où l'un d'eux gagne une
 * leçon, ce script le dira.
 *
 * TOF n'a pas de source TypeScript — son contenu ne vit qu'en base — et garde donc le
 * forfait, signalé comme tel dans l'affichage pour qu'on ne le prenne pas pour une mesure.
 */
const DECOUPAGE: Record<string, number[]> = {
  meal: MEAL_REEL,
  fca: [LECONS_FCA_01.length],
  fcq: [LECONS_FCQ_01.length],
  coop: [LECONS_COOP_01.length, LECONS_COOP_02.length],
};
const FORFAIT = [12];

type Lecon = { cours: number; rang: number; ouvertureAt: number; statut: EtatLecon };

/**
 * Construit le planning exactement comme generateLessonSchedule : les cours d'un parcours
 * s'enchaînent, chacun démarre sur une semaine propre, `perWeek` leçons par semaine.
 */
function planifier(admisAt: number, tailles: number[], perWeek: number): Lecon[] {
  const lecons: Lecon[] = [];
  let semaineLibre = 1;
  tailles.forEach((n, cours) => {
    for (let i = 0; i < n; i++) {
      const semaine = semaineLibre + Math.floor(i / perWeek);
      lecons.push({
        cours, rang: i + 1,
        ouvertureAt: admisAt + (semaine - 1) * SEMAINE_MS,
        statut: semaine === 1 ? "available" : "locked",
      });
    }
    semaineLibre += Math.ceil(n / perWeek);
  });
  return lecons;
}

/**
 * Fait avancer une étudiante qui valide tout ce qu'elle peut, jour après jour, et renvoie
 * le jour où la dernière leçon tombe. `plafondJours` borne la simulation pour qu'un
 * parcours devenu infranchissable se signale au lieu de tourner sans fin.
 */
function joursPourTerminer(tailles: number[], perWeek: number, plafondJours = 400) {
  const admisAt = Date.UTC(2026, 7, 21, 18, 50);
  const lecons = planifier(admisAt, tailles, perWeek);

  for (let jour = 0; jour <= plafondJours; jour++) {
    const maintenant = admisAt + jour * JOUR_MS;

    // Au sein d'une même journée, valider une leçon peut en ouvrir une autre : on tourne
    // jusqu'à ce que la journée ne produise plus rien. C'est ce que fait l'étudiante
    // pressée, et c'est ce que faisait Eméraude.
    for (;;) {
      let valideeCeTour = false;
      for (const l of lecons) {
        if (l.statut === "completed") continue;
        const memeCours = lecons.filter(x => x.cours === l.cours);
        const terminees = memeCours.filter(x => x.statut === "completed");
        const precedent = l.cours === 0 ? null
          : lecons.filter(x => x.cours === l.cours - 1).every(x => x.statut === "completed");

        const ouverte = leconOuverte({
          maintenant,
          ouvertureAt: l.ouvertureAt,
          statut: l.statut,
          rang: l.rang,
          termineesDuCours: terminees.length,
          rangMaxTermine: terminees.reduce((m, x) => Math.max(m, x.rang), 0),
          coursPrecedentTermine: precedent,
        });
        if (!ouverte) continue;
        l.statut = "completed";
        valideeCeTour = true;
      }
      if (!valideeCeTour) break;
    }

    if (lecons.every(l => l.statut === "completed")) return jour;
  }
  return Infinity;
}

let ko = 0;
const v = (nom: string, cond: boolean, detail = "") => {
  if (!cond) ko++;
  console.log((cond ? "  ok  " : "  KO  ") + nom + (cond ? "" : "  → " + detail));
};

console.log(`Avance permise : ${(AVANCE_MAX_MS / SEMAINE_MS).toFixed(0)} semaine(s).\n`);

// ── Le cas réel ──────────────────────────────────────────────────────────────
{
  const jours = joursPourTerminer(MEAL_REEL, 2);
  const semaines = jours / 7;
  console.log(`Cursus MEAL (${MEAL_REEL.join(" + ")} leçons, 2 par semaine) : ${jours} jours au plus vite `
    + `(${semaines.toFixed(1)} semaines).`);

  // Avant correction : 0 jour. Le plancher doit maintenant approcher les 10 semaines de
  // planning, moins la semaine d'avance permise.
  v("le cursus MEAL ne peut plus être terminé en moins de 8 semaines", jours >= 8 * 7, `${jours} jours`);
  v("le cursus MEAL reste terminable dans la fenêtre d'admission de 3 mois", jours <= 13 * 7, `${jours} jours`);
}

// ── Chaque parcours publié ───────────────────────────────────────────────────
// Un parcours dont le plancher dépasse la fenêtre d'admission est impossible à terminer :
// l'étudiant paierait de sa poche une échéance que le calendrier lui interdit d'atteindre.
console.log();
for (const p of PROGRAMS as Program[]) {
  const tailles = DECOUPAGE[p.id] ?? FORFAIT;
  const mesure = p.id in DECOUPAGE;
  const total = tailles.reduce((a, b) => a + b, 0);
  const jours = joursPourTerminer(tailles, p.lessonsPerWeek);
  const fenetre = 13 * 7;
  console.log(`  ${p.id.padEnd(5)} ${String(total).padStart(2)} leçons (${tailles.join(" + ")}), `
    + `${p.lessonsPerWeek}/semaine → ${String(jours).padStart(3)} jours`
    + (mesure ? "" : "   ⚠ forfait, contenu hors TypeScript"));
  v(`${p.id} : tient dans la fenêtre d'admission`, jours <= fenetre, `${jours} jours > ${fenetre}`);

  // Le plancher ci-dessus mesure un sprint : combien de jours il faut à qui valide tout ce
  // qu'on lui ouvre, avance d'une semaine comprise. Ce n'est PAS la contrainte qui décide
  // qu'une leçon est atteignable — c'est sa date d'ouverture. Une leçon qui s'ouvre en
  // semaine 14 reste fermée jusqu'au bout pour un étudiant admis pour treize semaines,
  // quelle que soit sa vitesse. Les deux mesures sont donc gardées séparées : coop tient en
  // 77 jours de sprint mais occupe exactement les treize semaines de calendrier, et c'est
  // cette seconde ligne qu'une sixième leçon de COOP-02 ferait passer au rouge.
  const semaines = tailles.reduce((a, n) => a + Math.ceil(n / p.lessonsPerWeek), 0);
  v(`${p.id} : la dernière leçon s'ouvre dans la fenêtre`, semaines <= 13,
    `dernière ouverture en semaine ${semaines}, fenêtre de 13`);
  console.log(`        calendrier : ${semaines} semaine(s) sur 13`);
}

// ── Les propriétés que la borne ne doit pas casser ───────────────────────────
console.log();
{
  // Personne n'est jamais coincé : la règle 1 ouvre toujours à la date, quoi qu'il arrive.
  const t = Date.UTC(2026, 7, 21);
  v("une leçon s'ouvre à sa date même sans rien avoir terminé avant",
    leconOuverte({ maintenant: t, ouvertureAt: t, statut: "locked", rang: 5,
                   termineesDuCours: 0, rangMaxTermine: 0, coursPrecedentTermine: false }));

  // Une leçon ouverte ne se referme pas.
  v("une leçon déjà ouverte le reste après resserrement du rythme",
    leconOuverte({ maintenant: t, ouvertureAt: t + 10 * SEMAINE_MS, statut: "available", rang: 9,
                   termineesDuCours: 0, rangMaxTermine: 0, coursPrecedentTermine: null }));
  v("une leçon en retard reste validable",
    leconOuverte({ maintenant: t, ouvertureAt: t + 10 * SEMAINE_MS, statut: "missed", rang: 9,
                   termineesDuCours: 0, rangMaxTermine: 0, coursPrecedentTermine: null }));

  // Et la borne mord bien : la leçon d'après-demain s'ouvre, celle du trimestre prochain non.
  v("la leçon de la semaine suivante s'ouvre quand on a fini la précédente",
    leconOuverte({ maintenant: t, ouvertureAt: t + SEMAINE_MS, statut: "locked", rang: 3,
                   termineesDuCours: 2, rangMaxTermine: 2, coursPrecedentTermine: null }));
  v("la leçon de la semaine 10 ne s'ouvre pas parce qu'on a fini la semaine 1",
    !leconOuverte({ maintenant: t, ouvertureAt: t + 9 * SEMAINE_MS, statut: "locked", rang: 3,
                    termineesDuCours: 2, rangMaxTermine: 2, coursPrecedentTermine: null }));
}

// ── Le certificat final reste-t-il atteignable ? ─────────────────────────────
//
// Le certificat exige désormais les cours ET la correction des travaux de groupe. Pour qui
// termine ses leçons avant la correction du GW3 — c'est-à-dire à peu près tout le monde, les
// leçons finissant en semaine 9 et le GW3 s'ouvrant en semaine 12 — la dernière condition
// tombe au moment de la correction, pas à la fin d'un cours. Si l'appel disparaît de
// applyGroupWorkGrade, plus personne n'est jamais certifié, et rien ne le signale : pas
// d'erreur, pas de log, juste un certificat qui n'arrive plus.
//
// Ce contrôle lit le source. Il ne prouve pas que l'appel fonctionne — il prouve qu'il est
// encore là, ce qui est exactement le mode de panne redouté.
console.log();
{
  const { readFileSync } = await import("node:fs");
  const api = readFileSync("api/index.ts", "utf-8");

  const corps = (nom: string) => {
    const debut = api.indexOf(`async function ${nom}(`);
    if (debut < 0) return null;
    const suivante = api.indexOf("\nasync function ", debut + 1);
    return api.slice(debut, suivante < 0 ? api.length : suivante);
  };

  for (const nom of ["applyGroupWorkGrade", "recalcCourseProgress"]) {
    const c = corps(nom);
    v(`${nom} peut délivrer le certificat final`,
      !!c && c.includes("delivrerCertificatFinalSiComplet"),
      c ? "l'appel a disparu" : "fonction introuvable — le contrôle est à réécrire");
  }

  const c = corps("delivrerCertificatFinalSiComplet");
  v("la délivrance regarde bien les travaux de groupe",
    !!c && c.includes("refreshGroupWorkStates"),
    c ? "plus aucune lecture des travaux de groupe" : "fonction introuvable");
  v("la délivrance reste idempotente",
    !!c && c.includes("final_certificate_no"),
    c ? "plus de garde contre une seconde délivrance" : "fonction introuvable");
}

// ── Le planning ne montre-t-il que les parcours admis ? ──────────────────────
//
// Générer le planning par parcours ne suffit pas : encore faut-il le lire de même. Des
// lignes TOF-FIN-01 héritées d'avant la séparation traînaient chez dix-sept étudiants admis
// au seul cursus MEAL — affichées dans leur planning, proposées en fin de leçon, et
// validables par URL puisque le verrou de planning voyait une ligne ouverte.
//
// Trois points doivent porter le filtre : les deux lectures, et surtout l'écriture. Si
// seule la lecture filtre, le cours devient invisible mais reste validable — la pire des
// deux situations, parce que plus rien ne la montre.
console.log();
{
  const { readFileSync } = await import("node:fs");
  const api = readFileSync("api/index.ts", "utf-8");

  const routeApres = (chemin: string) => {
    const debut = api.indexOf(`"${chemin}"`);
    if (debut < 0) return null;
    const suivante = api.indexOf("\napp.", debut);
    return api.slice(debut, suivante < 0 ? api.length : suivante);
  };

  for (const [chemin, attendu, quoi] of [
    ["/api/academy/lesson-schedule", "filtrerAuxParcoursAdmis", "filtre le planning"],
    ["/api/academy/my-enrollments", "filtrerAuxParcoursAdmis", "filtre la liste des cours"],
    ["/api/academy/complete-lesson", "parcoursAdmis", "refuse un parcours non admis"],
  ] as const) {
    const c = routeApres(chemin);
    v(`${chemin} ${quoi}`, !!c && c.includes(attendu),
      c ? `« ${attendu} » a disparu de cette route` : "route introuvable — le contrôle est à réécrire");
  }
}

console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUT PASSE");
process.exit(ko ? 1 : 0);
