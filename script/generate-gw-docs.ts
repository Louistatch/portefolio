/**
 * Génère les documents des trois travaux de groupe : l'énoncé (PDF) et le modèle de
 * rapport (DOCX) de chacun.
 *
 *   npx tsx script/generate-gw-docs.ts
 *
 * Les fichiers sortent dans client/public/academy/gw/ et sont servis en statique ; ce sont
 * eux que seedGroupForum épingle dans le forum de chaque groupe à sa constitution.
 *
 * ── Pourquoi ce script lit shared/groupwork.ts ──
 *
 * Le contenu des énoncés vit à UN SEUL endroit. Une première version de ces générateurs
 * portait sa propre copie des intitulés et des livrables : deux vérités pour un même
 * énoncé, dont l'une se serait tue le jour où l'autre aurait changé — et c'est l'étudiant
 * qui aurait découvert l'écart, entre le PDF qu'il imprime et la page qu'il lit.
 *
 * Conséquence pratique : pour corriger un énoncé, on édite shared/groupwork.ts, on rejoue
 * ce script, et on met la base à jour (les colonnes title/brief/deliverables de
 * academy_group_works, semées depuis le même fichier).
 *
 * `docx` n'est pas une dépendance du projet — il ne sert qu'ici, et les fichiers produits
 * sont versionnés : `npm install docx --no-save` avant de rejouer.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak,
} from "docx";
import {
  GROUP_WORKS, GROUP_WORK_WINDOW_WEEKS, GROUP_TARGET_SIZE,
  INSTRUCTOR_RUBRIC, PEER_REVIEW_CRITERIA, PEER_REVIEW_MAX_PER_CRITERION,
  type GroupWorkDef,
} from "../shared/groupwork.js";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = path.join(RACINE, "client/public/academy/gw");

const semaines = (n: number) => `${n} semaine${n > 1 ? "s" : ""}`;

// ════════════════════ Énoncé (PDF) ════════════════════

const VERT = rgb(0.05, 0.58, 0.53);
const NOIR = rgb(0.12, 0.15, 0.17);
const GRIS = rgb(0.42, 0.45, 0.5);
const TRAIT = rgb(0.85, 0.87, 0.89);
const A4 = { w: 595.28, h: 841.89 };
const MARGE = 56;
const LARGEUR = A4.w - MARGE * 2;

/** Découpe un texte à la largeur disponible — pdf-lib ne retourne pas à la ligne. */
function lignes(texte: string, police: PDFFont, taille: number, largeur: number): string[] {
  const out: string[] = [];
  let courante = "";
  for (const mot of texte.split(/\s+/)) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (police.widthOfTextAtSize(essai, taille) > largeur && courante) {
      out.push(courante);
      courante = mot;
    } else courante = essai;
  }
  if (courante) out.push(courante);
  return out;
}

async function enonce(gw: GroupWorkDef, polices: { regular: Buffer; bold: Buffer }) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(polices.regular, { subset: true });
  const bold = await doc.embedFont(polices.bold, { subset: true });

  let page: PDFPage = doc.addPage([A4.w, A4.h]);
  let y = A4.h - MARGE;
  const place = (h: number) => { if (y - h < MARGE + 30) { page = doc.addPage([A4.w, A4.h]); y = A4.h - MARGE; } };

  const ecrire = (texte: string, o: { taille?: number; gras?: boolean; couleur?: any; indent?: number; apres?: number } = {}) => {
    const { taille = 10.5, gras = false, couleur = NOIR, indent = 0, apres = 4 } = o;
    const police = gras ? bold : regular;
    for (const l of lignes(texte, police, taille, LARGEUR - indent)) {
      place(taille + 4);
      page.drawText(l, { x: MARGE + indent, y: y - taille, size: taille, font: police, color: couleur });
      y -= taille + 4;
    }
    y -= apres;
  };

  const puce = (texte: string) => {
    place(16);
    page.drawCircle({ x: MARGE + 3, y: y - 6, size: 1.8, color: VERT });
    ecrire(texte, { indent: 14, apres: 2 });
  };

  const section = (t: string) => {
    place(34);
    y -= 12;
    page.drawText(t.toUpperCase(), { x: MARGE, y: y - 10, size: 10, font: bold, color: VERT });
    y -= 18;
    page.drawLine({ start: { x: MARGE, y }, end: { x: MARGE + LARGEUR, y }, thickness: 0.7, color: TRAIT });
    y -= 12;
  };

  page.drawRectangle({ x: 0, y: A4.h - 8, width: A4.w, height: 8, color: VERT });
  ecrire("DATAMEAL ACADEMY", { taille: 9, gras: true, couleur: VERT, apres: 8 });
  ecrire(`Travail de groupe ${gw.index}`, { taille: 22, gras: true, apres: 2 });
  ecrire(gw.title.replace(/^GW\d+\s*—\s*/, ""), { taille: 13, couleur: GRIS, apres: 8 });
  // La provenance du sujet est dite d'emblée : ce travail évalue le cours qui vient de
  // s'achever, et rien d'autre. L'étudiant sait donc où retourner chercher.
  ecrire(`Aboutissement du cours ${gw.cours}`, { taille: 9.5, gras: true, couleur: VERT, apres: 4 });
  ecrire(
    `Semaine ${gw.weekIndex} du parcours · fenêtre de remise : ${semaines(GROUP_WORK_WINDOW_WEEKS)} · ` +
    `noté sur ${gw.maxScore} points · groupe de ${GROUP_TARGET_SIZE}`,
    { taille: 9, couleur: GRIS, apres: 6 });

  section("La commande");
  ecrire(gw.brief, { apres: 6 });

  section("Ce que votre groupe doit rendre");
  gw.deliverables.forEach(puce);

  section("Comment s'y prendre");
  for (const c of gw.conseils) ecrire(c, { apres: 6 });

  section("Modalités de rendu");
  [
    "Un seul membre dépose le rendu, pour tout le groupe, depuis « Travaux de groupe » dans son espace étudiant.",
    "Le rapport se rédige dans le modèle DOCX fourni avec cet énoncé, puis s'exporte en PDF. Il doit porter les noms et adresses de tous les membres, et indiquer pour chacun s'il a contribué.",
    "Les fichiers annexes (tableurs, cartes, code, exports) partent dans une archive ZIP, séparée du rapport.",
    `La fenêtre de remise dure ${semaines(GROUP_WORK_WINDOW_WEEKS)}. Votre groupe, lui, est constitué depuis le début du parcours : l'énoncé et le modèle vous attendent dans votre forum bien avant l'ouverture du dépôt.`,
  ].forEach(puce);

  // Le barème d'un seul tenant : coupé en deux pages, il se lit deux fois et se comprend mal.
  place(34 + INSTRUCTOR_RUBRIC.length * 22 + 34);
  section("Grille de notation");
  for (const c of INSTRUCTOR_RUBRIC) {
    place(18);
    const pts = `${c.points} pts`;
    page.drawText(c.libelle, { x: MARGE, y: y - 10, size: 10.5, font: regular, color: NOIR });
    page.drawText(pts, { x: MARGE + LARGEUR - bold.widthOfTextAtSize(pts, 10.5), y: y - 10, size: 10.5, font: bold, color: VERT });
    y -= 16;
    page.drawLine({ start: { x: MARGE, y: y - 1 }, end: { x: MARGE + LARGEUR, y: y - 1 }, thickness: 0.4, color: TRAIT });
    y -= 6;
  }
  y -= 2;
  const total = INSTRUCTOR_RUBRIC.reduce((n, c) => n + c.points, 0);
  page.drawText("Total", { x: MARGE, y: y - 10, size: 10.5, font: bold, color: NOIR });
  page.drawText(`${total} pts`, { x: MARGE + LARGEUR - bold.widthOfTextAtSize(`${total} pts`, 10.5), y: y - 10, size: 10.5, font: bold, color: NOIR });
  y -= 24;

  place(34 + 60 + PEER_REVIEW_CRITERIA.length * 16);
  section("Évaluation par les pairs");
  ecrire(
    `Après le dépôt, chaque membre note les autres membres de son groupe sur ${PEER_REVIEW_CRITERIA.length} critères, ` +
    `de 0 à ${PEER_REVIEW_MAX_PER_CRITERION} points. Ces notes ne modifient pas celle du projet : elles documentent les ` +
    "contributions, et c'est sur elles que le formateur s'appuie si une contribution est contestée. Les notes reçues " +
    "sont anonymes entre étudiants.", { apres: 8 });
  for (const c of PEER_REVIEW_CRITERIA) {
    place(16);
    page.drawText(`0 – ${PEER_REVIEW_MAX_PER_CRITERION}`, { x: MARGE, y: y - 10, size: 9, font: bold, color: GRIS });
    ecrire(c.libelle, { indent: 40, taille: 10, apres: 2 });
  }

  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(
    `DataMEAL Academy · Travail de groupe ${gw.index} · page ${i + 1}/${pages.length}`,
    { x: MARGE, y: MARGE - 22, size: 8, font: regular, color: GRIS }));

  return doc.save();
}

// ════════════════════ Modèle de rapport (DOCX) ════════════════════

const VERT_HEX = "0D9488";
const GRIS_HEX = "6B7280";
const LARGEUR_DXA = 9360; // A4 moins des marges d'un pouce, en DXA (1440 = 1 pouce)

const par = (texte: string, o: any = {}) => new Paragraph({
  spacing: { after: o.after ?? 120 },
  children: [new TextRun({
    text: texte, size: o.size ?? 22, bold: o.bold,
    italics: o.italique, color: o.couleur, font: "Calibri",
  })],
});

const titre = (texte: string, niveau: (typeof HeadingLevel)[keyof typeof HeadingLevel]) => new Paragraph({
  heading: niveau,
  spacing: { before: 280, after: 140 },
  children: [new TextRun({ text: texte, bold: true, color: VERT_HEX, font: "Calibri" })],
});

/** Consigne en gris italique : elle guide la rédaction et se supprime au fur et à mesure. */
const consigne = (t: string) => par(t, { italique: true, couleur: GRIS_HEX, size: 19, after: 80 });

/** Zone à remplir : le trait du bas donne la ligne d'écriture sans imposer de tableau. */
const aRemplir = (n = 3) => Array.from({ length: n }, () => new Paragraph({
  spacing: { after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB", space: 6 } },
  children: [new TextRun({ text: "", size: 22 })],
}));

const cellule = (texte: string, o: { largeur: number; bold?: boolean; fond?: string }) => new TableCell({
  width: { size: o.largeur, type: WidthType.DXA },
  shading: o.fond ? { type: ShadingType.CLEAR, fill: o.fond, color: "auto" } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children: [par(texte, { bold: o.bold, size: 20, after: 0 })],
});

/**
 * Identification du groupe et de ses membres.
 * La colonne « a contribué » est celle qui compte : c'est la déclaration que le groupe
 * assume collectivement, et le premier élément regardé en cas de litige.
 */
function tableauMembres() {
  const cols = [2600, 3800, 1500, 1460];
  const entetes = ["Nom complet", "Adresse email", "A contribué", "Rôle tenu"];
  return new Table({
    columnWidths: cols,
    width: { size: LARGEUR_DXA, type: WidthType.DXA },
    rows: [
      new TableRow({ children: entetes.map((t, i) => cellule(t, { largeur: cols[i], bold: true, fond: "F0FDFA" })) }),
      ...Array.from({ length: GROUP_TARGET_SIZE }, (_, i) => new TableRow({
        children: [
          cellule(`Membre ${i + 1} :`, { largeur: cols[0] }),
          cellule("", { largeur: cols[1] }),
          cellule("Oui / Non", { largeur: cols[2] }),
          cellule("", { largeur: cols[3] }),
        ],
      })),
    ],
  });
}

function modele(gw: GroupWorkDef) {
  const enfants: (Paragraph | Table)[] = [
    par("DATAMEAL ACADEMY", { bold: true, size: 18, couleur: VERT_HEX, after: 40 }),
    new Paragraph({
      spacing: { after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: VERT_HEX, space: 4 } },
      children: [new TextRun({ text: "" })],
    }),
    par(`Travail de groupe ${gw.index} — modèle de rapport`, { bold: true, size: 32, after: 60 }),
    par(gw.title.replace(/^GW\d+\s*—\s*/, ""), { size: 24, couleur: GRIS_HEX, after: 40 }),
    par(`Aboutissement du cours ${gw.cours}`, { size: 19, bold: true, couleur: VERT_HEX, after: 200 }),

    consigne(
      "Ce document est le rendu du groupe. Remplissez-le à plusieurs, exportez-le en PDF, puis déposez-le " +
      `depuis votre espace « Travaux de groupe » — la fenêtre de remise dure ${semaines(GROUP_WORK_WINDOW_WEEKS)}. ` +
      "Un seul membre dépose, pour tout le groupe. Supprimez les consignes en gris au fur et à mesure."),

    titre("Identification du groupe", HeadingLevel.HEADING_1),
    par("Groupe : ______________________     Cohorte : ______________     Date de remise : ______________", { after: 160 }),
    tableauMembres(),
    consigne(
      "Les noms et adresses de TOUS les membres doivent figurer ci-dessus, et la colonne « a contribué » " +
      "doit refléter la réalité. C'est cette déclaration qui fait foi si une contribution est contestée."),

    titre("La commande", HeadingLevel.HEADING_1),
    par(gw.brief, { after: 140 }),
    consigne("Livrables attendus : " + gw.deliverables.join(" · ")),

    titre("Partie commune", HeadingLevel.HEADING_1),
  ];

  for (const s of gw.plan) {
    enfants.push(titre(s.titre, HeadingLevel.HEADING_2));
    enfants.push(consigne(s.consigne));
    enfants.push(...aRemplir(4));
  }

  // Les parties nominatives : une par membre, et c'est le cœur du modèle.
  enfants.push(new Paragraph({ children: [new PageBreak()] }));
  enfants.push(titre("Contributions individuelles", HeadingLevel.HEADING_1));
  enfants.push(consigne(
    "Chaque membre rédige SA section, en son nom. Une section vide vaut absence de contribution et sera " +
    "lue comme telle, par le groupe comme par le formateur."));

  for (let i = 1; i <= GROUP_TARGET_SIZE; i++) {
    enfants.push(titre(`Membre ${i} — nom : _________________________`, HeadingLevel.HEADING_2));
    enfants.push(consigne(
      "Ce que j'ai produit, comment je m'y suis pris, et ce que j'ai appris. Dix lignes suffisent si elles sont précises."));
    enfants.push(...aRemplir(6));
  }

  enfants.push(titre("Répartition du travail", HeadingLevel.HEADING_1));
  enfants.push(consigne(
    "Qui a fait quoi, et quand. Cette section se remplit en fin de projet mais se tient à jour depuis le " +
    "début — reconstituer trois semaines de travail la veille du rendu ne produit jamais rien de juste."));
  enfants.push(...aRemplir(4));

  enfants.push(titre("Déclaration d'intégrité", HeadingLevel.HEADING_1));
  enfants.push(par(
    "Nous déclarons que ce rapport est le produit du travail de notre groupe, que les sources utilisées sont " +
    "citées, et que les contributions déclarées ci-dessus sont exactes.", { after: 160 }));
  enfants.push(par("Signatures :  " + Array.from({ length: GROUP_TARGET_SIZE }, () => "____________________").join("     "), { after: 0 }));

  return new Document({
    creator: "DataMEAL Academy",
    title: `Travail de groupe ${gw.index} — modèle de rapport`,
    description: gw.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      children: enfants,
    }],
  });
}

// ════════════════════ Exécution ════════════════════

const polices = {
  regular: fs.readFileSync(path.join(RACINE, "api/fonts/sans-400.ttf")),
  bold: fs.readFileSync(path.join(RACINE, "api/fonts/sans-700.ttf")),
};

fs.mkdirSync(SORTIE, { recursive: true });
for (const gw of GROUP_WORKS) {
  const pdf = await enonce(gw, polices);
  const cheminPdf = path.join(SORTIE, path.basename(gw.briefUrl));
  fs.writeFileSync(cheminPdf, pdf);
  console.log(`✓ ${path.relative(RACINE, cheminPdf)} (${Math.round(pdf.length / 1024)} Ko)`);

  const docx = await Packer.toBuffer(modele(gw));
  const cheminDocx = path.join(SORTIE, path.basename(gw.templateUrl));
  fs.writeFileSync(cheminDocx, docx);
  console.log(`✓ ${path.relative(RACINE, cheminDocx)} (${Math.round(docx.length / 1024)} Ko)`);
}
