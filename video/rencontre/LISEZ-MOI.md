# Vidéo d'ouverture des séances en direct

Quinze secondes, 1920 × 1080, à passer avant une rencontre ou à partager dans les groupes
WhatsApp. Le rendu final pèse 2,1 Mo.

La composition est du HTML animé par GSAP, rendu image par image dans un navigateur sans
interface puis encodé en MP4 — c'est le format de HyperFrames (HeyGen).

## Refaire le rendu

Le connecteur HyperFrames hébergé **refuse** de composer depuis Claude Code ou tout autre
agent en ligne de commande : il est réservé aux clients web. C'est leur outil en ligne de
commande qu'il faut utiliser, avec deux binaires que l'image ne fournit pas.

```bash
npm i --save-dev ffmpeg-static ffprobe-static      # ffmpeg ET ffprobe, tous deux exigés
node -e 'const f=require("fs");f.copyFileSync(require("ffmpeg-static"),process.env.HOME+"/.local/bin/ffmpeg");f.copyFileSync(require("ffprobe-static").path,process.env.HOME+"/.local/bin/ffprobe")'
chmod +x ~/.local/bin/ffmpeg ~/.local/bin/ffprobe
export PATH="$HOME/.local/bin:$PATH"

npx hyperframes browser ensure                     # télécharge Chrome Headless Shell
npx hyperframes check                              # lint, mise en page, mouvement, contraste
npx hyperframes render --quality high              # → renders/*.mp4
```

## Ce qui est figé dans le fichier, et pourquoi

- **Les polices sont incluses en base64.** Lora et Plus Jakarta Sans, les mêmes que le site.
  Le rendu se fait dans un navigateur nu : sans elles, le texte tomberait sur DejaVu et la
  vidéo ne ressemblerait plus à LouisFarm.
- **GSAP est servi depuis le dossier**, pas depuis un CDN. Une composition qui dépend du
  réseau au moment du rendu n'est pas déterministe, et le CDN est de toute façon injoignable
  derrière le proxy de l'environnement d'agent.

## Trois pièges rencontrés, à ne pas réintroduire

1. **Ne pas animer `letter-spacing`.** La propriété reflow le texte, et chaque glyphe se
   recale sur un pixel entier à chaque image : le moteur de capture image par image rend ce
   tremblement parfaitement visible. Le lint le refuse.
2. **Toute sortie en fondu doit être suivie d'un `tl.set(..., { autoAlpha: 0 })`** à la
   frontière du clip suivant. Sans lui, un saut de lecture qui atterrit après le fondu
   retrouve l'élément dans son état d'avant.
3. **Les fenêtres des scènes doivent être jointives, pas superposées.** Une scène sortante
   reste dans la mise en page tant que sa fenêtre dure, même à opacité nulle — et l'audit de
   mise en page a raison de s'en plaindre : deux textes centrés au même endroit sont un
   risque réel dès qu'on touche aux durées.

## Changer le texte

Tout est dans `index.html`, en clair. Les quatre scènes sont `#s1` à `#s4`, avec leurs
`data-start` / `data-duration`. Si vous changez une durée, décalez aussi les temps dans la
timeline en bas de fichier — et relancez `check` avant `render`.
