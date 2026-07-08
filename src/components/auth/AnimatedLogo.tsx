import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { logoReveal } from './authMotion';

/**
 * Wraps the brand mark with its backlit entrance (opacity 0→1,
 * scale 0.96→1) plus a warm glow layer behind it that breathes very
 * slowly — the "sign" stays alive after the sequence settles.
 * The gold tinting of the mark itself is applied by the page (CSS
 * filter on the img), since this wrapper accepts any ReactNode.
 */
export function AnimatedLogo({ reduce, children }: { reduce: boolean; children: ReactNode }) {
  return (
    <motion.div {...logoReveal(reduce)} className="relative flex justify-center will-change-transform">
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[220%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(240,214,160,0.13) 0%, rgba(240,214,160,0.05) 45%, rgba(240,214,160,0) 74%)',
        }}
        animate={reduce ? { opacity: 0.9 } : { opacity: [0.7, 1, 0.7] }}
        transition={reduce ? { duration: 0 } : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Retroiluminação viva: brightness 1 → 1.08 → 1, lento demais para
          parecer piscada — apenas o letreiro reagindo à luz do ambiente. */}
      <motion.div
        className="relative"
        animate={reduce ? undefined : { filter: ['brightness(1)', 'brightness(1.08)', 'brightness(1)'] }}
        transition={reduce ? { duration: 0 } : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
