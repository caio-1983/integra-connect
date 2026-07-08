import { motion } from 'framer-motion';

/**
 * Hairline divider with a tiny lit point at its centre — an LED
 * indicator embedded in the wall. The dot pulses very slowly;
 * static under reduced motion.
 */
export function LedDivider({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="relative flex items-center justify-center py-1">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.09] to-transparent" />
      <motion.span
        className="absolute h-[4px] w-[4px] rounded-full bg-[#E8D8B0]"
        style={{ boxShadow: '0 0 8px 2px rgba(232,216,176,0.5), 0 0 20px 6px rgba(232,216,176,0.15)' }}
        animate={reduce ? { opacity: 0.9 } : { opacity: [0.6, 1, 0.6] }}
        transition={reduce ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
