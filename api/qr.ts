/**
 * Code QR de vérification, dessiné dans les documents officiels.
 *
 * ── Pourquoi il existe ──
 *
 * Les attestations et certificats portent depuis toujours la mention « Vérifiable sur
 * louisfarm.com/academy/verify-certificate » et un numéro. Vérifier supposait donc de
 * recopier à la main une référence du genre DMA-FINAL-42-M8K3QZ — sur un téléphone, devant
 * un employeur ou un agent de projet. Une seule faute de frappe et le document paraît faux.
 *
 * Le QR pointe directement sur /academy/verify-certificate/<numéro>, page publique qui
 * n'exige aucune session. Il ne remplace pas la mention écrite, il la complète : un document
 * imprimé en noir et blanc, photocopié, reste vérifiable des deux façons.
 *
 * ── Pourquoi côté serveur, et pourquoi en SVG ──
 *
 * Le certificat est produit ici, en SVG, puis rasterisé pour le décor du PDF. Générer le QR
 * au même endroit le fait donc apparaître dans les deux formats sans une ligne de plus, et
 * ne coûte RIEN au paquet envoyé au navigateur — un composant client aurait fait payer la
 * bibliothèque à toutes les pages du site pour un document délivré quelques fois par mois.
 *
 * `qrcode-generator` pèse 57 Ko et n'a aucune dépendance, sur les 5,7 Mo de la fonction
 * serverless. Il est importé au sommet plutôt qu'en dynamique, contrairement à pdf-lib :
 * l'écart de coût au démarrage à froid est sans commune mesure (57 Ko contre 2,45 Mo).
 *
 * ── Pourquoi une bibliothèque et non un encodeur maison ──
 *
 * Un QR mal encodé ne se voit pas : il s'imprime, il part chez l'employeur, et c'est le jour
 * de la vérification qu'on découvre qu'il ne se lit pas. L'encodage met en jeu un code
 * correcteur de Reed-Solomon dont une erreur est silencieuse. Ce n'est pas le bon endroit
 * pour économiser une dépendance de 57 Ko sans dépendances transitives.
 */
import qrcode from "qrcode-generator";

/**
 * Niveau de correction d'erreur.
 *
 * « M » restaure environ 15 % de modules perdus. C'est le bon compromis pour un document
 * destiné à être imprimé, plié dans une poche et parfois photocopié : « L » (7 %) céderait
 * au premier pli, « H » (30 %) gonflerait la matrice et réduirait la taille des modules à
 * surface égale, ce qui dégrade la lecture au téléphone bien plus que le pli.
 */
const CORRECTION = "M" as const;

/**
 * Marge blanche obligatoire autour du symbole, en modules.
 *
 * Quatre : c'est ce qu'impose la norme ISO/IEC 18004, et ce n'est pas décoratif — sans elle,
 * le décodeur ne distingue plus le bord du symbole du fond du document. Le certificat ayant
 * un fond blanc et des aplats de couleur clairs, on dessine quand même le rectangle blanc.
 */
const MARGE_MODULES = 4;

export type OptionsQr = {
  /** Coin supérieur gauche du carré blanc, dans le repère du SVG. */
  x: number;
  y: number;
  /** Côté total du carré blanc, marge comprise. */
  taille: number;
  /** Couleur des modules. Noir par défaut : c'est ce qui se lit le mieux. */
  couleur?: string;
};

/**
 * Rend un code QR sous forme de fragment SVG.
 *
 * Tous les modules sombres sont réunis dans UN seul `<path>` plutôt qu'en un millier de
 * `<rect>`. Ce n'est pas de la coquetterie : le SVG du certificat est rasterisé par sharp
 * pour servir de décor au PDF, et un millier d'éléments ralentit ce rendu de façon mesurable
 * pour un résultat identique au pixel près.
 */
export function qrSvg(texte: string, o: OptionsQr): string {
  // 0 = version choisie automatiquement d'après la longueur des données.
  const qr = qrcode(0, CORRECTION);
  qr.addData(texte);
  qr.make();

  const n = qr.getModuleCount();
  const pas = o.taille / (n + MARGE_MODULES * 2);
  const decalage = pas * MARGE_MODULES;

  let d = "";
  for (let ligne = 0; ligne < n; ligne++) {
    for (let col = 0; col < n; col++) {
      if (!qr.isDark(ligne, col)) continue;
      const x = decalage + col * pas;
      const y = decalage + ligne * pas;
      // Les modules voisins se touchent exactement : `pas` n'est pas arrondi, donc aucun
      // liseré blanc parasite n'apparaît entre deux modules après rasterisation.
      d += `M${x.toFixed(3)} ${y.toFixed(3)}h${pas.toFixed(3)}v${pas.toFixed(3)}h-${pas.toFixed(3)}z`;
    }
  }

  return `<g transform="translate(${o.x},${o.y})">`
    + `<rect width="${o.taille}" height="${o.taille}" fill="#ffffff"/>`
    + `<path d="${d}" fill="${o.couleur ?? "#0f172a"}"/>`
    + `</g>`;
}

/** URL publique de vérification d'un numéro de certificat. */
export function urlVerification(siteUrl: string, certNo: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/academy/verify-certificate/${encodeURIComponent(certNo)}`;
}
