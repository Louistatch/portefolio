import {
  motion,
  useScroll,
  useSpring,
  useReducedMotion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * Primitives d'animation du site.
 *
 * Règles communes :
 *  - transform + opacity uniquement (jamais de layout thrash) ;
 *  - `prefers-reduced-motion` respecté partout (via useReducedMotion ou media query CSS) ;
 *  - whileInView `once: true` : on ne rejoue pas l'animation à chaque remontée,
 *    le scroll reste calme sur une lecture longue.
 */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Ressorts du projet (presets Motion). Une seule source de vérité :
 *  - SPRING_STIFF  : éléments nets qui doivent répondre vite (pilule de navigation) ;
 *  - SPRING_SOFT   : surfaces flottantes (en-tête qui se masque) ;
 *  - SPRING_SMOOTH : valeurs de défilement (barre de progression) ;
 *  - SPRING_TILT   : inclinaison des cartes (TiltCard).
 */
export const SPRING_STIFF = { type: "spring" as const, stiffness: 400, damping: 30 };
export const SPRING_SOFT = { type: "spring" as const, stiffness: 260, damping: 30 };
export const SPRING_SMOOTH = { stiffness: 130, damping: 28 };
export const SPRING_TILT = { stiffness: 200, damping: 20 };

/** Apparition au défilement : fondu + translation douce. */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  once = true,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  once?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Conteneur en cascade : chaque StaggerItem apparaît l'un après l'autre. */
export function Stagger({
  children,
  className,
  gap = 0.07,
  delayChildren = 0,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delayChildren?: number;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap, delayChildren } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Cascade au montage (haut de page, hero) : joue dès l'arrivée, pas au scroll. */
export function MountStagger({
  children,
  className,
  gap = 0.09,
  delayChildren = 0,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delayChildren?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      animate={reduce ? undefined : "show"}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap, delayChildren } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MountItem({
  children,
  className,
  y = 22,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Compteur qui s'anime quand il entre dans le viewport. */
export function AnimatedNumber({
  value,
  duration = 1.5,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const aDemarre = useRef(false);

  // Filet de sécurité : si l'animation n'a pas démarré, le nombre s'affiche
  // quand même.
  //
  // Sans lui, le premier compteur de la bande de preuve restait bloqué à zéro
  // — « 0 années de terrain post-diplôme » sur la page d'accueil, c'est-à-dire
  // exactement le contraire de ce que la bande est là pour établir. Les trois
  // autres compteurs, même code et même rangée, s'animaient normalement ; la
  // cause du cas isolé n'a pas été établie, alors on garantit le résultat au
  // lieu de parier sur le mécanisme. Une seconde et demie est le temps que
  // l'animation elle-même prendrait : passé ce délai, il n'y a plus rien à
  // attendre.
  useEffect(() => {
    if (aDemarre.current) return;
    const t = setTimeout(() => {
      if (!aDemarre.current) setDisplay(value);
    }, 1500);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    aDemarre.current = true;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 4);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString("fr-FR")}
    </span>
  );
}

/**
 * Barre de progression qui se remplit depuis zéro à l'entrée dans le champ de vision.
 *
 * Elle ne décore pas : elle rend l'ampleur du chiffre lisible dans le temps. Un 8 % et un
 * 80 % immobiles se ressemblent au coin de l'œil ; remplis, jamais — l'un s'arrête tout de
 * suite, l'autre traverse. C'est la seule animation de cet écran qui ajoute de
 * l'information plutôt que de la ponctuation.
 *
 * En mouvement réduit, la barre est posée à sa valeur finale sans trajet : l'état d'arrivée
 * doit rester juste, sans quoi le réglage laisserait une barre vide.
 */
export function BarreRemplissage({
  pct,
  className,
  couleur,
  barre = "bg-primary",
}: {
  pct: number;
  className?: string;
  /** Couleur libre (accent de parcours). Prend le pas sur `barre`. */
  couleur?: string;
  /** Classe Tailwind de remplissage, quand la couleur vient du thème. */
  barre?: string;
}) {
  const reduce = useReducedMotion();
  const valeur = Math.max(0, Math.min(100, pct));
  return (
    <div className={`rounded-full bg-muted overflow-hidden ${className ?? "h-2"}`}>
      <motion.div
        className={`h-full rounded-full ${couleur ? "" : barre}`}
        style={couleur ? { background: couleur } : undefined}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${valeur}%` }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.7, ease: EASE }}
      />
    </div>
  );
}

/** Carte à inclinaison subtile au survol (désactivée sur tactile et reduced-motion). */
export function TiltCard({
  children,
  className,
  max = 4,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, SPRING_TILT);
  const sry = useSpring(ry, SPRING_TILT);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max);
    rx.set(-py * max);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Halo qui suit le curseur sur une carte portant la classe `spotlight`.
 *
 * Complète TiltCard plutôt qu'elle ne la remplace : l'inclinaison dit que la
 * carte est un objet, le halo dit où se trouve le regard. Rien ici ne passe par
 * Motion — une variable CSS écrite une fois par image suffit, et le pseudo-
 * élément qui la lit ne repeint ni la carte ni son texte.
 */
export function useSpotlight<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    // Pas de curseur à suivre sur un écran tactile : on n'attache rien.
    if (!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;

    let attente = 0;
    let x = 50, y = 50;
    const appliquer = () => {
      attente = 0;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    const surMouvement = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      x = ((e.clientX - r.left) / r.width) * 100;
      y = ((e.clientY - r.top) / r.height) * 100;
      // Une application par image, quel que soit le débit d'événements souris :
      // un pavé tactile en émet bien plus de soixante par seconde.
      if (!attente) attente = requestAnimationFrame(appliquer);
    };

    el.addEventListener("mousemove", surMouvement, { passive: true });
    return () => {
      el.removeEventListener("mousemove", surMouvement);
      if (attente) cancelAnimationFrame(attente);
    };
  }, [reduce]);

  return ref;
}

/**
 * Carte au halo. Le hook ne peut pas être appelé dans un `.map()` — un
 * composant le peut, et c'est la seule raison d'être de ce wrapper.
 */
export function Spotlight({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useSpotlight<HTMLDivElement>();
  return <div ref={ref} className={`spotlight ${className ?? ""}`}>{children}</div>;
}

/** Barre de progression du défilement, en haut de page. */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    ...SPRING_SMOOTH,
    restDelta: 0.001,
  });
  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[3px] origin-left z-[70] bg-gradient-to-r from-primary via-accent to-primary"
      style={{ scaleX }}
    />
  );
}

/** Transition d'entrée/sortie de page, à utiliser dans AnimatePresence. */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.996 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, y: -10, scale: 0.996 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Hook : l'en-tête se cache quand on descend, réapparaît quand on remonte. */
export function useAutoHideHeader(disabled: boolean) {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (disabled) {
      setHidden(false);
      return;
    }
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(latest > prev && latest > 160);
  });
  return hidden;
}
