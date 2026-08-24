/**
 * Génère les pages dont l'aperçu de partage doit différer de celui du portfolio.
 *
 * Le site est une application React : les balises posées par le composant <SEO> sont
 * injectées après le chargement, par JavaScript. Aucun robot de prévisualisation — WhatsApp,
 * Facebook, LinkedIn, Telegram — n'exécute JavaScript. Ils lisent donc le HTML livré, et le
 * `index.html` unique de l'application décrit le portfolio : partager la formation affichait
 * « Agronome & Expert Finance Agricole » et le portrait de Louis.
 *
 * La parade tient en un fichier : on recopie l'`index.html` construit en y remplaçant les
 * balises, et une réécriture Vercel sert ce fichier sur /elearning. L'application démarre
 * exactement pareil — le routeur lit window.location, que la réécriture ne change pas.
 *
 * Une variante par détection d'user-agent a été écartée : elle n'est vérifiable ni depuis un
 * poste de développement, ni par la personne qui partage le lien, et elle échoue en silence.
 * Ici, n'importe qui peut afficher la source de la page et lire les balises.
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RACINE = "dist/public";

/** Hôte canonique, avec le `www.`.
 *  L'apex répond 307 vers `www.` en ajoutant un jeton `_vercel_share` ; le robot de WhatsApp
 *  renonce alors à la vignette plutôt que de suivre le rebond. Les adresses annoncées dans
 *  les balises doivent donc viser directement l'hôte final. */
const HOTE = "https://www.louisfarm.com";

const PAGES = [
  {
    fichier: "elearning.html",
    url: `${HOTE}/elearning`,
    // Ce texte est ce que voit un groupe WhatsApp quand le lien y est collé — souvent le
    // premier contact avec la formation. Il annonçait le seul cursus MEAL, alors que
    // LouisFarm délivre trois certificats distincts : les deux autres parcours étaient
    // invisibles au moment précis où le lien circule. Les trois sont nommés, dans l'ordre
    // de shared/programs.ts.
    titre: "Trois parcours certifiants, 100 % gratuits | LouisFarm Learning",
    titrePartage: "Trois parcours certifiants, 100 % gratuits",
    description:
      "Suivi-évaluation (MEAL), formation de formateurs en gestion financière paysanne, "
      + "analyse du risque climatique agricole. Formation par projets en Afrique de l'Ouest, "
      + "certificat à la clé. Inscription ouverte en permanence, admission sur test.",
    image: `${HOTE}/academy/partage-elearning.png`,
    alt: "LouisFarm Learning — trois parcours certifiants gratuits : cursus MEAL, "
      + "formation de formateurs, finance climatique agricole",
  },
];

/**
 * Remplace un fragment et vérifie que le remplacement a bien eu lieu.
 *
 * C'est tout l'intérêt de la fonction. Un `String.replace` dont le motif ne correspond plus
 * ne lève rien : il rend la chaîne inchangée. Le build passerait au vert et la page partirait
 * en production avec les balises du portfolio — exactement le défaut qu'on corrige ici.
 */
function remplacer(html, motif, valeur, quoi) {
  const suivant = html.replace(motif, valeur);
  if (suivant === html) {
    throw new Error(
      `pages-partage : « ${quoi} » introuvable dans index.html. `
      + `Le gabarit a changé — corriger le motif dans script/pages-partage.mjs.`
    );
  }
  return suivant;
}

const source = readFileSync(join(RACINE, "index.html"), "utf-8");

for (const p of PAGES) {
  let html = source;

  html = remplacer(html, /<title>[\s\S]*?<\/title>/, `<title>${p.titre}</title>`, "title");
  html = remplacer(html, /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${p.description}">`, "meta description");

  html = remplacer(html, /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${p.titrePartage}">`, "og:title");
  html = remplacer(html, /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${p.description}">`, "og:description");
  html = remplacer(html, /<meta property="og:image" content="[^"]*">/,
    `<meta property="og:image" content="${p.image}">`
    + `\n    <meta property="og:image:type" content="image/png">`
    + `\n    <meta property="og:image:width" content="1200">`
    + `\n    <meta property="og:image:height" content="630">`
    + `\n    <meta property="og:image:alt" content="${p.alt}">`,
    "og:image");
  html = remplacer(html, /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="${p.url}">`
    + `\n    <meta property="og:locale" content="fr_FR">`
    + `\n    <link rel="canonical" href="${p.url}">`,
    "og:url");
  html = remplacer(html, /<meta property="og:site_name" content="[^"]*">/,
    `<meta property="og:site_name" content="LouisFarm Learning">`, "og:site_name");

  html = remplacer(html, /<meta name="twitter:title" content="[^"]*">/,
    `<meta name="twitter:title" content="${p.titrePartage}">`, "twitter:title");
  html = remplacer(html, /<meta name="twitter:description" content="[^"]*">/,
    `<meta name="twitter:description" content="${p.description}">`, "twitter:description");
  html = remplacer(html, /<meta name="twitter:image" content="[^"]*">/,
    `<meta name="twitter:image" content="${p.image}">`, "twitter:image");

  // Garde-fou final : plus aucune trace du portfolio ne doit subsister dans les balises.
  for (const interdit of ["Agronome", "og-default", "332d9e01"]) {
    if (html.slice(0, html.indexOf("</head>")).includes(interdit)) {
      throw new Error(`pages-partage : « ${interdit} » subsiste dans l'en-tête de ${p.fichier}.`);
    }
  }

  writeFileSync(join(RACINE, p.fichier), html);
  console.log(`pages-partage : ${p.fichier} généré (${(html.length / 1024).toFixed(1)} Ko)`);
}

/**
 * Tout fichier annoncé par le site doit exister dans la sortie déployée.
 *
 * Ce contrôle s'exécute pendant le buildCommand, donc SUR Vercel, et c'est là son intérêt :
 * `.vercelignore` décide de ce que la machine de build reçoit, et un fichier exclu y est
 * simplement absent. En local il est là, le build est vert, les liens marchent — et en
 * production ils rendent 404. C'est arrivé aux trois énoncés de travaux de groupe et au
 * livret de révision, emportés par un `*.pdf` écrit à une époque où le dépôt n'avait qu'un
 * CV à la racine. Rien n'avait échoué.
 *
 * Le seul moment où l'écart est observable est celui-ci. On y échoue donc bruyamment.
 */
const EXTENSIONS = /\.(pdf|docx?|pptx?|xlsx?|csv|zip|png|jpe?g|webp|svg|gif|mp4)$/i;

function fichiersSources(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).flatMap(e => {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : fichiersSources(chemin);
    return /\.(ts|tsx|mjs)$/.test(e.name) ? [chemin] : [];
  });
}

const references = new Map(); // adresse → fichier qui la cite
for (const src of [...fichiersSources("shared"), ...fichiersSources("client/src")]) {
  const code = readFileSync(src, "utf-8");
  // Adresses absolues écrites en dur. Les routes de l'application (« /academy/dashboard »)
  // n'ont pas d'extension et sont donc naturellement écartées ; les adresses distantes
  // commencent par http et ne sont pas concernées.
  for (const m of code.matchAll(/["'`](\/[A-Za-z0-9_\-./]+)["'`]/g)) {
    if (EXTENSIONS.test(m[1]) && !references.has(m[1])) references.set(m[1], src);
  }
}

const manquants = [...references].filter(([url]) => {
  const cible = join(RACINE, url);
  return !existsSync(cible) || !statSync(cible).isFile();
});

if (manquants.length) {
  throw new Error(
    `pages-partage : ${manquants.length} fichier(s) annoncé(s) par le site sont absents de `
    + `${RACINE} — ils rendront 404 en production :\n`
    + manquants.map(([url, src]) => `  ${url}  (cité par ${src})`).join("\n")
    + `\n\nCause la plus probable : une règle de .vercelignore les a exclus de l'envoi.`
  );
}

console.log(`pages-partage : ${references.size} fichiers annoncés par le site, tous présents.`);
