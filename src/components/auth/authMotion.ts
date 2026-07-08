import type { Transition, TargetAndTransition } from 'framer-motion';

/**
 * Central motion configuration for the auth "showroom" experience.
 * Every animated auth component reads its timing from here so the
 * entrance reads as one choreographed light sequence, not isolated effects.
 *
 * All animations touch only `transform` and `opacity` (GPU-friendly), and
 * every consumer passes `reduce` (from useReducedMotion) so the whole
 * sequence collapses to an instant render when the user opts out of motion.
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Entrance choreography, in seconds from page load. Full sequence lands
 * in ~2s, each element ~120–150ms after the previous one:
 * spot → cone → logo → título → subtítulo → plano → campos → botão → rodapé.
 */
export const SEQ = {
  /** Spot ignites — the fixture being switched on (cone follows inside it). */
  spot: 0.15,
  /** Logo emerges under the light, backlit signage. */
  logo: 0.45,
  title: 0.7,
  subtitle: 0.85,
  /** The invisible glass plane the form lives on. */
  plane: 1.0,
  fields: 1.15,
  button: 1.4,
  divider: 1.55,
  footer: 1.7,
} as const;

interface RevealOptions {
  y?: number;
  scale?: number;
  duration?: number;
}

interface MotionProps {
  initial: false | TargetAndTransition;
  animate: TargetAndTransition;
  transition: Transition;
}

/** Fade-up reveal used by headline, copy, fields and footer. */
export function reveal(
  reduce: boolean,
  delay: number,
  { y = 12, scale, duration = 0.65 }: RevealOptions = {},
): MotionProps {
  return {
    initial: reduce ? false : { opacity: 0, y, ...(scale !== undefined ? { scale } : {}) },
    animate: { opacity: 1, y: 0, ...(scale !== undefined ? { scale: 1 } : {}) },
    transition: reduce
      ? { duration: 0 }
      : { duration, delay, ease: EASE_OUT },
  };
}

/** Logo: luminous emergence — opacity 0→1, scale 0.96→1. */
export function logoReveal(reduce: boolean): MotionProps {
  return {
    initial: reduce ? false : { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    transition: reduce
      ? { duration: 0 }
      : { duration: 0.9, delay: SEQ.logo, ease: 'easeOut' },
  };
}

/** Beam of light: grows downward from the spot while brightening. */
export function beamReveal(reduce: boolean): MotionProps {
  return {
    initial: reduce ? false : { opacity: 0, scaleY: 0.65 },
    animate: { opacity: 1, scaleY: 1 },
    transition: reduce
      ? { duration: 0 }
      : { duration: 1.2, delay: SEQ.spot, ease: EASE_OUT },
  };
}
