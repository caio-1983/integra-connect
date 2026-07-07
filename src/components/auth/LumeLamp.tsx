import { motion, useReducedMotion } from 'framer-motion';

/**
 * Original articulated desk-lamp illustration — echoes the lamp glyph already
 * in the Lumina logo (base, angled arm, single joint, open bell shade), not
 * Pixar's Luxo Jr. (no paired "hinge" joints, no rounded head-like shade, no
 * hop/stomp locomotion). Settles into place, then its bulb "clicks" on —
 * the concrete source of AuthShell's ambient glow.
 */
export function LumeLamp() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute left-1/2 top-[6%] z-10 w-24 -translate-x-1/2 sm:w-28">
      <motion.svg
        viewBox="0 0 96 88"
        fill="none"
        stroke="#F3E4C4"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-auto w-full overflow-visible"
        initial={shouldReduceMotion ? false : { opacity: 0, y: -10, rotate: -8 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{
          opacity: {
            duration: shouldReduceMotion ? 0 : 0.4,
            delay: shouldReduceMotion ? 0 : 0.05,
            ease: [0.16, 1, 0.3, 1],
          },
          y: {
            duration: shouldReduceMotion ? 0 : 0.4,
            delay: shouldReduceMotion ? 0 : 0.05,
            ease: [0.16, 1, 0.3, 1],
          },
          rotate: shouldReduceMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 140, damping: 9, mass: 0.6, delay: 0.1 },
        }}
        style={{ transformOrigin: '20px 80px' }}
      >
        {/* base */}
        <ellipse cx={20} cy={80} rx={14} ry={4} />
        {/* lower arm segment */}
        <line x1={20} y1={76} x2={34} y2={40} />
        {/* joint */}
        <circle cx={34} cy={40} r={3.5} />
        {/* upper arm segment */}
        <line x1={34} y1={40} x2={62} y2={18} />
        {/* open bell shade */}
        <polyline points="50,10 74,10 68,26 56,26 50,10" />
        {/* bulb — ignites independently of the arm/shade */}
        <motion.circle
          cx={62}
          cy={22}
          r={5}
          fill="#FCE8BE"
          stroke="none"
          initial={shouldReduceMotion ? false : { opacity: 0.2, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.3,
            delay: shouldReduceMotion ? 0 : 0.45,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{
            transformOrigin: '62px 22px',
            filter: 'drop-shadow(0 0 6px rgba(252,232,190,0.9))',
          }}
        />
      </motion.svg>
    </div>
  );
}
