# Visuels DataMEAL Academy

Sources vectorielles des images de communication. Le PNG livré est régénéré depuis le SVG,
jamais retouché à la main : c'est le SVG qui fait foi.

## `inscription-academy.svg` — « Comment s'inscrire »

Affiche en 5 étapes destinée aux futurs étudiants (WhatsApp, réseaux sociaux, impression A4).
Publiée en PNG dans `client/public/academy/inscription.png`, donc accessible à l'adresse
<https://louisfarm.com/academy/inscription.png>.

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

### Vérifier après modification

SVG ne renvoie pas le texte à la ligne : toute phrase rallongée peut déborder de sa carte
sans erreur. Après chaque retouche, régénérer le PNG **et le regarder** — deux débordements
sont passés inaperçus à la première version (le badge « 21 / 30 » chevauchait le texte voisin).
Les cartes vont de x = 60 à x = 1020 ; le texte commence à x = 212.
