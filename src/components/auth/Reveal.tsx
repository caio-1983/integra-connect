import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { reveal } from './authMotion';

/**
 * Thin wrapper that fades content up at a given point of the entrance
 * choreography (delays live in authMotion.SEQ). Lets each auth page
 * stagger its own fields/button/footer without repeating motion config.
 */
export function Reveal({ delay, children, className }: { delay: number; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div {...reveal(reduce, delay)} className={className}>
      {children}
    </motion.div>
  );
}
