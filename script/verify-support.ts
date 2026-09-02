/**
 * Les règles du support.
 *
 *   npm run verify:support
 *
 * Ce que ce contrôle cherche, précisément : les deux façons dont un support automatique
 * devient pire que pas de support du tout.
 *
 *   1. Il annonce une DATE FAUSSE. Un étudiant à qui l'on dit « votre leçon s'ouvre le 12 »
 *      alors qu'elle s'ouvre le 9 perd trois jours et cesse de croire l'écran. La date
 *      annoncée est donc recalculée ici à partir de rythme.ts, jamais recopiée.
 *
 *   2. Il répond À CÔTÉ. Répondre « votre leçon s'ouvre le 9 septembre » à quelqu'un qui
 *      demande comment changer son mot de passe est exact, hors sujet, et suffit à faire
 *      abandonner le support pour toujours.
 *
 * Deux défauts ont déjà été trouvés par ce fichier avant sa première exécution complète :
 * un code de constat déclaré mais jamais produit, et « rien ne bloque » qui comptait les
 * constats au lieu de regarder s'ils bloquaient.
 */

import {
  diagnostiquer, intentionDe, repondre, mots, normaliser, laDate, leDelai,
  type ContexteSupport, type CodeConstat, type Constat,
} from "../shared/support.js";
import { AVANCE_MAX_MS, leconOuverte } from "../shared/rythme.js";

let ko = 0;
const v = (nom: string, cond: boolean, detail = "") => {
  if (!cond) ko++;
  console.log((cond ? "  ok  " : "  KO  ") + nom + (cond ? "" : "  → " + detail));
};

const JOUR = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 8, 2, 12, 0, 0);   // 2 septembre 2026, midi

/** Un dossier sain : admis, à jour, rien qui coince. On en dérive chaque cas. */
const SAIN: ContexteSupport = {
  maintenant: T0,
  parcours: "cursus MEAL",
  leconsParSemaine: 2,
  emailVerifie: true,
  admisAt: T0 - 30 * JOUR,
  admissionExpireAt: T0 + 60 * JOUR,
  prochainTestAt: null,
  tentatives: 1,
  prochaineLecon: { titre: "Cadre logique", ouvertureAt: T0 - JOUR, ouverte: true, precedenteTerminee: true },
  aUnGroupe: true,
  travauxRestants: 0,
  leconsToutesTerminees: false,
  certificatDelivre: false,
};
const cas = (p: Partial<ContexteSupport>): ContexteSupport => ({ ...SAIN, ...p });
const codes = (c: ContexteSupport) => diagnostiquer(c).map((x) => x.code);
const premier = (c: ContexteSupport) => diagnostiquer(c)[0];

// ── 1. L'ordre : toujours la cause la plus haute ────────────────────────────
console.log("La cause la plus haute passe devant\n");
{
  // Quelqu'un qui n'a pas validé son adresse n'a, mécaniquement, ni admission ni leçon.
  // Lui parler de sa leçon serait exact et inutile.
  const bloque = cas({
    emailVerifie: false, admisAt: null, prochainTestAt: null,
    prochaineLecon: { titre: "Cadre logique", ouvertureAt: T0 + 10 * JOUR, ouverte: false, precedenteTerminee: true },
  });
  v("adresse non validée avant tout le reste", premier(bloque).code === "adresse_non_verifiee", codes(bloque).join(", "));

  const pasAdmis = cas({ admisAt: null, admissionExpireAt: null });
  v("l'admission passe avant le rythme", premier(pasAdmis).code === "admission_a_passer", codes(pasAdmis).join(", "));

  v("un dossier sain ne signale rien de bloquant",
    diagnostiquer(SAIN).every((c) => !c.bloquant), codes(SAIN).join(", "));
}

// ── 2. Les dates annoncées ──────────────────────────────────────────────────
// Recalculées depuis rythme.ts. Si AVANCE_MAX_MS change un jour, ce contrôle doit tomber.
console.log("\nLes dates annoncées sont celles que le calendrier applique\n");
{
  const ouverture = Date.UTC(2026, 8, 16, 0, 0, 0);   // 16 septembre 2026
  const c = cas({
    prochaineLecon: { titre: "Théorie du changement", ouvertureAt: ouverture, ouverte: false, precedenteTerminee: true },
  });
  const constat = diagnostiquer(c).find((x) => x.code === "lecon_pas_encore_ouverte")!;

  v("la date d'ouverture est annoncée", !!constat && constat.titre.includes(laDate(ouverture)),
    constat?.titre ?? "constat absent");

  const avanceAttendue = laDate(ouverture - AVANCE_MAX_MS);
  v("la date d'accès anticipé vient de AVANCE_MAX_MS, pas d'une constante recopiée",
    constat.explication.includes(avanceAttendue), `attendu « ${avanceAttendue} » dans : ${constat.explication}`);

  // Et la promesse doit être vraie : à cette date-là, rythme.ts ouvre effectivement la leçon.
  const ouvreBien = leconOuverte({
    maintenant: ouverture - AVANCE_MAX_MS, ouvertureAt: ouverture, statut: "locked",
    rang: 3, termineesDuCours: 2, rangMaxTermine: 2, coursPrecedentTermine: null,
  });
  v("à la date annoncée, rythme.ts ouvre réellement la leçon", ouvreBien === true);

  // Un jour plus tôt, non — sinon la date annoncée serait trop tardive.
  const pasEncore = leconOuverte({
    maintenant: ouverture - AVANCE_MAX_MS - 1, ouvertureAt: ouverture, statut: "locked",
    rang: 3, termineesDuCours: 2, rangMaxTermine: 2, coursPrecedentTermine: null,
  });
  v("une milliseconde plus tôt, elle ne l'ouvre pas", pasEncore === false);

  v("le nombre de leçons par semaine annoncé est celui du parcours",
    constat.explication.includes("2 leçons par semaine"), constat.explication);
}

console.log("\nLes délais s'écrivent en français lisible\n");
{
  v("aujourd'hui",      leDelai(T0, T0) === "aujourd'hui", leDelai(T0, T0));
  v("demain",           leDelai(T0, T0 + JOUR) === "demain", leDelai(T0, T0 + JOUR));
  v("dans 3 jours",     leDelai(T0, T0 + 3 * JOUR) === "dans 3 jours", leDelai(T0, T0 + 3 * JOUR));
  v("au-delà de 15 jours, une date",
    leDelai(T0, T0 + 30 * JOUR) === `le ${laDate(T0 + 30 * JOUR)}`, leDelai(T0, T0 + 30 * JOUR));
  v("une date passée ne dit jamais « dans -2 jours »",
    leDelai(T0, T0 - 2 * JOUR) === "aujourd'hui", leDelai(T0, T0 - 2 * JOUR));
}

// ── 3. Le sujet de la question ──────────────────────────────────────────────
console.log("\nDe quoi parle la question\n");
{
  const attendu: [string, string | null][] = [
    ["Pourquoi ma leçon est verrouillée ?",                    "rythme"],
    ["ma leçon est bloquée, il y a un cadenas",                "rythme"],
    ["quand est-ce que la prochaine leçon s'ouvre",            "rythme"],
    ["je n'ai pas reçu le lien de validation",                 "verification"],
    ["comment activer mon compte, rien dans mes spams",        "verification"],
    ["je veux repasser le test d'admission",                   "admission"],
    ["j'ai raté le questionnaire, une autre tentative ?",      "admission"],
    ["où est mon certificat",                                  "certificat"],
    ["je n'arrive pas à rejoindre la séance en direct",        "seance"],
    ["la caméra ne marche pas dans la salle zoom",             "seance"],
    ["je n'ai pas de groupe pour le dépôt",                    "groupe"],
    ["j'ai oublié mon mot de passe",                           "compte"],
    ["bonjour",                                                 null],
  ];
  for (const [q, sujet] of attendu) {
    const lu = intentionDe(q);
    v(`« ${q} » → ${sujet ?? "aucun sujet"}`, lu === sujet, `obtenu : ${lu}`);
  }
}

console.log("\nLes pièges du français\n");
{
  // LE piège : « attestation » CONTIENT « test ». Une comparaison par sous-chaîne classerait
  // cette question en admission et répondrait à côté.
  //
  // La question doit ne contenir AUCUN autre indice, sinon elle ne prouve rien : avec
  // « où puis-je télécharger mon attestation ? », le mot « télécharger » fait gagner le
  // sujet « certificat » même avec une comparaison par sous-chaîne, et le contrôle passe
  // sans rien avoir vérifié. Vu en essayant précisément ce sabotage.
  const piege = "où est mon attestation ?";
  v("« attestation » ne déclenche pas le sujet du test",
    intentionDe(piege) === "certificat", `obtenu : ${intentionDe(piege)}`);

  v("les accents ne changent rien",
    intentionDe("ma leçon est verrouillée") === intentionDe("ma lecon est verrouillee"));
  v("les majuscules non plus",
    intentionDe("MA LEÇON EST VERROUILLÉE") === "rythme");
  v("le pluriel non plus",
    intentionDe("mes leçons sont verrouillées") === "rythme");

  // Deux sujets dans la même phrase : c'est celui qui bloque l'autre qui gagne.
  v("« valider mon adresse pour passer le test » → validation, pas admission",
    intentionDe("je n'arrive pas à valider mon adresse pour passer le test") === "verification",
    `obtenu : ${intentionDe("je n'arrive pas à valider mon adresse pour passer le test")}`);

  v("une chaîne vide ne déclenche rien", intentionDe("") === null);
  v("la ponctuation seule ne déclenche rien", intentionDe("??? !!!") === null);
  v("normaliser retire bien les accents", normaliser("Éméraude à Lomé") === "emeraude a lome",
    normaliser("Éméraude à Lomé"));
  v("mots() découpe sans laisser de vide", mots("bonjour,   ça va ?").join("|") === "bonjour|ca|va",
    mots("bonjour,   ça va ?").join("|"));
}

// ── 4. Ne jamais répondre à côté ────────────────────────────────────────────
console.log("\nUne réponse hors sujet vaut moins que pas de réponse\n");
{
  const bloque = cas({
    prochaineLecon: { titre: "Cadre logique", ouvertureAt: T0 + 10 * JOUR, ouverte: false, precedenteTerminee: true },
  });
  const constats = diagnostiquer(bloque);

  const surLeSujet = repondre("pourquoi ma leçon est verrouillée ?", constats);
  v("question sur le rythme → le constat sur le rythme",
    surLeSujet.niveau === 1 && surLeSujet.constat.code === "lecon_pas_encore_ouverte",
    JSON.stringify(surLeSujet));

  const horsSujet = repondre("j'ai oublié mon mot de passe", constats);
  v("question sur le mot de passe → PAS le constat sur la leçon",
    horsSujet.niveau === 2, JSON.stringify(horsSujet));
  v("les mots vides sont retirés des termes de recherche",
    horsSujet.niveau === 2 && horsSujet.termes === "oublie mot passe",
    horsSujet.niveau === 2 ? `« ${horsSujet.termes} »` : "");

  // Un sujet reconnu mais sans constat correspondant descend aussi au niveau 2 : mieux vaut
  // chercher que d'affirmer.
  const sansConstat = repondre("je n'arrive pas à rejoindre la séance", constats);
  v("un sujet sans constat correspondant descend au niveau 2", sansConstat.niveau === 2,
    JSON.stringify(sansConstat));
}

// ── 5. Chaque code de constat est réellement produit ────────────────────────
// C'est ce contrôle qui a trouvé « travaux_a_rendre », déclaré dans le type et jamais poussé
// par diagnostiquer(). Le Record ci-dessous est exhaustif au sens de TypeScript : ajouter un
// code au type sans l'ajouter ici ne compile plus.
console.log("\nAucun code de constat n'est décoratif\n");
{
  const scenarios: Record<CodeConstat, ContexteSupport> = {
    adresse_non_verifiee: cas({ emailVerifie: false, admisAt: null }),
    admission_a_passer:   cas({ admisAt: null, admissionExpireAt: null }),
    test_en_attente_de_delai: cas({ admisAt: null, admissionExpireAt: null, prochainTestAt: T0 + 3 * JOUR, tentatives: 2 }),
    admission_expiree:    cas({ admissionExpireAt: T0 - JOUR }),
    lecon_pas_encore_ouverte: cas({
      prochaineLecon: { titre: "L", ouvertureAt: T0 + 10 * JOUR, ouverte: false, precedenteTerminee: true } }),
    lecon_precedente_inachevee: cas({
      prochaineLecon: { titre: "L", ouvertureAt: T0 + 10 * JOUR, ouverte: false, precedenteTerminee: false } }),
    aucun_groupe:         cas({ aUnGroupe: false, travauxRestants: 2 }),
    travaux_a_rendre:     cas({ aUnGroupe: true, travauxRestants: 2 }),
    certificat_bloque_par_travaux: cas({ leconsToutesTerminees: true, travauxRestants: 1, prochaineLecon: null }),
    rien_ne_bloque:       SAIN,
  };
  for (const [code, ctx] of Object.entries(scenarios) as [CodeConstat, ContexteSupport][]) {
    v(`« ${code} » est atteignable`, codes(ctx).includes(code), codes(ctx).join(", "));
  }
}

// ── 6. Bloquant ou simple information ───────────────────────────────────────
console.log("\nCe qui bloque et ce qui informe ne se confondent pas\n");
{
  const enCours = cas({ aUnGroupe: true, travauxRestants: 2 });
  const cs = diagnostiquer(enCours);
  v("des travaux à rendre ne sont pas un blocage",
    cs.find((c) => c.code === "travaux_a_rendre")?.bloquant === false);
  v("et « rien ne bloque » est donc quand même dit",
    cs.some((c) => c.code === "rien_ne_bloque"), codes(enCours).join(", "));

  const vraimentBloque = cas({ emailVerifie: false, admisAt: null });
  v("mais jamais quand quelque chose bloque vraiment",
    !codes(vraimentBloque).includes("rien_ne_bloque"), codes(vraimentBloque).join(", "));
}

// ── 7. Cohérence avec l'écran ───────────────────────────────────────────────
// Le support ne doit jamais dire « verrouillée » d'une leçon que l'écran montre ouverte.
console.log("\nLe support dit la même chose que l'écran\n");
{
  const ouverte = cas({
    prochaineLecon: { titre: "L", ouvertureAt: T0 + 2 * JOUR, ouverte: true, precedenteTerminee: true },
  });
  const dits = codes(ouverte);
  v("une leçon ouverte n'est jamais annoncée comme fermée",
    !dits.includes("lecon_pas_encore_ouverte") && !dits.includes("lecon_precedente_inachevee"),
    dits.join(", "));
}

console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUT PASSE");
process.exit(ko ? 1 : 0);
