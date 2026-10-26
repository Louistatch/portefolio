// ══════════════ Livret de révision d'un parcours ══════════════
//
// Demandé par un étudiant le soir même de sa certification : « produire un pdf de tout le
// cours du parcours, pour réviser de temps en temps ». Le livret est la réponse : TOUTES les
// leçons d'un parcours, dans l'ordre, en une seule page imprimable — le navigateur en fait
// un PDF (Ctrl+P ou le bouton), ce qui évite d'embarquer un moteur PDF dans la fonction
// serverless et garantit que le document suit le contenu réel du moment, jamais un export
// figé qui divergerait des cours au premier correctif.
//
// Le gabarit vit dans shared/ parce qu'il a deux consommateurs : la route API qui le sert
// aux étudiants (et à l'administration), et l'outillage local qui en tire des PDF à
// distribuer directement (groupe WhatsApp de promotion). Un seul gabarit, ou deux versions
// qui divergent — c'est le même argument que shared/conditions.ts.
//
// ── Ce que le livret contient, et ce qu'il laisse en ligne ──
//
// Les cellules de leçon sont rendues avec le MÊME dialecte markdown maison que la salle de
// cours (client/src/pages/academy/classroom.tsx) : titres ##/###, citations, listes,
// tableaux |…|, gras/italique/code. S'y ajoutent les encadrés (callout), figures SVG,
// captures d'écran, ressources externes, questions rapides et cellules de code avec leur
// sortie enregistrée.
//
// En restent exclus, à dessein :
//   - les EXERCICES NOTÉS : leur énoncé se tire au sort par tentative et leur passage est
//     chronométré en ligne — un livret n'a que la place de dire qu'ils existent ;
//   - les notebooks LIVE (embed) : le code est imprimé, l'exécution reste au navigateur.
//
// Le SVG d'une figure est embarqué en data-URI dans une balise <img> : une image ne peut
// exécuter aucun script, ce qui rend au serveur la garantie que DOMPurify donne au client.

export type CelluleLecon = {
  type?: string;
  content?: string;
  title?: string;
  variant?: string;
  svg?: string;
  caption?: string;
  src?: string;
  url?: string;
  provider?: string;
  desc?: string;
  question?: string;
  opts?: string[];
  ans?: number;
  code?: string;
  lang?: string;
  output?: string;
};

export type LeconLivret = {
  title: string;
  content: { cells?: CelluleLecon[] } | null;
};

export type CoursLivret = {
  code: string;
  title: string;
  description?: string | null;
  level?: string | null;
  tools?: string[] | null;
  lessons: LeconLivret[];
};

export type ParcoursLivret = {
  title: string;
  subtitle?: string;
  credential?: string | null;
  outcome?: string;
  accent: string;
};

export type OptionsLivret = {
  parcours: ParcoursLivret;
  cours: CoursLivret[];
  /** Date affichée sur la couverture, déjà formatée (« 26 octobre 2026 »). */
  genereLe: string;
  /** Adresse publique du site, affichée sur la couverture et le pied de page. */
  siteUrl: string;
  /**
   * Origine des captures d'écran (`/images/...` → `${imagesBase}/images/...`). Par défaut,
   * siteUrl ; l'outillage local passe « . » pour imprimer depuis un miroir sur disque.
   */
  imagesBase?: string;
  /** Feuille de styles des polices ; par défaut, Google Fonts (Lora + Plus Jakarta Sans). */
  fontsHref?: string;
};

const POLICES_DEFAUT =
  "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@300..800&display=swap";

function echap(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Gras, italique et code en ligne — même ordre de règles que la salle de cours. */
function enLigne(texte: string): string {
  return echap(texte)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function celluleDeRangee(ligne: string): string[] {
  return ligne.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
}

function estSeparateurDeTableau(ligne: string): boolean {
  return /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?$/.test(ligne.trim());
}

/**
 * Le dialecte markdown des leçons, rendu pour l'impression. Mêmes règles ligne à ligne que
 * MarkdownCell côté salle de cours, à deux écarts près, assumés parce qu'ils servent la
 * lecture papier : les listes consécutives sont regroupées en vrais <ul>/<ol>, et un bloc
 * ``` est imprimé comme bloc de code (la salle de cours ignore les clôtures et laisse les
 * lignes en paragraphes — à l'écran l'étudiant a les cellules de code exécutables à côté,
 * sur papier il n'a que ceci).
 */
function mdVersHtml(contenu: string): string {
  const lignes = (contenu || "").split("\n");
  const sortie: string[] = [];
  let i = 0;
  while (i < lignes.length) {
    const ligne = lignes[i];

    if (ligne.trim().startsWith("```")) {
      const bloc: string[] = [];
      i++;
      while (i < lignes.length && !lignes[i].trim().startsWith("```")) { bloc.push(lignes[i]); i++; }
      i++; // la clôture
      if (bloc.length) sortie.push(`<pre class="code">${echap(bloc.join("\n"))}</pre>`);
      continue;
    }

    if (ligne.trim().startsWith("|") && i + 1 < lignes.length && estSeparateurDeTableau(lignes[i + 1])) {
      const entetes = celluleDeRangee(ligne);
      const rangees: string[][] = [];
      let j = i + 2;
      while (j < lignes.length && lignes[j].trim().startsWith("|")) { rangees.push(celluleDeRangee(lignes[j])); j++; }
      sortie.push(
        `<table><thead><tr>${entetes.map(h => `<th>${enLigne(h)}</th>`).join("")}</tr></thead>` +
        `<tbody>${rangees.map(r => `<tr>${r.map(c => `<td>${enLigne(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
      );
      i = j;
      continue;
    }

    if (ligne.startsWith("### ")) { sortie.push(`<h4>${enLigne(ligne.slice(4))}</h4>`); i++; continue; }
    if (ligne.startsWith("## ")) { sortie.push(`<h3>${enLigne(ligne.slice(3))}</h3>`); i++; continue; }
    if (ligne.startsWith("> ")) { sortie.push(`<blockquote>${enLigne(ligne.slice(2))}</blockquote>`); i++; continue; }

    if (/^\d+\. /.test(ligne)) {
      const items: string[] = [];
      const depart = parseInt(ligne, 10) || 1;
      while (i < lignes.length && /^\d+\. /.test(lignes[i])) { items.push(lignes[i].replace(/^\d+\. /, "")); i++; }
      sortie.push(`<ol start="${depart}">${items.map(t => `<li>${enLigne(t)}</li>`).join("")}</ol>`);
      continue;
    }
    if (ligne.startsWith("- ")) {
      const items: string[] = [];
      while (i < lignes.length && lignes[i].startsWith("- ")) { items.push(lignes[i].slice(2)); i++; }
      sortie.push(`<ul>${items.map(t => `<li>${enLigne(t)}</li>`).join("")}</ul>`);
      continue;
    }

    if (ligne.trim() === "") { i++; continue; }
    sortie.push(`<p>${enLigne(ligne)}</p>`);
    i++;
  }
  return sortie.join("\n");
}

function enBase64(s: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(s, "utf8").toString("base64");
  return btoa(unescape(encodeURIComponent(s)));
}

function celluleEnHtml(cell: CelluleLecon, imagesBase: string, exercices: { total: number; dejaSignale: boolean }): string {
  switch (cell.type) {
    case "md":
      return `<div class="md">${mdVersHtml(cell.content || "")}</div>`;

    case "callout": {
      // real/tip/warning viennent des cours écrits en TypeScript ; info/success des cours
      // rédigés depuis l'administration (voir courses-admin.tsx). Même rendu de part et
      // d'autre : un encadré inconnu retombe sur « Astuce » plutôt que de disparaître.
      const variantes: Record<string, { classe: string; libelle: string }> = {
        real: { classe: "reel", libelle: "Situation réelle" },
        tip: { classe: "astuce", libelle: "Astuce" },
        warning: { classe: "attention", libelle: "Attention" },
        info: { classe: "astuce", libelle: "Information" },
        success: { classe: "reel", libelle: "Réussite" },
      };
      const v = variantes[cell.variant || "tip"] || variantes.tip;
      return `<aside class="encadre ${v.classe}"><div class="encadre-titre">${echap(cell.title || v.libelle)}</div>` +
        `<p>${enLigne(cell.content || "")}</p></aside>`;
    }

    case "figure": {
      if (!cell.svg) return "";
      const img = `<img class="figure-svg" alt="${echap(cell.caption || cell.title || "Figure")}" src="data:image/svg+xml;base64,${enBase64(cell.svg)}">`;
      return `<figure class="figure">${cell.title ? `<figcaption class="figure-titre">${echap(cell.title)}</figcaption>` : ""}` +
        `${img}${cell.caption ? `<figcaption class="figure-legende">${echap(cell.caption)}</figcaption>` : ""}</figure>`;
    }

    case "image": {
      // Même règle que la salle de cours : seuls les chemins internes sont admis.
      const src = typeof cell.src === "string" && cell.src.startsWith("/") && !cell.src.startsWith("//") ? cell.src : null;
      if (!src) return "";
      return `<figure class="figure">${cell.title ? `<figcaption class="figure-titre">${echap(cell.title)}</figcaption>` : ""}` +
        `<img alt="${echap(cell.caption || cell.title || "Capture d'écran")}" src="${echap(imagesBase + src)}">` +
        `${cell.caption ? `<figcaption class="figure-legende">${echap(cell.caption)}</figcaption>` : ""}</figure>`;
    }

    case "resource":
      return `<aside class="ressource"><div class="ressource-titre">${echap(cell.title || "Ressource")}` +
        `${cell.provider ? ` <span class="ressource-source">· ${echap(cell.provider)}</span>` : ""}</div>` +
        `${cell.desc ? `<p>${enLigne(cell.desc)}</p>` : ""}` +
        `${cell.url ? `<p class="ressource-url">${echap(cell.url)}</p>` : ""}</aside>`;

    case "quiz": {
      const options = (cell.opts || []).map((opt, i) => {
        const bonne = i === cell.ans;
        return `<li${bonne ? ` class="bonne"` : ""}><span class="lettre">${String.fromCharCode(65 + i)}.</span> ${enLigne(opt)}${bonne ? " ✓" : ""}</li>`;
      }).join("");
      return `<aside class="quiz"><div class="quiz-titre">Question rapide</div>` +
        `<p>${enLigne(cell.question || "")}</p><ul>${options}</ul></aside>`;
    }

    case "exercise": {
      // L'énoncé d'un exercice noté se tire au sort et se passe chronométré, en ligne : le
      // livret signale son existence une seule fois par leçon, à la place du premier.
      if (exercices.dejaSignale) return "";
      exercices.dejaSignale = true;
      const n = exercices.total;
      return `<aside class="encadre attention"><div class="encadre-titre">À vous de jouer — en ligne</div>` +
        `<p>Cette leçon comporte ${n} exercice${n > 1 ? "s" : ""} noté${n > 1 ? "s" : ""}, à passer dans l'application ` +
        `(quiz chronométré, en une seule fois). Le livret sert à réviser, pas à répondre.</p></aside>`;
    }

    case "embed":
      return `<div class="bloc-code"><div class="bloc-code-entete">${echap(cell.title || "Notebook live")} · à exécuter en ligne (JupyterLite)</div>` +
        `<pre class="code">${echap(cell.code || "")}</pre></div>`;

    case "code":
      return `<div class="bloc-code"><div class="bloc-code-entete">${echap(cell.lang || "python")}</div>` +
        `<pre class="code">${echap(cell.code || "")}</pre>` +
        `${cell.output ? `<div class="bloc-code-entete sortie">sortie enregistrée</div><pre class="code sortie">${echap(cell.output)}</pre>` : ""}</div>`;

    default:
      return "";
  }
}

function leconEnHtml(lecon: LeconLivret, numero: number, imagesBase: string): string {
  const cells = Array.isArray(lecon.content?.cells) ? lecon.content!.cells! : [];
  const exercices = { total: cells.filter(c => c.type === "exercise").length, dejaSignale: false };
  const corps = cells.map(c => celluleEnHtml(c, imagesBase, exercices)).filter(Boolean).join("\n");
  return `<section class="lecon"><header class="lecon-entete">` +
    `<span class="lecon-numero">Leçon ${numero}</span><h2>${echap(lecon.title)}</h2></header>${corps}</section>`;
}

export function livretHtml(options: OptionsLivret): string {
  const { parcours, cours, genereLe, siteUrl } = options;
  const imagesBase = options.imagesBase ?? siteUrl;
  const accent = /^#[0-9a-fA-F]{6}$/.test(parcours.accent) ? parcours.accent : "#0f766e";
  const nbLecons = cours.reduce((n, c) => n + c.lessons.length, 0);

  const sommaire = cours.map((c, ci) =>
    `<div class="sommaire-cours"><div class="sommaire-cours-titre">` +
    `<span class="code-cours">${echap(c.code)}</span> ${echap(c.title)}</div><ol>` +
    c.lessons.map(l => `<li>${echap(l.title)}</li>`).join("") +
    `</ol></div>`,
  ).join("");

  const chapitres = cours.map((c, ci) => {
    const lecons = c.lessons.map((l, li) => leconEnHtml(l, li + 1, imagesBase)).join("\n");
    return `<section class="cours"><header class="cours-entete">` +
      `<div class="cours-sur">Cours ${ci + 1} sur ${cours.length} · <span class="code-cours">${echap(c.code)}</span></div>` +
      `<h1>${echap(c.title)}</h1>` +
      `${c.description ? `<p class="cours-description">${echap(c.description)}</p>` : ""}` +
      `${c.tools?.length ? `<p class="cours-outils">Outils : ${c.tools.map(echap).join(" · ")}</p>` : ""}` +
      `<ol class="cours-lecons">${c.lessons.map(l => `<li>${echap(l.title)}</li>`).join("")}</ol>` +
      `</header>${lecons}</section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Livret de révision — ${echap(parcours.title)}</title>
<link rel="stylesheet" href="${echap(options.fontsHref || POLICES_DEFAUT)}">
<style>
  :root{ --accent:${accent}; --encre:#1c2b26; --sourdine:#51625b; --trait:#dde5e1; }
  *{ margin:0; padding:0; box-sizing:border-box }
  html{ font-size:10.5pt }
  body{ font-family:'Plus Jakarta Sans',sans-serif; color:var(--encre); background:#fff; line-height:1.55 }
  h1,h2,.couverture-titre{ font-family:'Lora',serif }

  /* ── Aides à l'écran, absentes du papier ── */
  .barre-outils{ position:sticky; top:0; z-index:5; display:flex; gap:14px; align-items:center;
    padding:10px 18px; background:var(--encre); color:#fff }
  .barre-outils button{ font:inherit; font-weight:700; color:var(--encre); background:#fff;
    border:0; border-radius:999px; padding:8px 18px; cursor:pointer }
  .barre-outils span{ font-size:.85rem; opacity:.85 }
  @media print{ .barre-outils{ display:none } }

  /* Les marges viennent de l'imprimeur (boîte de dialogue du navigateur, ou l'outillage
     local via page.pdf) : en fixer ici en plus les ferait s'additionner. */
  @page{ size:A4 }
  .page{ max-width:175mm; margin:0 auto; padding:0 12px }

  /* ── Couverture ── */
  .couverture{ padding:26mm 0 10mm; border-bottom:3px solid var(--accent); margin-bottom:9mm;
    break-after:page }
  .couverture .marque{ font-size:.8rem; font-weight:800; letter-spacing:.3em; color:var(--accent) }
  .couverture-type{ margin-top:14mm; font-size:.85rem; font-weight:700; letter-spacing:.18em;
    text-transform:uppercase; color:var(--sourdine) }
  .couverture-titre{ font-size:2.6rem; font-weight:600; line-height:1.12; margin:4mm 0 3mm }
  .couverture-sous{ font-size:1.05rem; color:var(--sourdine); max-width:130mm }
  .couverture-infos{ margin-top:12mm; font-size:.9rem; color:var(--sourdine) }
  .couverture-infos strong{ color:var(--encre) }
  .couverture-note{ margin-top:8mm; padding:4mm 5mm; border-left:3px solid var(--accent);
    background:${accent}10; font-size:.85rem; color:var(--sourdine) }

  /* ── Sommaire ── */
  .sommaire{ break-after:page }
  .sommaire h1{ font-size:1.5rem; margin-bottom:5mm }
  .sommaire-cours{ margin-bottom:6mm; break-inside:avoid }
  .sommaire-cours-titre{ font-weight:700; margin-bottom:1.5mm }
  .sommaire ol{ margin-left:7mm; color:var(--sourdine); font-size:.92rem }
  .sommaire li{ margin:.6mm 0 }

  .code-cours{ font-family:ui-monospace,monospace; font-size:.82em; font-weight:700;
    color:var(--accent); letter-spacing:.04em }

  /* ── Chapitres et leçons ── */
  .cours{ break-before:page }
  .cours-entete{ padding:10mm 0 5mm; border-bottom:2px solid var(--accent); margin-bottom:4mm }
  .cours-sur{ font-size:.82rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
    color:var(--sourdine) }
  .cours-entete h1{ font-size:1.9rem; font-weight:600; line-height:1.2; margin:2.5mm 0 }
  .cours-description{ color:var(--sourdine); max-width:150mm }
  .cours-outils{ margin-top:2mm; font-size:.85rem; color:var(--sourdine) }
  .cours-lecons{ margin:4mm 0 0 6.5mm; color:var(--sourdine); font-size:.92rem }
  .cours-lecons li{ margin:.8mm 0 }

  .lecon{ break-before:page }
  .lecon-entete{ margin:6mm 0 3mm; padding-bottom:2.5mm; border-bottom:1px solid var(--trait) }
  .lecon-numero{ font-size:.78rem; font-weight:800; letter-spacing:.16em; text-transform:uppercase;
    color:var(--accent) }
  .lecon-entete h2{ font-size:1.45rem; font-weight:600; line-height:1.25; margin-top:1mm }

  /* ── Markdown ── */
  .md h3{ font-size:1.12rem; font-weight:700; margin:5mm 0 1.8mm }
  .md h4{ font-size:1rem; font-weight:700; margin:4mm 0 1.4mm }
  .md p{ margin:1.6mm 0; color:#2a3a34 }
  .md ul,.md ol{ margin:1.6mm 0 1.6mm 6.5mm; color:#2a3a34 }
  .md li{ margin:.8mm 0 }
  .md blockquote{ margin:2.5mm 0; padding-left:4mm; border-left:2.5px solid ${accent}66;
    color:var(--sourdine); font-style:italic }
  .md code, .encadre code, .quiz code{ font-family:ui-monospace,monospace; font-size:.86em;
    background:#eef2f0; padding:.5px 4px; border-radius:4px }
  .md strong{ color:var(--encre) }
  table{ width:100%; border-collapse:collapse; margin:3mm 0; font-size:.9rem; break-inside:avoid }
  th{ text-align:left; background:#f0f4f2; border-bottom:1.5px solid var(--trait); padding:1.8mm 2.5mm }
  td{ border-bottom:.8px solid var(--trait); padding:1.6mm 2.5mm; vertical-align:top }

  /* ── Encadrés ── */
  .encadre{ margin:3mm 0; padding:3.2mm 4mm; border-radius:3mm; border:1px solid;
    break-inside:avoid; font-size:.93rem }
  .encadre-titre{ font-weight:700; margin-bottom:1mm }
  .encadre.reel{ border-color:${accent}55; background:${accent}0d }
  .encadre.reel .encadre-titre{ color:var(--accent) }
  .encadre.astuce{ border-color:#bfdbfe; background:#eff6ff }
  .encadre.astuce .encadre-titre{ color:#1d4ed8 }
  .encadre.attention{ border-color:#fcd34d; background:#fffbeb }
  .encadre.attention .encadre-titre{ color:#b45309 }

  /* ── Figures et captures ── */
  .figure{ margin:3.5mm 0; border:1px solid var(--trait); border-radius:3mm; overflow:hidden;
    break-inside:avoid }
  .figure img{ display:block; width:100%; height:auto; max-height:120mm; object-fit:contain;
    background:#fff }
  .figure-titre{ padding:2mm 3.5mm; font-size:.85rem; font-weight:700; background:#f0f4f2;
    border-bottom:1px solid var(--trait) }
  .figure-legende{ padding:2mm 3.5mm; font-size:.82rem; color:var(--sourdine);
    background:#fafbfa; border-top:1px solid var(--trait) }

  /* ── Ressources ── */
  .ressource{ margin:3mm 0; padding:3mm 4mm; border:1px solid var(--trait); border-radius:3mm;
    break-inside:avoid; font-size:.9rem }
  .ressource-titre{ font-weight:700 }
  .ressource-source{ font-weight:500; color:var(--sourdine) }
  .ressource p{ color:var(--sourdine); margin-top:1mm }
  .ressource-url{ font-family:ui-monospace,monospace; font-size:.8rem; color:var(--accent);
    word-break:break-all }

  /* ── Questions rapides ── */
  .quiz{ margin:3mm 0; padding:3.2mm 4mm; border:1px solid var(--trait); border-radius:3mm;
    break-inside:avoid; font-size:.93rem }
  .quiz-titre{ font-weight:700; color:var(--accent); margin-bottom:1mm }
  .quiz ul{ list-style:none; margin-top:1.6mm }
  .quiz li{ padding:1mm 0; color:var(--sourdine) }
  .quiz li.bonne{ color:var(--encre); font-weight:600 }
  .quiz .lettre{ font-family:ui-monospace,monospace; font-size:.85em; color:var(--sourdine) }

  /* ── Code ── */
  .bloc-code{ margin:3mm 0; border:1px solid var(--trait); border-radius:3mm; overflow:hidden }
  .bloc-code-entete{ padding:1.6mm 3.5mm; font-family:ui-monospace,monospace; font-size:.75rem;
    color:var(--sourdine); background:#f0f4f2; border-bottom:1px solid var(--trait) }
  .bloc-code-entete.sortie{ border-top:1px solid var(--trait) }
  pre.code{ padding:2.8mm 3.5mm; font-family:ui-monospace,monospace; font-size:.8rem;
    line-height:1.5; white-space:pre-wrap; word-break:break-word; background:#fafbfa }
  pre.code.sortie{ background:#fff; color:var(--sourdine) }

</style>
</head>
<body>
  <div class="barre-outils">
    <button onclick="window.print()">Télécharger en PDF</button>
    <span>Sur téléphone : menu du navigateur → Imprimer → « Enregistrer au format PDF ».</span>
  </div>

  <div class="page">
    <header class="couverture">
      <div class="marque">LOUISFARM LEARNING</div>
      <div class="couverture-type">Livret de révision</div>
      <div class="couverture-titre">${echap(parcours.title)}</div>
      ${parcours.subtitle ? `<p class="couverture-sous">${echap(parcours.subtitle)}</p>` : ""}
      <div class="couverture-infos">
        ${cours.length} cours · ${nbLecons} leçons${parcours.credential ? ` · mène au <strong>${echap(parcours.credential)}</strong>` : ""}<br>
        Édition générée le ${echap(genereLe)} — le contenu en ligne fait foi.
      </div>
      <div class="couverture-note">Ce livret est réservé aux étudiants du parcours. Les exercices notés
      et les notebooks interactifs se passent dans l'application : ${echap(siteUrl.replace(/^https?:\/\//, ""))}.</div>
    </header>

    <nav class="sommaire">
      <h1>Sommaire</h1>
      ${sommaire}
    </nav>

    ${chapitres}
  </div>
</body>
</html>`;
}
