# Visuels DataMEAL Academy

Sources vectorielles des images de communication. Le PNG livré est régénéré depuis le SVG,
jamais retouché à la main : c'est le SVG qui fait foi.

## `inscription-academy.svg` — « Comment s'inscrire »

Affiche en 5 étapes destinée aux futurs étudiants (WhatsApp, réseaux sociaux, impression A4).
Publiée en PNG dans `client/public/academy/inscription.png`, donc accessible à l'adresse
<https://www.louisfarm.com/academy/inscription.png> (le `www.` compte : sans lui, Vercel
renvoie un 307).

L'adresse imprimée SUR l'affiche est `louisfarm.com/elearning` — la page publique du test
d'aptitude, porte d'entrée du parcours, d'où part le bouton « Créer un compte ». Ne pas la
remplacer par `/academy/register`, qui est l'écran suivant et non le point d'entrée.

### Régénérer le PNG

```bash
node --input-type=module -e "
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
await sharp(readFileSync('design/inscription-academy.svg'), { density: 144 })
  .resize(1080, 1620).png().toFile('client/public/academy/inscription.png');
"
```

`density: 144` rend le SVG en 2160 × 3240 avant réduction en 1080 × 1620 : le texte reste net
sur écran haute densité. Le rendu utilise **DejaVu Sans**, présente sur la machine de build et
qui couvre les accents français — ne pas la remplacer par une police non installée, le texte
sortirait en carrés vides.

### Chiffres à tenir à jour

Le visuel affiche des seuils qui vivent dans le code. Si l'un change, corriger le SVG :

| Sur l'image | Source |
|---|---|
| 21 / 30 pour être admis | `ADMISSION_PASS_SCORE` dans `api/index.ts` |
| Accès valable 3 mois | `ADMISSION_MONTHS` dans `api/index.ts` |
| 70 % de bonnes réponses | `EXERCISE_PASS_PCT` dans `shared/exercises.ts` |
| 8 caractères minimum | validation du mot de passe, `client/src/pages/academy/register.tsx` |
| louisfarm.com/elearning | route publique `/elearning` dans `client/src/App.tsx` |

### Vérifier après modification

SVG ne renvoie pas le texte à la ligne : toute phrase rallongée peut déborder de sa carte
sans erreur. Après chaque retouche, régénérer le PNG **et le regarder** — deux débordements
sont passés inaperçus à la première version (le badge « 21 / 30 » chevauchait le texte voisin).
Les cartes vont de x = 60 à x = 1020 ; le texte commence à x = 212.

## `partage-elearning.svg` — vignette de partage de la formation

Image Open Graph (1200 × 630) affichée quand le lien de la formation est collé dans
WhatsApp, Facebook, LinkedIn ou Telegram. Publiée en PNG dans
`client/public/academy/partage-elearning.png`.

### Pourquoi une route serveur est nécessaire

Le site est une application React : les balises posées par le composant `<SEO>` sont
injectées **après** le chargement, par JavaScript. Or aucun robot de prévisualisation
n'exécute JavaScript — ils lisaient donc l'`index.html` brut, dont les balises décrivent le
portfolio. Partager `/elearning` affichait le portrait de Louis et « Agronome & Expert
Finance Agricole », pas la formation.

Le montage tient en deux pièces :

1. `app.get("/elearning", …)` dans `api/index.ts` renvoie une page minimale ne contenant que
   les balises Open Graph.
2. Une réécriture dans `vercel.json`, conditionnée à l'`user-agent`, n'y envoie **que** les
   robots. Les visiteurs continuent de recevoir l'application, et l'adresse partagée reste la
   vraie : <https://www.louisfarm.com/elearning>.

Deux détails qui ont chacun leur raison d'être :

- **Les URL des balises pointent sur `www.`**, jamais sur l'apex. `louisfarm.com` répond 307
  vers `www.` en ajoutant un jeton `_vercel_share` ; le robot de WhatsApp abandonne alors la
  vignette. D'où la constante `CANONICAL_URL` dans `api/index.ts`.
- **Googlebot est volontairement exclu** du filtre. Il exécute JavaScript et doit indexer la
  vraie page ; lui servir une page-croupion nuirait au référencement.

Le PNG doit rester **sous ~300 Ko**, seuil au-delà duquel WhatsApp renonce à la grande
vignette (il fait aujourd'hui 64 Ko).

### Régénérer le PNG

```bash
node --input-type=module -e "
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
writeFileSync('client/public/academy/partage-elearning.png',
  await sharp(readFileSync('design/partage-elearning.svg'), { density: 144 })
    .resize(1200, 630).png({ compressionLevel: 9, palette: true }).toBuffer());
"
```

### Vérifier après modification

Regarder le PNG **et sa réduction à 280 px** — c'est la taille réelle dans une conversation
WhatsApp. SVG ne renvoie pas le texte à la ligne : la pastille « LEARNING » chevauchait
« LouisFarm » à la première version, sans la moindre erreur au rendu.
