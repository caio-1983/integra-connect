import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SEQ } from './authMotion';

/**
 * Dust motes caught in the beam: a handful of tiny, low-opacity points
 * drifting very slowly upward inside the lit column. Deterministic
 * pseudo-random placement (stable across re-renders), transform/opacity
 * only, and skipped entirely under prefers-reduced-motion.
 */

const COUNT = 12;

/** Cheap deterministic PRNG so particle layout is stable between renders. */
function seeded(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

interface Particle {
  left: number;
  top: number;
  size: number;
  drift: number;
  duration: number;
  delay: number;
  peakOpacity: number;
  blur: number;
}

export function FloatingParticles({ reduce }: { reduce: boolean }) {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const rand = seeded(i + 1);
        return {
          left: 32 + rand() * 36, // stay inside the beam column
          top: 12 + rand() * 55,
          size: 1 + rand() * 1.6,
          drift: 28 + rand() * 40,
          duration: 14 + rand() * 12,
          delay: rand() * 10,
          peakOpacity: 0.14 + rand() * 0.16,
          blur: 0.4 + rand() * 0.8,
        };
      }),
    [],
  );

  if (reduce) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-[#F5DFB8] will-change-transform"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            filter: `blur(${p.blur}px)`,
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, p.peakOpacity, 0], y: [0, -p.drift] }}
          transition={{
            duration: p.duration,
            delay: SEQ.spot + p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}
