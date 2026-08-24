/**
 * Génère les modèles de rapport des travaux de groupe (DOCX).
 *
 * Un modèle par GW, déposé dans client/public/academy/gw/ et servi tel quel par Vercel.
 * Le fichier est épinglé dans le forum de chaque groupe à sa constitution (voir
 * seedGroupForum dans api/index.ts) : c'est ce document, rempli à trois puis exporté en
 * PDF, qui constitue le rendu.
 *
 * Le point de conception : chaque membre a une SECTION NOMINATIVE. Un modèle sans place
 * réservée produit invariablement un rapport écrit par une seule personne la veille de
 * l'échéance — et l'évaluation par les pairs n'a alors plus rien à mesurer.
 *
 *   node script/generate-gw-templates.cjs
 *
 * Le paquet `docx` n'est pas une dépendance du projet : il n'est utile qu'ici, et les
 * fichiers produits sont versionnés. Installez-le à la demande :
 *   npm install docx --no-save
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak,
} = require("docx");

const SORTIE = path.resolve(__dirname, "../client/public/academy/gw");

// Largeur utile d'une page A4 avec marges de 1 pouce, en DXA (1440 = 1 pouce).
const LARGEUR = 9360;
const VERT = "0D9488";
const GRIS = "6B7280";

const GW = [
  {
    n: 1,
    titre: "Concevoir une collecte de données en équipe",
    commande:
      "Une ONG vous commande l'évaluation d'un projet de maraîchage : mesurer son effet sur " +
      "les revenus de 200 ménages. Votre groupe cadre la collecte, construit le questionnaire " +
      "dans KoboToolbox et défend ses choix d'échantillonnage.",
    sections: [
      { t: "1. Cadrage de l'évaluation", i: "Question d'évaluation, indicateurs retenus, unité d'observation. Dites ce que vous cherchez à établir, et ce que vous renoncez à mesurer." },
      { t: "2. Le questionnaire", i: "Structure du formulaire, types de questions, contraintes et sauts. Joignez le lien de partage KoboToolbox ou le XLSForm dans l'archive." },
      { t: "3. Plan d'échantillonnage", i: "Taille, méthode de tirage, base de sondage. Justifiez : un échantillon non justifié est un échantillon non défendable." },
      { t: "4. Limites", i: "Ce que votre dispositif ne permettra pas de conclure, et pourquoi." },
    ],
  },
  {
    n: 2,
    titre: "Cartographier et interpréter les résultats",
    commande:
      "À partir des données du GW1 (ou du jeu fourni en cours), produisez la lecture spatiale " +
      "des résultats : où le projet a porté, où il n'a pas porté, et ce que la carte ne dit pas. " +
      "On attend une analyse, pas une illustration.",
    sections: [
      { t: "1. Données et traitements", i: "Sources, projection, jointures, nettoyages effectués. Quelqu'un doit pouvoir refaire vos cartes à partir de cette section." },
      { t: "2. Choix cartographiques", i: "Variable représentée, discrétisation, palette, échelle. Justifiez la discrétisation : elle change ce que la carte raconte." },
      { t: "3. Lecture de la carte", i: "Ce que montre la carte. Nommez les zones, chiffrez, ne paraphrasez pas la légende." },
      { t: "4. Ce que la carte ne montre pas", i: "Effets d'agrégation, zones sans données, corrélations qui ne sont pas des causes." },
    ],
  },
  {
    n: 3,
    titre: "Tableau de bord et rapport automatisé",
    commande:
      "Dernier travail collectif : industrialiser la chaîne. Le groupe livre un tableau de bord " +
      "qui se met à jour depuis la source de données, et le rapport qui en découle. C'est la " +
      "démonstration de bout en bout attendue d'un expert MEAL.",
    sections: [
      { t: "1. Architecture de la chaîne", i: "De la source au tableau de bord : quelles étapes, quels outils, quels formats intermédiaires." },
      { t: "2. Indicateurs suivis", i: "Ce que le tableau de bord affiche, pour qui, et à quelle fréquence l'information est utile." },
      { t: "3. Lecture des résultats", i: "Ce que les données disent à la date du rendu. Cette section doit rester valable après une mise à jour." },
      { t: "4. Ce qui reste manuel", i: "Les étapes non automatisées et ce qu'il faudrait pour les automatiser. L'honnêteté vaut mieux qu'une promesse." },
    ],
  },
];

const p = (texte, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120 },
  alignment: opts.align,
  children: [new TextRun({
    text: texte, size: opts.size ?? 22, bold: opts.bold,
    italics: opts.italique, color: opts.couleur, font: "Calibri",
  })],
});

const titre = (texte, niveau) => new Paragraph({
  heading: niveau,
  spacing: { before: 280, after: 140 },
  children: [new TextRun({ text: texte, bold: true, color: VERT, font: "Calibri" })],
});

/** Consigne en gris italique : elle guide la rédaction et se supprime au fur et à mesure. */
const consigne = t => p(t, { italique: true, couleur: GRIS, size: 19, after: 80 });

/** Zone à remplir. Le trait du bas donne la ligne d'écriture sans imposer de tableau. */
const aRemplir = (lignes = 3) => Array.from({ length: lignes }, () => new Paragraph({
  spacing: { after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB", space: 6 } },
  children: [new TextRun({ text: "", size: 22 })],
}));

const cellule = (texte, opts = {}) => new TableCell({
  width: { size: opts.largeur, type: WidthType.DXA },
  shading: opts.fond ? { type: ShadingType.CLEAR, fill: opts.fond, color: "auto" } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children: [p(texte, { bold: opts.bold, size: 20, after: 0 })],
});

/** Identification du groupe et de ses membres.
 *  La colonne « a contribué » est celle qui compte : c'est la déclaration que le groupe
 *  assume collectivement, et le premier élément que le formateur regarde en cas de litige. */
function tableauMembres() {
  const cols = [2600, 3800, 1500, 1460];
  const entete = new TableRow({
    children: [
      cellule("Nom complet", { largeur: cols[0], bold: true, fond: "F0FDFA" }),
      cellule("Adresse email", { largeur: cols[1], bold: true, fond: "F0FDFA" }),
      cellule("A contribué", { largeur: cols[2], bold: true, fond: "F0FDFA" }),
      cellule("Rôle tenu", { largeur: cols[3], bold: true, fond: "F0FDFA" }),
    ],
  });
  const vides = [1, 2, 3].map(i => new TableRow({
    children: [
      cellule(`Membre ${i} :`, { largeur: cols[0] }),
      cellule("", { largeur: cols[1] }),
      cellule("Oui / Non", { largeur: cols[2] }),
      cellule("", { largeur: cols[3] }),
    ],
  }));
  return new Table({ columnWidths: cols, width: { size: LARGEUR, type: WidthType.DXA }, rows: [entete, ...vides] });
}

function document(gw) {
  const enfants = [
    p("DATAMEAL ACADEMY", { bold: true, size: 18, couleur: VERT, after: 40 }),
    new Paragraph({
      spacing: { after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: VERT, space: 4 } },
      children: [new TextRun({ text: "" })],
    }),
    p(`Travail de groupe ${gw.n} — modèle de rapport`, { bold: true, size: 32, after: 60 }),
    p(gw.titre, { size: 24, couleur: GRIS, after: 240 }),

    consigne(
      "Ce document est le rendu du groupe. Remplissez-le à plusieurs, exportez-le en PDF, " +
      "puis déposez-le depuis votre espace « Travaux de groupe ». Un seul membre dépose, " +
      "pour tout le groupe. Supprimez les consignes en gris au fur et à mesure."),

    titre("Identification du groupe", HeadingLevel.HEADING_1),
    p("Groupe : ______________________     Cohorte : ______________     Date de remise : ______________",
      { after: 160 }),
    tableauMembres(),
    consigne(
      "Les noms et adresses de TOUS les membres doivent figurer ci-dessus, et la colonne " +
      "« a contribué » doit refléter la réalité. C'est cette déclaration qui fait foi si une " +
      "contribution est contestée."),

    titre("La commande", HeadingLevel.HEADING_1),
    p(gw.commande, { after: 200 }),
  ];

  // Les parties communes : rédigées ensemble, elles portent le raisonnement du groupe.
  enfants.push(titre("Partie commune", HeadingLevel.HEADING_1));
  for (const s of gw.sections) {
    enfants.push(titre(s.t, HeadingLevel.HEADING_2));
    enfants.push(consigne(s.i));
    enfants.push(...aRemplir(4));
  }

  // Les parties nominatives : une par membre, et c'est le cœur du modèle.
  enfants.push(new Paragraph({ children: [new PageBreak()] }));
  enfants.push(titre("Contributions individuelles", HeadingLevel.HEADING_1));
  enfants.push(consigne(
    "Chaque membre rédige SA section, en son nom. Une section vide vaut absence de " +
    "contribution et sera lue comme telle, par le groupe comme par le formateur."));

  for (const i of [1, 2, 3]) {
    enfants.push(titre(`Membre ${i} — nom : _________________________`, HeadingLevel.HEADING_2));
    enfants.push(consigne(
      "Ce que j'ai produit, comment je m'y suis pris, et ce que j'ai appris. " +
      "Dix lignes suffisent si elles sont précises."));
    enfants.push(...aRemplir(6));
  }

  enfants.push(titre("Répartition du travail", HeadingLevel.HEADING_1));
  enfants.push(consigne(
    "Qui a fait quoi, et quand. Cette section se remplit en fin de projet, mais se tient " +
    "à jour depuis le début — reconstituer trois semaines de travail la veille du rendu ne " +
    "produit jamais rien de juste."));
  enfants.push(...aRemplir(4));

  enfants.push(titre("Déclaration d'intégrité", HeadingLevel.HEADING_1));
  enfants.push(p(
    "Nous déclarons que ce rapport est le produit du travail de notre groupe, que les sources " +
    "utilisées sont citées, et que les contributions déclarées ci-dessus sont exactes.",
    { after: 160 }));
  enfants.push(p("Signatures :  ____________________     ____________________     ____________________",
    { after: 0 }));

  return new Document({
    creator: "DataMEAL Academy",
    title: `Travail de groupe ${gw.n} — modèle de rapport`,
    description: gw.titre,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      children: enfants,
    }],
  });
}

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  for (const gw of GW) {
    const buffer = await Packer.toBuffer(document(gw));
    const chemin = path.join(SORTIE, `GW${gw.n}-modele-rapport.docx`);
    fs.writeFileSync(chemin, buffer);
    console.log(`✓ ${path.relative(process.cwd(), chemin)} (${Math.round(buffer.length / 1024)} Ko)`);
  }
})();
