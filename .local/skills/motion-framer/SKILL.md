---
name: motion-framer
description: Motion system of the LouisFarm site (Framer Motion v11) — reusable motion primitives, page transitions, scroll reveals, counters and micro-interactions, respecting the institutional identity, mobile performance and reduced-motion preferences.
---

# Motion & Framer Motion — LouisFarm

Ce dépôt anime son interface avec **framer-motion ^11** (`package.json`). Le
système est centralisé dans `client/src/components/motion.tsx` : toute nouvelle
animation doit d'abord passer par une primitive existante, jamais par un
`motion.div` écrit à la volée dans une page.

## Règles d'identité — à lire avant d'animer

1. **Site institutionnel sobre.** Le premier lecteur est un chargé de programme
   d'ONG ou un analyste de banque. L'animation sert la lecture, jamais le
   spectacle : pas de rebond marqué, pas de rotation décorative, pas d'effet
   « carnival ».
2. **Transform + opacity uniquement.** `x`, `y`, `scale`, `rotate`, `opacity`
   sont accélérés par le GPU. Jamais `width`, `height`, `top`, `left`, `margin`
   (layout thrash) — sauf `layout`/`layoutId` ponctuels (voir plus bas).
3. **Durées et distances calibrées** : 0,4 à 0,7 s, distances ≤ 34 px. Au-delà,
   l'œil perd le fil de la lecture.
4. **`prefers-reduced-motion` obligatoire** : `useReducedMotion()` côté Motion,
   media query côté CSS. Quand il est actif, l'utilisateur voit l'état final
   immédiatement.
5. **`once: true` partout** sur les révélations au scroll : on ne rejoue pas
   l'animation à chaque remontée, le scroll reste calme sur une lecture longue.
6. **Jamais d'animation dans les tableaux** (bande de preuve, note de veille,
   cursus) : ce qui se compare se lit en descendant une colonne, l'animation
   romprait la comparaison. Les compteurs `AnimatedNumber` sont l'exception
   voulue.
7. **Mobile d'abord** : le site est consulté sur des téléphones Android
   modestes. Pas de blur lourd hors des deux orbes fixes, pas de cascade
   géante sur les listes longues de l'Academy.

## Le catalogue des primitives (`client/src/components/motion.tsx`)

| Primitive | Rôle | Usage typique |
|---|---|---|
| `Reveal` | fondu + translation à l'entrée dans le viewport | titres de section, blocs |
| `Stagger` / `StaggerItem` | cascade d'apparition au scroll | grilles de cartes, domaines |
| `MountStagger` / `MountItem` | cascade au montage (pas au scroll) | hero de la page d'accueil |
| `AnimatedNumber` | compteur de 0 à la valeur à l'entrée dans le viewport | bande de preuve, stats |
| `TiltCard` | inclinaison 3D subtile au survol (desktop only) | fiche d'identité |
| `ScrollProgressBar` | barre de progression du défilement | montée une fois dans `Layout` |
| `PageTransition` | entrée/sortie de page (à utiliser dans `AnimatePresence`) | `Layout` |
| `useAutoHideHeader` | l'en-tête se cache en descendant, revient en remontant | `Layout` |

Exemple d'usage réel :

```tsx
import { Reveal, Stagger, StaggerItem, AnimatedNumber } from "@/components/motion";

<Reveal>
  <h2>Domaines d'intervention</h2>
</Reveal>
<Stagger className="grid md:grid-cols-3 gap-7">
  <StaggerItem><Domaine … /></StaggerItem>
  <StaggerItem><Domaine … /></StaggerItem>
</Stagger>
```

## Constantes partagées (source de vérité unique)

- `EASE = [0.16, 1, 0.3, 1]` — courbe signature du site (expo-out doux).
- `SPRING_STIFF` (400/30) — éléments nets : pilule de navigation.
- `SPRING_SOFT` (260/30) — surfaces flottantes : en-tête qui se masque.
- `SPRING_SMOOTH` (130/28) — valeurs de défilement : barre de progression.
- `SPRING_TILT` (200/20) — inclinaison des cartes.

Ne pas inventer de nouvelles valeurs de ressort : réutiliser ces constantes ou
en ajouter une **documentée** dans `motion.tsx`.

## Où le mouvement est câblé

- **`layout.tsx`** — transitions de pages : `AnimatePresence mode="wait"`
  autour de `<PageTransition key={location}>` dans `<main>`. L'en-tête est un
  `motion.header` piloté par `useAutoHideHeader` (désactivé quand un menu est
  ouvert). La pilule de navigation utilise `layoutId="nav-pill"` (unique dans
  la vue). Les orbes d'ambiance (`fixed`, classe `.orb`) et la
  `ScrollProgressBar` sont montés ici.
- **`home.tsx`** — cascade du hero (`MountStagger`), compteurs de la bande de
  preuve, révélations des sections, cartes du journal en cascade.
- **`index.css`** — utilitaires CSS purs (pas de re-rendu React) : `.pressable`
  (enfoncement au clic), `.lift` (élévation au survol), `.orb` + keyframes de
  dérive, `.auth-enter` (boutons connexion/inscription), `scroll-behavior:
  smooth`.

## CSS vs Motion : qui fait quoi

- **CSS** pour les états stationnaires et les survols simples (`hover`,
  `active`) : `.pressable`, `.lift`, transitions Tailwind.
- **Motion** pour les entrées/sorties, les cascades, les compteurs, le tilt et
  les ressorts.
- **Ne jamais doubler** : pas de `whileTap` + `.pressable` sur le même élément,
  pas de `whileHover` + `.lift` — les deux se combattent.

## Pièges connus du projet

1. **Ne pas remettre `page-enter` sur `<main>`** : la classe a été remplacée
   par `PageTransition`, la réintroduire double l'animation.
2. **`layoutId: "nav-pill"` est pris** : un seul `layoutId` par vue, sinon les
   éléments se téléportent l'un vers l'autre.
3. **`AnimatePresence`** : l'enfant animé doit être un enfant direct avec une
   `key` unique — ici `key={location}`.
4. **Blur** : uniquement les deux orbes fixes (`filter: blur(90px)`). Tout
   autre blur animé est interdit sur mobile Android (cf. correctifs GPU dans
   `index.css`).
5. **Tableaux** : aucune animation d'entrée sur les lignes (règle 6).
6. **TiltCard** : survol uniquement ; sur tactile il reste statique (déjà géré,
   ne pas retirer la garde).
7. **Agent parallèle** : un autre agent pousse sur `main` (commits « Design »,
   « Retard »…). Toujours `git pull --rebase origin main` avant de pousser, et
   vérifier les chevauchements sur `layout.tsx` / `home.tsx`.

## Démarche de validation

1. `npm run check` (tsc) — zéro erreur ;
2. `npx vite build --config vite.config.ts` — le bundle client doit compiler
   (Vercel le rebuilder ; sharp est inutile pour cette étape) ;
3. commit en français, sujet court (« Mouvement : … ») puis `git push origin
   main` — le déploiement Vercel part tout seul ;
4. vérifier `www.louisfarm.com` (HTTP 200 + bundle servi).

## Références

- [Motion Docs](https://motion.dev/) — documentation officielle
- [Framer Motion Docs](https://www.framer.com/motion/) — v11 utilisée ici
- Exemples de variants, ressorts et orchestration : le présent fichier est
  l'adaptation au projet du skill générique
  `freshtechbro/claudedesignskills` (`.claude/skills/motion-framer`).
