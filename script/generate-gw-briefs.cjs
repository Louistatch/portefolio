/**
 * Génère les énoncés des travaux de groupe (PDF).
 *
 * Un énoncé par GW, déposé dans client/public/academy/gw/ et épinglé dans le forum de
 * chaque groupe à sa constitution. C'est le document que l'étudiant imprime ou relit hors
 * ligne : il doit tenir seul, sans la plateforme autour.
 *
 *   node script/generate-gw-briefs.cjs
 *
 * pdf-lib et fontkit sont déjà des dépendances du projet (ils servent aux certificats), et
 * les polices embarquées viennent de api/fonts/ — les polices standard de PDF ne couvrent
 * pas proprement les caractères typographiques français.
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const RACINE = path.resolve(__dirname, "..");
const SORTIE = path.join(RACINE, "client/public/academy/gw");

const VERT = rgb(0.05, 0.58, 0.53);
const NOIR = rgb(0.12, 0.15, 0.17);
const GRIS = rgb(0.42, 0.45, 0.5);
const TRAIT = rgb(0.85, 0.87, 0.89);

const A4 = { w: 595.28, h: 841.89 };
const MARGE = 56;
const LARGEUR = A4.w - MARGE * 2;

const GW = [
  {
    n: 1, semaine: 4,
    titre: "Concevoir une collecte de données en équipe",
    commande:
      "Une ONG vous commande l'évaluation d'un projet de maraîchage : mesurer son effet sur les revenus de " +
      "200 ménages répartis dans huit villages. Votre groupe cadre la collecte, construit le questionnaire " +
      "dans KoboToolbox et défend ses choix d'échantillonnage.",
    attendu: [
      "Note de cadrage (2 pages) : question d'évaluation, indicateurs, unité d'observation.",
      "Formulaire KoboToolbox déployé — lien de partage ou XLSForm dans l'archive.",
      "Plan d'échantillonnage justifié : taille, méthode de tirage, base de sondage, limites.",
      "Répartition du travail entre les membres du groupe.",
    ],
    conseils: [
      "Commencez par la question d'évaluation, pas par le questionnaire. Un formulaire écrit avant la question mesure ce qui est facile à mesurer, pas ce qui est utile.",
      "Un échantillon de 200 ménages ne se justifie pas par « c'est ce qu'on nous a demandé » : dites ce qu'il permet de détecter, et ce qu'il ne permet pas.",
      "Testez votre formulaire à trois avant de le déclarer fini. Les contraintes mal écrites ne se voient qu'à la saisie.",
    ],
  },
  {
    n: 2, semaine: 8,
    titre: "Cartographier et interpréter les résultats",
    commande:
      "À partir des données collectées au GW1 — ou du jeu de données fourni en cours — produisez la lecture " +
      "spatiale des résultats : où le projet a porté, où il n'a pas porté, et ce que la carte ne dit pas. " +
      "Le travail attendu est une analyse, pas une illustration.",
    attendu: [
      "Carte thématique exportée (PNG ou PDF) avec légende, échelle et source.",
      "Projet QGIS ou couches utilisées, dans l'archive du rendu.",
      "Note de lecture (2 pages) : ce que montre la carte, ce qu'elle ne montre pas.",
      "Répartition du travail entre les membres du groupe.",
    ],
    conseils: [
      "La discrétisation change ce que la carte raconte. Choisissez-la, puis justifiez-la — quantiles et seuils naturels ne racontent pas la même histoire.",
      "Une carte sans échelle ni source n'est pas un document de travail. Ces mentions ne sont pas décoratives.",
      "Méfiez-vous de l'effet de zone : une moyenne villageoise masque les écarts à l'intérieur du village.",
    ],
  },
  {
    n: 3, semaine: 12,
    titre: "Tableau de bord et rapport automatisé",
    commande:
      "Dernier travail collectif du cursus : industrialiser la chaîne. Le groupe livre un tableau de bord " +
      "qui se met à jour depuis la source de données, et le rapport qui en découle. C'est la démonstration " +
      "de bout en bout attendue d'un expert MEAL.",
    attendu: [
      "Tableau de bord fonctionnel (lien ou fichier) alimenté par la source de données.",
      "Rapport de suivi-évaluation (5 pages) produit à partir du tableau de bord.",
      "Note technique : comment la mise à jour se fait, et ce qui reste manuel.",
      "Répartition du travail entre les membres du groupe.",
    ],
    conseils: [
      "Un tableau de bord qu'il faut réalimenter à la main n'est pas automatisé. Dites-le plutôt que de le laisser croire.",
      "Écrivez le rapport pour quelqu'un qui n'a pas participé au projet : c'est le test qui révèle les raccourcis.",
      "Gardez une trace de vos versions. Un tableau de bord qui casse la veille du rendu arrive à tout le monde.",
    ],
  },
];

const GRILLE = [
  ["Analyse quantitative (questions ouvertes)", 40],
  ["Rigueur méthodologique et justification des choix", 25],
  ["Qualité et complétude des livrables attendus", 20],
  ["Clarté de la restitution écrite", 15],
];

const PAIRS = [
  "Contribue à la planification du projet et apporte une contribution utile à son avancement",
  "Termine son travail et le partage bien avant l'échéance (pas au dernier moment)",
  "Produit des éléments de qualité, réellement utilisés dans le rendu (et non plagiés)",
  "Répond aux demandes de clarification et aux révisions demandées par le groupe",
];

/** Découpe un texte à la largeur disponible. pdf-lib ne sait pas retourner à la ligne. */
function lignes(texte, police, taille, largeur) {
  const mots = texte.split(/\s+/);
  const out = [];
  let courante = "";
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (police.widthOfTextAtSize(essai, taille) > largeur && courante) {
      out.push(courante);
      courante = mot;
    } else courante = essai;
  }
  if (courante) out.push(courante);
  return out;
}

async function construire(gw, polices) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(polices.regular, { subset: true });
  const bold = await doc.embedFont(polices.bold, { subset: true });

  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - MARGE;

  const nouvellePage = () => { page = doc.addPage([A4.w, A4.h]); y = A4.h - MARGE; };
  const place = h => { if (y - h < MARGE + 30) nouvellePage(); };

  const ecrire = (texte, { taille = 10.5, gras = false, couleur = NOIR, indent = 0, apres = 4 } = {}) => {
    const police = gras ? bold : regular;
    for (const l of lignes(texte, police, taille, LARGEUR - indent)) {
      place(taille + 4);
      page.drawText(l, { x: MARGE + indent, y: y - taille, size: taille, font: police, color: couleur });
      y -= taille + 4;
    }
    y -= apres;
  };

  const section = t => {
    place(34);
    y -= 12;
    page.drawText(t.toUpperCase(), { x: MARGE, y: y - 10, size: 10, font: bold, color: VERT });
    y -= 18;
    page.drawLine({ start: { x: MARGE, y }, end: { x: MARGE + LARGEUR, y }, thickness: 0.7, color: TRAIT });
    y -= 12;
  };

  // ── En-tête ──
  page.drawRectangle({ x: 0, y: A4.h - 8, width: A4.w, height: 8, color: VERT });
  ecrire("DATAMEAL ACADEMY", { taille: 9, gras: true, couleur: VERT, apres: 8 });
  ecrire(`Travail de groupe ${gw.n}`, { taille: 22, gras: true, apres: 2 });
  ecrire(gw.titre, { taille: 13, couleur: GRIS, apres: 10 });
  ecrire(
    `Semaine ${gw.semaine} du parcours · fenêtre de rendu : 2 semaines · noté sur 100 points · rendu collectif`,
    { taille: 9, couleur: GRIS, apres: 6 });

  section("La commande");
  ecrire(gw.commande, { apres: 6 });

  section("Ce que votre groupe doit rendre");
  for (const a of gw.attendu) {
    place(16);
    page.drawCircle({ x: MARGE + 3, y: y - 6, size: 1.8, color: VERT });
    ecrire(a, { indent: 14, apres: 2 });
  }

  section("Comment s'y prendre");
  for (const c of gw.conseils) ecrire(c, { indent: 0, apres: 6, couleur: NOIR });

  section("Modalités de rendu");
  const modalites = [
    "Un seul membre dépose le rendu, pour tout le groupe, depuis « Travaux de groupe » dans son espace étudiant.",
    "Le rapport se rédige dans le modèle DOCX fourni avec cet énoncé, puis s'exporte en PDF. Il doit contenir les noms et adresses de tous les membres, et indiquer pour chacun s'il a contribué.",
    "Les fichiers annexes (tableurs, cartes, code, exports) partent dans une archive ZIP, séparée du rapport.",
    "Après l'échéance, le rendu ne peut plus être modifié par aucun membre du groupe.",
  ];
  for (const m of modalites) {
    place(16);
    page.drawCircle({ x: MARGE + 3, y: y - 6, size: 1.8, color: VERT });
    ecrire(m, { indent: 14, apres: 2 });
  }

  // ── Grille de notation ──
  // Un barème coupé en deux pages se lit deux fois et se comprend mal : on réserve la
  // hauteur du bloc entier avant de l'ouvrir, quitte à commencer une nouvelle page.
  place(34 + GRILLE.length * 22 + 34);
  section("Grille de notation");
  for (const [libelle, points] of GRILLE) {
    place(18);
    const texte = `${points} pts`;
    page.drawText(libelle, { x: MARGE, y: y - 10, size: 10.5, font: regular, color: NOIR });
    page.drawText(texte, {
      x: MARGE + LARGEUR - bold.widthOfTextAtSize(texte, 10.5),
      y: y - 10, size: 10.5, font: bold, color: VERT,
    });
    y -= 16;
    page.drawLine({ start: { x: MARGE, y: y - 1 }, end: { x: MARGE + LARGEUR, y: y - 1 }, thickness: 0.4, color: TRAIT });
    y -= 6;
  }
  y -= 2;
  const total = GRILLE.reduce((n, [, p]) => n + p, 0);
  page.drawText("Total", { x: MARGE, y: y - 10, size: 10.5, font: bold, color: NOIR });
  page.drawText(`${total} pts`, {
    x: MARGE + LARGEUR - bold.widthOfTextAtSize(`${total} pts`, 10.5),
    y: y - 10, size: 10.5, font: bold, color: NOIR,
  });
  y -= 24;

  // ── Évaluation par les pairs ──
  place(34 + 60 + PAIRS.length * 16);
  section("Évaluation par les pairs");
  ecrire(
    "Après le dépôt, chaque membre note les autres membres de son groupe sur quatre critères, de 0 à 3 points. " +
    "Ces notes ne modifient pas celle du projet : elles documentent les contributions, et c'est sur elles que " +
    "le formateur s'appuie si une contribution est contestée. Les notes reçues sont anonymes entre étudiants.",
    { apres: 8 });
  for (const c of PAIRS) {
    place(16);
    page.drawText("0 – 3", { x: MARGE, y: y - 10, size: 9, font: bold, color: GRIS });
    ecrire(c, { indent: 40, taille: 10, apres: 2 });
  }

  // ── Pied de page sur chaque page ──
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`DataMEAL Academy · Travail de groupe ${gw.n} · page ${i + 1}/${pages.length}`, {
      x: MARGE, y: MARGE - 22, size: 8, font: regular, color: GRIS,
    });
  });

  return doc.save();
}

(async () => {
  const polices = {
    regular: fs.readFileSync(path.join(RACINE, "api/fonts/sans-400.ttf")),
    bold: fs.readFileSync(path.join(RACINE, "api/fonts/sans-700.ttf")),
  };
  fs.mkdirSync(SORTIE, { recursive: true });
  for (const gw of GW) {
    const octets = await construire(gw, polices);
    const chemin = path.join(SORTIE, `GW${gw.n}-enonce.pdf`);
    fs.writeFileSync(chemin, octets);
    console.log(`✓ ${path.relative(RACINE, chemin)} (${Math.round(octets.length / 1024)} Ko)`);
  }
})();
