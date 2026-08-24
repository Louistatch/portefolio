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

Elle annonce les **trois parcours** — cursus MEAL, formation de formateurs, finance
climatique agricole — avec les couleurs déclarées dans `shared/programs.ts`. Elle n'a
longtemps montré que le cursus MEAL et ses outils : partager le lien faisait alors la
promotion d'un tiers de l'offre. À l'ouverture d'un quatrième parcours, c'est ici **et**
dans `script/pages-partage.mjs` (titre et description annoncés) qu'il faut l'ajouter.

La composition a été mise au point dans Canva, puis reportée dans le SVG. Le SVG reste la
source : c'est lui que la commande ci-dessous lit, et le PNG n'est jamais retouché à la
main. Si le design Canva devient la référence, il faudra supprimer ce SVG plutôt que
maintenir deux sources qui divergeront.

### Pourquoi une page dédiée est nécessaire

Le site est une application React : les balises posées par le composant `<SEO>` sont
injectées **après** le chargement, par JavaScript. Or aucun robot de prévisualisation
n'exécute JavaScript — ils lisaient donc l'`index.html` livré, dont les balises décrivent le
portfolio. Partager `/elearning` affichait le portrait de Louis et « Agronome & Expert
Finance Agricole », pas la formation.

`script/pages-partage.mjs`, lancé après `vite build`, recopie l'`index.html` construit en y
remplaçant les balises et écrit `dist/public/elearning.html` ; une réécriture dans
`vercel.json` sert ce fichier sur `/elearning`. L'application démarre exactement pareil — le
routeur lit `window.location`, que la réécriture ne change pas — et les mêmes fichiers JS et
CSS sont référencés.

Trois décisions à ne pas défaire :

- **Pas de détection d'user-agent.** Une première version n'envoyait les robots vers une page
  d'aperçu que si leur `user-agent` correspondait. Ce montage n'est vérifiable ni depuis un
  poste de développement, ni par la personne qui partage le lien : il échoue en silence.
  Ici, il suffit d'afficher la source de la page pour lire les balises.
- **Les URL visent `www.`**, jamais l'apex. `louisfarm.com` répond 307 vers `www.` en
  ajoutant un jeton `_vercel_share` ; le robot de WhatsApp renonce alors à la vignette
  plutôt que de suivre le rebond.
- **Chaque remplacement est vérifié.** Un `String.replace` dont le motif ne correspond plus
  ne lève rien, il rend la chaîne inchangée : le build passerait au vert et la page partirait
  avec les balises du portfolio. Le script échoue bruyamment à la place.

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

## `livret-revision.pdf` — livret de révision du test d'admission

Livret de 10 pages proposé au téléchargement depuis la section « Ressources » de la page de
la formation, et sur les deux écrans que voit un candidat qui a échoué. Optionnel : il
n'ouvre aucun droit et rien ne vérifie qu'il a été lu.

Le contenu vit dans **`shared/revision.ts`**, lu à la fois par le générateur PDF et par la
page du site — le sommaire affiché en ligne et le PDF ne peuvent donc pas diverger. Le PDF
est versionné : après toute modification du contenu, le régénérer et le committer.

```bash
npx tsx script/generate-livret-revision.ts
```

### Ce que le livret ne contient pas

Aucune des trente questions du test, ni leurs réponses. Les dix questions d'entraînement du
livret sont différentes. Un livret qui donnerait le corrigé ferait entrer des candidats que
la formation perdrait en deux semaines : le test vérifie qu'on a les bases pour suivre, il ne
filtre pas pour filtrer.

### Débordement

Un chapitre par page, forcé. `pdf-lib` n'avertit de rien quand le texte passe sous la marge :
il dessine dans le vide et le PDF sort tronqué. Le script mesure donc chaque page et
**échoue** si le contenu dépasse le plancher, en nommant la page fautive. Allonger un
chapitre dans `shared/revision.ts` peut donc casser la génération — c'est voulu.

### Chiffres à tenir à jour

| Dans le livret | Source |
|---|---|
| 21 bonnes réponses sur 30 | `ADMISSION_PASS_SCORE`, `api/index.ts` |
| Accès valable 3 mois | `ADMISSION_MONTHS`, `api/index.ts` |
| Nouvelle tentative après une semaine | délai de reprise du test, `api/index.ts` |
