// ══════════════ Support : ce que la plateforme sait déjà répondre ══════════════
//
// Les questions des étudiants ne sont presque jamais ouvertes. Sur les treize personnes
// arrêtées quelque part dans le parcours au 2 septembre 2026 — sept qui n'ont jamais validé
// leur adresse, six vérifiées mais non admises — aucune n'a besoin qu'on lui rédige une
// réponse : elle a besoin qu'on lui dise CE QUI la bloque, et QUAND ça se débloque.
//
// Or la plateforme le sait déjà, exactement, sans deviner : c'est dans rythme.ts, dans
// programs.ts et dans les colonnes de `students`. Un modèle de langage devinerait avec des
// mots plausibles ce que le code calcule avec certitude — et se tromperait un jour sur une
// date, ce qui est pire que de ne pas répondre.
//
// Ce fichier tient donc les deux règles que le support ne peut pas se permettre de rater :
//
//   1. diagnostiquer() — à partir de l'état réel du dossier, ce qui bloque et pourquoi.
//   2. intentionDe()   — de quoi parle une question écrite à la main, en français.
//
// Elles sont ici plutôt que dans une route parce qu'une règle qu'on ne peut interroger
// qu'avec une base et un serveur est une règle qu'on n'interroge jamais. Même raison que
// rythme.ts, notifications.ts et projection.ts. script/verify-support.ts les met en défaut.

import { SEMAINE_MS } from "./rythme.js";

// ── Les constats ────────────────────────────────────────────────────────────

export type CodeConstat =
  | "adresse_non_verifiee"
  | "admission_a_passer"
  | "test_en_attente_de_delai"
  | "admission_expiree"
  | "lecon_pas_encore_ouverte"
  | "lecon_precedente_inachevee"
  | "aucun_groupe"
  | "travaux_a_rendre"
  | "certificat_bloque_par_travaux"
  | "rien_ne_bloque";

/**
 * Ce que l'étudiant peut faire depuis la réponse.
 *
 * `agir` déclenche une route existante (niveau 3 du repli) ; `aller` n'est qu'un lien. La
 * distinction compte : une action modifie le dossier et doit repasser par les contrôles
 * d'autorisation du serveur, un lien non.
 */
export type ActionProposee =
  | { genre: "agir"; id: "renvoyer_verification"; libelle: string }
  | { genre: "aller"; libelle: string; vers: string };

export type Constat = {
  code: CodeConstat;
  /** Petit = bloque plus tôt dans le parcours, donc à traiter d'abord. */
  rang: number;
  /**
   * Est-ce que ça EMPÊCHE d'avancer, ou est-ce seulement bon à savoir ?
   *
   * La distinction existe pour une raison : « il vous reste deux travaux à rendre » est vrai
   * de presque tout le monde en cours de parcours et n'est pas un problème. Le confondre avec
   * un blocage ferait dire au support « voici ce qui vous bloque » à quelqu'un que rien ne
   * bloque — et lui ferait chercher une panne qui n'existe pas.
   */
  bloquant: boolean;
  titre: string;
  /** La phrase montrée à l'étudiant, écrite avec SES dates et SES chiffres. */
  explication: string;
  action?: ActionProposee;
  /** Article du centre d'aide qui développe, s'il y en a un. */
  article?: string;
};

/**
 * L'état du dossier au moment de la question, pour UN parcours.
 *
 * Tout est déjà lu ailleurs par l'API — rien ici n'exige de requête nouvelle. Le type est
 * volontairement plat : c'est ce qui permet de rejouer n'importe quelle situation dans le
 * contrôle sans monter une base.
 */
export type ContexteSupport = {
  maintenant: number;
  /** Nom du parcours, écrit tel quel dans les phrases. */
  parcours: string;
  /** Leçons ouvertes par semaine dans ce parcours (programs.ts). */
  leconsParSemaine: number;

  emailVerifie: boolean;
  /** Admission à CE parcours. null = pas encore admis. */
  admisAt: number | null;
  /** Fin de la fenêtre de trois mois. */
  admissionExpireAt: number | null;
  /** Instant avant lequel le test ne peut pas être repassé. null = repassable. */
  prochainTestAt: number | null;
  tentatives: number;

  /** La première leçon non terminée du parcours. null si tout est terminé. */
  prochaineLecon: {
    titre: string;
    /** Date d'ouverture prévue par le calendrier. */
    ouvertureAt: number;
    /** Résultat de leconOuverte() — la même règle que l'écran. */
    ouverte: boolean;
    /** La leçon qui précède est-elle terminée ? */
    precedenteTerminee: boolean;
  } | null;

  aUnGroupe: boolean;
  /** Travaux de groupe du parcours restant à rendre. */
  travauxRestants: number;
  /** Toutes les leçons du parcours sont-elles terminées ? */
  leconsToutesTerminees: boolean;
  certificatDelivre: boolean;
};

// ── Écrire une date en français ─────────────────────────────────────────────
// En UTC délibérément : le serveur y est, le Togo aussi (UTC+0), et un contrôle qui dépend
// du fuseau de la machine qui l'exécute ne prouve rien.

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function laDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** « dans 3 jours », « demain », « aujourd'hui » — plus lisible qu'une date pour un délai court. */
export function leDelai(deMs: number, aMs: number): string {
  const jours = Math.ceil((aMs - deMs) / (24 * 60 * 60 * 1000));
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "demain";
  if (jours < 14) return `dans ${jours} jours`;
  return `le ${laDate(aMs)}`;
}

// ── 1. Le diagnostic ────────────────────────────────────────────────────────

/**
 * Ce qui bloque l'étudiant, du plus en amont au plus en aval.
 *
 * L'ordre n'est pas cosmétique : quelqu'un dont l'adresse n'est pas vérifiée est aussi,
 * mécaniquement, quelqu'un qui n'a pas passé le test et n'a aucune leçon ouverte. Lui parler
 * de sa leçon serait exact et parfaitement inutile. On remonte donc toujours à la cause la
 * plus haute, et c'est elle qu'on lui montre en premier.
 *
 * Renvoie toujours au moins un constat — « rien ne bloque » est une réponse.
 */
export function diagnostiquer(c: ContexteSupport): Constat[] {
  const constats: Constat[] = [];

  // 1. L'adresse. Sans elle, rien d'autre ne peut avancer.
  if (!c.emailVerifie) {
    constats.push({
      code: "adresse_non_verifiee",
      bloquant: true,
      rang: 1,
      titre: "Votre adresse électronique n'est pas encore validée",
      explication:
        "Le lien de validation vous a été envoyé à l'inscription. Tant qu'il n'a pas été " +
        "ouvert, l'accès au test d'admission reste fermé. Le lien arrive parfois dans les " +
        "courriers indésirables ; vous pouvez aussi en demander un nouveau.",
      action: { genre: "agir", id: "renvoyer_verification", libelle: "Recevoir un nouveau lien" },
      article: "valider-mon-adresse",
    });
  }

  // 2. L'admission au parcours.
  if (c.emailVerifie && c.admisAt == null) {
    if (c.prochainTestAt != null && c.prochainTestAt > c.maintenant) {
      constats.push({
        code: "test_en_attente_de_delai",
        bloquant: true,
        rang: 2,
        titre: "Le test d'admission se rouvre " + leDelai(c.maintenant, c.prochainTestAt),
        explication:
          `Vous avez déjà tenté le test ${c.tentatives} fois. Un délai sépare deux tentatives : ` +
          `il sert à laisser le temps de revoir le contenu, pas à écarter. La prochaine ` +
          `tentative est possible à partir du ${laDate(c.prochainTestAt)}.`,
        action: { genre: "aller", libelle: "Revoir le programme", vers: "/elearning" },
        article: "repasser-le-test-dadmission",
      });
    } else {
      constats.push({
        code: "admission_a_passer",
        bloquant: true,
        rang: 2,
        titre: `Vous n'êtes pas encore admis au ${c.parcours}`,
        explication:
          "Le test d'admission est ouvert : c'est lui qui donne accès aux leçons et au " +
          "calendrier. Il peut être repassé en cas d'échec, après un délai.",
        action: { genre: "aller", libelle: "Passer le test d'admission", vers: "/academy/dashboard" },
        article: "passer-le-test-dadmission",
      });
    }
  }

  // 3. La fenêtre de trois mois.
  if (c.admisAt != null && c.admissionExpireAt != null && c.admissionExpireAt <= c.maintenant) {
    constats.push({
      code: "admission_expiree",
      bloquant: true,
      rang: 3,
      titre: "Votre fenêtre d'admission est arrivée à son terme",
      explication:
        `L'admission au ${c.parcours} ouvre l'accès pendant trois mois, jusqu'au ` +
        `${laDate(c.admissionExpireAt)}. Ce terme est dépassé. Une prolongation se demande ` +
        `à l'équipe, qui regarde où vous en étiez.`,
      article: "ma-fenetre-dadmission-est-terminee",
    });
  }

  // 4. Le rythme. La question la plus fréquente, et celle où une réponse approximative fait
  //    le plus de dégâts : l'étudiant veut une DATE, pas une explication du principe.
  const l = c.prochaineLecon;
  if (c.admisAt != null && l != null && !l.ouverte) {
    if (!l.precedenteTerminee) {
      constats.push({
        code: "lecon_precedente_inachevee",
        bloquant: false,
        rang: 4,
        titre: `« ${l.titre} » attend que la leçon précédente soit terminée`,
        explication:
          `Les leçons d'un cours s'enchaînent dans l'ordre. Celle-ci s'ouvrira de toute façon ` +
          `à sa date, le ${laDate(l.ouvertureAt)} — mais vous pouvez y arriver plus tôt en ` +
          `terminant la précédente.`,
        action: { genre: "aller", libelle: "Reprendre où j'en étais", vers: "/academy/dashboard" },
        article: "pourquoi-ma-lecon-est-verrouillee",
      });
    } else {
      const ouvertureAvance = l.ouvertureAt - SEMAINE_MS;
      constats.push({
        code: "lecon_pas_encore_ouverte",
        bloquant: false,
        rang: 4,
        titre: `« ${l.titre} » s'ouvre le ${laDate(l.ouvertureAt)}`,
        explication:
          `Le ${c.parcours} ouvre ${c.leconsParSemaine} leçon${c.leconsParSemaine > 1 ? "s" : ""} ` +
          `par semaine, pour tenir dans la fenêtre de trois mois. Vous pouvez prendre une ` +
          `semaine d'avance, pas davantage : cette leçon devient donc accessible dès le ` +
          `${laDate(ouvertureAvance)} si vous avez terminé tout ce qui précède.`,
        article: "pourquoi-ma-lecon-est-verrouillee",
      });
    }
  }

  // 5. Les travaux de groupe.
  if (c.admisAt != null && !c.aUnGroupe && c.travauxRestants > 0) {
    constats.push({
      code: "aucun_groupe",
      bloquant: false,
      rang: 5,
      titre: "Vous n'êtes pas encore rattaché à un groupe",
      explication:
        "Les travaux de groupe demandent une équipe, constituée par l'équipe pédagogique au " +
        "fur et à mesure des admissions. Tant que le rattachement n'est pas fait, le dépôt " +
        "reste fermé — ce n'est pas un refus, seulement une attente.",
      article: "travaux-de-groupe-comment-ca-marche",
    });
  }

  // 5 bis. Le groupe existe et il reste des travaux : ce n'est pas un blocage, c'est l'état
  // normal d'un parcours en cours. On le tient quand même, parce que « où en sont mes travaux
  // de groupe ? » est une vraie question, à laquelle on saura répondre sans rien chercher.
  if (c.admisAt != null && c.aUnGroupe && c.travauxRestants > 0 && !c.leconsToutesTerminees) {
    constats.push({
      code: "travaux_a_rendre",
      bloquant: false,
      rang: 5,
      titre: `Il vous reste ${c.travauxRestants} travail${c.travauxRestants > 1 ? "x" : ""} de groupe à rendre`,
      explication:
        "Votre groupe est constitué et le dépôt est ouvert. Les travaux de groupe comptent " +
        "pour le certificat au même titre que les leçons : les leçons seules ne suffisent pas.",
      action: { genre: "aller", libelle: "Voir mes travaux de groupe", vers: "/academy/group-work" },
      article: "travaux-de-groupe-comment-ca-marche",
    });
  }

  // 6. Le certificat. Le piège connu : toutes les leçons faites ne suffisent pas.
  if (c.leconsToutesTerminees && !c.certificatDelivre && c.travauxRestants > 0) {
    constats.push({
      code: "certificat_bloque_par_travaux",
      bloquant: true,
      rang: 6,
      titre: "Il reste des travaux de groupe à valider avant le certificat",
      explication:
        `Toutes vos leçons sont terminées — c'est fait. Le certificat du ${c.parcours} exige ` +
        `en plus que les travaux de groupe soient rendus et notés : il en reste ` +
        `${c.travauxRestants}. Le certificat part automatiquement dès le dernier validé.`,
      action: { genre: "aller", libelle: "Voir mes travaux de groupe", vers: "/academy/group-work" },
      article: "ou-est-mon-certificat",
    });
  }

  // « Rien ne bloque » se juge sur les constats BLOQUANTS, pas sur leur nombre total : un
  // étudiant qui a deux travaux à rendre et une leçon qui s'ouvre lundi n'a aucun problème.
  if (!constats.some((x) => x.bloquant)) {
    constats.push({
      code: "rien_ne_bloque",
      bloquant: false,
      rang: 99,
      titre: "Rien ne bloque votre parcours",
      explication:
        c.prochaineLecon
          ? `Votre prochaine leçon, « ${c.prochaineLecon.titre} », est accessible.`
          : "Vous avez terminé toutes les leçons de votre parcours.",
    });
  }

  return constats.sort((a, b) => a.rang - b.rang);
}

// ── 2. De quoi parle la question ? ──────────────────────────────────────────

export type Intention =
  | "verification" | "admission" | "rythme" | "groupe"
  | "seance" | "certificat" | "compte";

/** Sans accents, sans majuscules, sans ponctuation — pour comparer ce qui est comparable. */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // les accents, isolés par la décomposition NFD
    .toLowerCase();
}

export function mots(texte: string): string[] {
  return normaliser(texte).split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Les mots qui désignent chaque sujet.
 *
 * Écrits d'après ce que les gens tapent réellement — « bloquee », « cadenas », « zoom »
 * pour la salle Jitsi — et non d'après le vocabulaire du code.
 */
const VOCABULAIRE: Record<Intention, string[]> = {
  verification: ["verifier", "verification", "valider", "validation", "confirmer", "activer", "lien", "spam", "indesirable"],
  admission:    ["admission", "admis", "test", "quiz", "questionnaire", "examen", "score", "reussir", "echouer", "rate", "recommencer", "repasser", "tentative"],
  rythme:       ["verrouille", "bloque", "cadenas", "ferme", "ouvrir", "ouverture", "disponible", "quand", "planning", "calendrier", "semaine", "rythme", "avance", "prochaine"],
  groupe:       ["groupe", "equipe", "binome", "collectif", "depot", "deposer", "rendre", "coequipier"],
  seance:       ["seance", "rencontre", "direct", "live", "zoom", "jitsi", "visio", "camera", "micro", "rejoindre", "salle", "moderateur"],
  certificat:   ["certificat", "attestation", "diplome", "titre", "certifie", "telecharger"],
  compte:       ["motdepasse", "passe", "connexion", "connecter", "identifiant", "profil", "compte", "oublie"],
};

/**
 * Un mot du vocabulaire est-il présent ?
 *
 * Comparaison par MOT ENTIER, avec une tolérance de deux caractères en fin pour les pluriels
 * et les accords — « verrouillee », « certificats », « seances ».
 *
 * La comparaison par sous-chaîne serait plus simple et fausse : « attestation » contient
 * « test », et « où est mon attestation ? » serait classé en question d'admission. Le
 * contrôle rejoue précisément ce cas.
 */
function present(motsDeLaQuestion: string[], cle: string): boolean {
  return motsDeLaQuestion.some(
    (m) => m === cle || (m.startsWith(cle) && m.length - cle.length <= 2),
  );
}

/**
 * Le sujet d'une question, ou null si rien ne ressort.
 *
 * L'ordre de PRIORITE départage les égalités : « je n'arrive pas à valider mon adresse pour
 * le test » touche deux sujets, et c'est la validation qu'il faut traiter — c'est elle qui
 * bloque l'autre. Même logique que l'ordre des constats.
 */
const PRIORITE: Intention[] = ["verification", "admission", "rythme", "groupe", "certificat", "seance", "compte"];

export function intentionDe(question: string): Intention | null {
  const m = mots(question);
  if (m.length === 0) return null;

  let meilleure: Intention | null = null;
  let meilleurScore = 0;

  for (const intention of PRIORITE) {
    const score = VOCABULAIRE[intention].filter((cle) => present(m, cle)).length;
    if (score > meilleurScore) {
      meilleurScore = score;
      meilleure = intention;
    }
  }
  return meilleure;
}

// ── 3. Quel niveau répond ? ─────────────────────────────────────────────────

/** Les constats que chaque sujet peut expliquer. */
const CONSTATS_DU_SUJET: Record<Intention, CodeConstat[]> = {
  verification: ["adresse_non_verifiee"],
  admission:    ["admission_a_passer", "test_en_attente_de_delai", "admission_expiree"],
  rythme:       ["lecon_pas_encore_ouverte", "lecon_precedente_inachevee"],
  groupe:       ["aucun_groupe", "travaux_a_rendre"],
  certificat:   ["certificat_bloque_par_travaux"],
  seance:       [],
  compte:       [],
};

/** Mots trop courants pour aider une recherche. */
const MOTS_VIDES = new Set([
  "je", "j", "me", "ma", "mon", "mes", "le", "la", "les", "un", "une", "des", "de", "du",
  "a", "au", "aux", "et", "ou", "est", "ce", "que", "qui", "quoi", "pas", "ne", "n", "pour",
  "sur", "dans", "en", "il", "elle", "on", "y", "se", "sais", "arrive", "comment", "pourquoi",
  "bonjour", "merci", "svp", "s", "il", "vous", "nous", "avec", "plus", "faire", "peux", "puis",
]);

export type Reponse =
  /** La plateforme connaît la réponse exacte, calculée sur le dossier. */
  | { niveau: 1; constat: Constat }
  /** Personne ne sait sans chercher : on passe la main à la base de connaissances. */
  | { niveau: 2; termes: string };

/**
 * Ce qu'on répond à une question, une fois le diagnostic fait.
 *
 * Le niveau 1 n'est retenu que si le sujet de la question correspond RÉELLEMENT à un constat
 * en cours. Répondre « votre leçon s'ouvre le 9 septembre » à quelqu'un qui demande comment
 * changer son mot de passe serait exact, hors sujet, et donnerait l'impression d'un automate
 * qui n'écoute pas — c'est précisément ce qui fait abandonner un support.
 *
 * Sans correspondance, on descend au niveau 2 avec les mots utiles de la question.
 */
export function repondre(question: string, constats: Constat[]): Reponse {
  const intention = intentionDe(question);

  if (intention) {
    const codes = CONSTATS_DU_SUJET[intention];
    const trouve = constats.find((c) => codes.includes(c.code));
    if (trouve) return { niveau: 1, constat: trouve };
  }

  const termes = mots(question).filter((m) => m.length > 2 && !MOTS_VIDES.has(m));
  return { niveau: 2, termes: termes.join(" ") };
}
