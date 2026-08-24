/**
 * Génère le livret de révision du test d'admission, en PDF.
 *
 *   npx tsx script/generate-livret-revision.ts
 *
 * Sort dans client/public/academy/livret-revision.pdf, servi en statique, et proposé au
 * téléchargement depuis la section « Ressources » de la page de présentation.
 *
 * Le contenu vit dans shared/revision.ts — même raison que pour les énoncés des travaux de
 * groupe : la page du site affiche le sommaire et les points clés, le PDF les imprime. Deux
 * copies auraient fini par diverger, et c'est le candidat qui aurait découvert l'écart.
 *
 * ── Pagination ──
 *
 * Un chapitre par page, forcé. Ce n'est pas une coquetterie de mise en page : un livret de
 * révision se consulte par sauts, et un chapitre coupé au milieu oblige à tourner en arrière
 * pour retrouver son début. La contrepartie est qu'un chapitre trop long déborde — pdf-lib
 * n'avertit de rien et dessine dans le vide sous la marge. Le script mesure donc chaque page
 * et ÉCHOUE si le contenu dépasse, plutôt que de livrer un PDF au texte tronqué.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  CHAPITRES, ENTRAINEMENT, QUESTIONS_COUVERTES, PLAN_REVISION,
  LIVRET_TITRE, LIVRET_SOUS_TITRE, LIVRET_AUTEUR, LIVRET_FONCTION,
} from "../shared/revision.js";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = path.join(RACINE, "client/public/academy/livret-revision.pdf");
const POLICES = path.join(RACINE, "api/fonts");

const VERT = rgb(0.05, 0.58, 0.53);
const VERT_SOMBRE = rgb(0.03, 0.28, 0.22);
const NOIR = rgb(0.12, 0.15, 0.17);
const GRIS = rgb(0.42, 0.45, 0.5);
const TRAIT = rgb(0.85, 0.87, 0.89);
const BLANC = rgb(1, 1, 1);

const A4 = { w: 595.28, h: 841.89 };
const MARGE = 54;
const LARGEUR = A4.w - MARGE * 2;
/** Sous cette ordonnée, on empiète sur le pied de page. */
const PLANCHER = 62;

const SEUIL_ADMISSION = 21;
const NB_QUESTIONS = 30;

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

async function livret() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fs.readFileSync(path.join(POLICES, "sans-400.ttf")), { subset: true });
  const bold = await doc.embedFont(fs.readFileSync(path.join(POLICES, "sans-700.ttf")), { subset: true });

  let page: PDFPage = doc.addPage([A4.w, A4.h]);
  let y = A4.h - MARGE;
  /** Ordonnée la plus basse atteinte sur chaque page — sert au contrôle de débordement. */
  const bas: number[] = [];

  function nouvellePage() {
    bas.push(y);
    page = doc.addPage([A4.w, A4.h]);
    y = A4.h - MARGE;
  }

  const ecrire = (texte: string, o: {
    taille?: number; gras?: boolean; couleur?: any; indent?: number; apres?: number; interligne?: number;
  } = {}) => {
    const { taille = 10, gras = false, couleur = NOIR, indent = 0, apres = 4, interligne = 4.5 } = o;
    const police = gras ? bold : regular;
    for (const l of lignes(texte, police, taille, LARGEUR - indent)) {
      page.drawText(l, { x: MARGE + indent, y: y - taille, size: taille, font: police, color: couleur });
      y -= taille + interligne;
    }
    y -= apres;
  };

  const filet = () => {
    page.drawLine({ start: { x: MARGE, y }, end: { x: MARGE + LARGEUR, y }, thickness: 0.7, color: TRAIT });
    y -= 12;
  };

  // ── Page 1 : couverture ────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: A4.h - 250, width: A4.w, height: 250, color: VERT_SOMBRE });
  y = A4.h - 76;
  ecrire("LOUISFARM LEARNING", { taille: 10, gras: true, couleur: rgb(0.42, 0.9, 0.68), apres: 16 });
  ecrire(LIVRET_TITRE, { taille: 30, gras: true, couleur: BLANC, apres: 8, interligne: 8 });
  ecrire(LIVRET_SOUS_TITRE, { taille: 12, couleur: rgb(0.78, 0.86, 0.83), apres: 0 });

  y = A4.h - 300;
  ecrire(
    `Ce livret couvre les quatre domaines du test d'admission. Il est optionnel : personne `
    + `ne vérifiera que vous l'avez lu. Il existe parce que beaucoup de candidats échouent `
    + `sur des notions qu'ils connaissent, faute d'avoir revu le vocabulaire avant de `
    + `commencer.`,
    { taille: 11, couleur: NOIR, apres: 14, interligne: 6 });
  ecrire(
    `Vous n'y trouverez aucune des trente questions du test, ni leurs réponses. Ce n'est pas `
    + `un corrigé : c'est ce qu'il faut savoir pour y répondre par vous-même.`,
    { taille: 11, gras: true, couleur: VERT, apres: 24, interligne: 6 });

  filet();
  ecrire("Ce que couvre le livret", { taille: 10, gras: true, couleur: VERT, apres: 10 });
  for (const c of CHAPITRES) {
    const gauche = `${c.numero}.  ${c.titre}`;
    const droite = c.questionsAuTest > 0
      ? `${c.questionsAuTest} question${c.questionsAuTest > 1 ? "s" : ""} au test`
      : "méthode";
    page.drawText(gauche, { x: MARGE, y: y - 10, size: 10.5, font: regular, color: NOIR });
    page.drawText(droite, {
      x: MARGE + LARGEUR - regular.widthOfTextAtSize(droite, 9),
      y: y - 10, size: 9, font: regular, color: GRIS,
    });
    y -= 20;
  }
  y -= 4;
  const dix = `Puis dix questions d'entraînement, différentes de celles du test, avec leur corrigé commenté.`;
  ecrire(dix, { taille: 9.5, couleur: GRIS, apres: 18 });

  filet();
  ecrire("Comment se déroule le test", { taille: 10, gras: true, couleur: VERT, apres: 10 });
  for (const l of [
    `${NB_QUESTIONS} questions à choix multiple, une seule bonne réponse par question.`,
    `${SEUIL_ADMISSION} bonnes réponses suffisent pour être admis, soit 70 %.`,
    `Aucune pénalité pour une mauvaise réponse : ne laissez aucune question vide.`,
    `En cas d'échec, une nouvelle tentative est possible après une semaine.`,
  ]) {
    page.drawCircle({ x: MARGE + 3, y: y - 6, size: 1.8, color: VERT });
    ecrire(l, { taille: 10, indent: 14, apres: 1 });
  }

  y = 118;
  filet();
  ecrire(`Rédigé par ${LIVRET_AUTEUR}`, { taille: 11, gras: true, apres: 2 });
  ecrire(LIVRET_FONCTION, { taille: 9.5, couleur: GRIS, apres: 0 });

  // ── Pages 2 à 7 : un chapitre par page ─────────────────────────────────────
  for (const c of CHAPITRES) {
    nouvellePage();

    page.drawRectangle({ x: 0, y: A4.h - 6, width: A4.w, height: 6, color: VERT });
    page.drawText(String(c.numero), {
      x: MARGE, y: y - 30, size: 40, font: bold, color: rgb(0.88, 0.93, 0.92),
    });
    page.drawText(c.titre, { x: MARGE + 40, y: y - 20, size: 16, font: bold, color: NOIR });
    const sous = c.questionsAuTest > 0
      ? `${c.domaine} · ${c.questionsAuTest} question${c.questionsAuTest > 1 ? "s" : ""} au test`
      : c.domaine;
    page.drawText(sous, { x: MARGE + 40, y: y - 34, size: 9, font: regular, color: GRIS });
    y -= 54;
    filet();

    ecrire(c.objectif, { taille: 10, couleur: GRIS, apres: 12, interligne: 5 });

    for (const n of c.notions) {
      ecrire(n.terme, { taille: 10.5, gras: true, couleur: VERT_SOMBRE, apres: 1 });
      ecrire(n.texte, { taille: 9.5, apres: 8, interligne: 4 });
    }

    // Encadré « à retenir » : la hauteur est calculée avant de dessiner le fond, faute de
    // quoi le cadre et le texte ne coïncident pas.
    const titreRetenir = "À retenir";
    const lignesRetenir = c.aRetenir.map(t => lignes(t, regular, 9.5, LARGEUR - 42));
    const hRetenir = 30 + lignesRetenir.reduce((n, l) => n + l.length * 14, 0);
    y -= 6;
    page.drawRectangle({
      x: MARGE, y: y - hRetenir, width: LARGEUR, height: hRetenir,
      color: rgb(0.93, 0.97, 0.96),
    });
    page.drawRectangle({ x: MARGE, y: y - hRetenir, width: 3, height: hRetenir, color: VERT });
    page.drawText(titreRetenir.toUpperCase(), {
      x: MARGE + 16, y: y - 18, size: 8.5, font: bold, color: VERT,
    });
    let yr = y - 34;
    for (const groupe of lignesRetenir) {
      page.drawCircle({ x: MARGE + 19, y: yr + 3, size: 1.6, color: VERT });
      for (const l of groupe) {
        page.drawText(l, { x: MARGE + 28, y: yr, size: 9.5, font: regular, color: NOIR });
        yr -= 14;
      }
    }
    y -= hRetenir + 12;

    if (c.piege) {
      ecrire("Le piège classique", { taille: 8.5, gras: true, couleur: rgb(0.72, 0.35, 0.05), apres: 3 });
      ecrire(c.piege, { taille: 9.5, couleur: NOIR, apres: 0, interligne: 4 });
    }
  }

  // ── Page 8 : entraînement ──────────────────────────────────────────────────
  nouvellePage();
  page.drawRectangle({ x: 0, y: A4.h - 6, width: A4.w, height: 6, color: VERT });
  ecrire("Dix questions d'entraînement", { taille: 16, gras: true, apres: 2 });
  ecrire(
    "Ces questions ne figurent pas au test. Elles portent sur les mêmes notions. Répondez "
    + "sans regarder le corrigé, page suivante.",
    { taille: 9.5, couleur: GRIS, apres: 10, interligne: 4 });
  filet();

  const LETTRES = ["A", "B", "C", "D"];
  ENTRAINEMENT.forEach((e, i) => {
    ecrire(`${i + 1}.  ${e.q}`, { taille: 9.5, gras: true, apres: 1, interligne: 3 });
    e.options.forEach((o, j) => {
      page.drawText(`${LETTRES[j]}.`, { x: MARGE + 14, y: y - 8.5, size: 9, font: bold, color: GRIS });
      ecrire(o, { taille: 9, indent: 30, apres: 0, interligne: 2.5 });
    });
    y -= 5;
  });

  // ── Pages 9 et 10 : corrigé commenté et mot de la fin ──────────────────────
  nouvellePage();
  page.drawRectangle({ x: 0, y: A4.h - 6, width: A4.w, height: 6, color: VERT });
  ecrire("Corrigé commenté", { taille: 16, gras: true, apres: 2 });
  ecrire(
    "La bonne réponse compte moins que la raison qui la rend bonne : c'est elle qui vous "
    + "servira sur une question que vous n'avez jamais vue.",
    { taille: 9.5, couleur: GRIS, apres: 10, interligne: 4 });
  filet();

  ENTRAINEMENT.forEach((e, i) => {
    // Le corrigé tient sur deux pages : on bascule dès qu'il ne reste plus de quoi loger
    // une entrée entière, plutôt que de couper une explication entre deux feuillets.
    const hauteur = 15 + lignes(e.pourquoi, regular, 9, LARGEUR - 26).length * 12.5 + 10;
    if (y - hauteur < PLANCHER) {
      nouvellePage();
      page.drawRectangle({ x: 0, y: A4.h - 6, width: A4.w, height: 6, color: VERT });
      ecrire("Corrigé commenté (suite)", { taille: 13, gras: true, apres: 8 });
      filet();
    }
    const rep = `${LETTRES[e.bonne]}. ${e.options[e.bonne]}`;
    page.drawText(`${i + 1}.`, { x: MARGE, y: y - 10, size: 9.5, font: bold, color: VERT });
    ecrire(rep, { taille: 9.5, gras: true, indent: 20, apres: 1, interligne: 3 });
    ecrire(e.pourquoi, { taille: 9, indent: 20, apres: 7, interligne: 3.5 });
  });

  // ── Dernière page : plan de révision et mot de la fin ──────────────────────
  nouvellePage();
  page.drawRectangle({ x: 0, y: A4.h - 6, width: A4.w, height: 6, color: VERT });
  ecrire("Votre plan de révision", { taille: 16, gras: true, apres: 2 });
  ecrire(
    "Cinq jours, une heure par jour. Chaque journée demande de faire quelque chose, pas "
    + "seulement de relire : on retient une commande qu'on a tapée, beaucoup moins une "
    + "commande qu'on a lue.",
    { taille: 9.5, couleur: GRIS, apres: 10, interligne: 4 });
  filet();

  for (const j of PLAN_REVISION) {
    page.drawText(j.jour.toUpperCase(), { x: MARGE, y: y - 9, size: 8.5, font: bold, color: VERT });
    page.drawText(j.titre, { x: MARGE + 52, y: y - 9, size: 10.5, font: bold, color: NOIR });
    y -= 16;
    ecrire(j.quoi, { taille: 9.5, indent: 52, apres: 10, interligne: 4 });
  }

  y -= 4;
  filet();
  ecrire("Et maintenant ?", { taille: 12, gras: true, couleur: VERT_SOMBRE, apres: 4 });
  ecrire(
    `Si vous avez au moins huit bonnes réponses sur dix, vous êtes prêt : passez le test. `
    + `En dessous, reprenez les chapitres correspondant à vos erreurs — un domaine mal `
    + `maîtrisé coûte jusqu'à sept questions sur trente, et il en faut ${SEUIL_ADMISSION} `
    + `pour être admis.`,
    { taille: 10, apres: 8, interligne: 5 });
  ecrire(
    `Une fois admis, vous disposez de trois mois d'accès. Les leçons s'ouvrent au fil de `
    + `votre progression, et chacune se valide par ses exercices.`,
    { taille: 10, apres: 12, interligne: 5 });
  ecrire("Bon courage.", { taille: 10, gras: true, apres: 2 });
  ecrire(LIVRET_AUTEUR, { taille: 10, couleur: GRIS, apres: 0 });

  bas.push(y);

  // ── Pied de page et contrôle de débordement ────────────────────────────────
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    if (i === 0) return; // la couverture ne porte pas de folio
    const txt = `${LIVRET_TITRE} — ${LIVRET_AUTEUR}`;
    p.drawText(txt, { x: MARGE, y: 34, size: 8, font: regular, color: GRIS });
    const folio = `${i + 1} / ${pages.length}`;
    p.drawText(folio, {
      x: MARGE + LARGEUR - regular.widthOfTextAtSize(folio, 8),
      y: 34, size: 8, font: regular, color: GRIS,
    });
  });

  // pdf-lib dessine volontiers sous la marge, sans rien signaler : un chapitre trop long
  // sortirait de la page et le PDF serait livré tronqué. On refuse plutôt que de livrer.
  const debordements = bas
    .map((v, i) => ({ page: i + 1, y: v }))
    .filter(p => p.y < PLANCHER);
  if (debordements.length) {
    throw new Error(
      "livret-revision : contenu débordant sous la marge sur "
      + debordements.map(d => `la page ${d.page} (y=${d.y.toFixed(0)}, plancher ${PLANCHER})`).join(", ")
      + ". Raccourcir le chapitre correspondant dans shared/revision.ts."
    );
  }

  fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
  fs.writeFileSync(SORTIE, await doc.save());

  const ko = (fs.statSync(SORTIE).size / 1024).toFixed(0);
  console.log(`livret-revision : ${pages.length} pages, ${ko} Ko → ${path.relative(RACINE, SORTIE)}`);
  console.log(`  ${CHAPITRES.length} chapitres couvrant ${QUESTIONS_COUVERTES} des ${NB_QUESTIONS} questions du test`);
  console.log(`  marge basse la plus serrée : y=${Math.min(...bas).toFixed(0)} (plancher ${PLANCHER})`);
  return pages.length;
}

livret().catch(e => { console.error(e.message); process.exit(1); });
