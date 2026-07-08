import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * The room responds to presence: a large, very low-opacity warm glow
 * anchored to the centre of the page that drifts only a few dozen
 * pixels toward the cursor — parallax, not a spotlight. Slow springs
 * make it feel like light settling. Pointer-fine devices only;
 * disabled under prefers-reduced-motion.
 */

const SIZE = 1000;
/** Fraction of the cursor's distance-from-centre the glow travels. */
const DRIFT = 0.055;

export function MouseLight({ reduce }: { reduce: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 40, damping: 25, mass: 1 });
  const springY = useSpring(y, { stiffness: 40, damping: 25, mass: 1 });

  useEffect(() => {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return;

    const onMove = (e: MouseEvent) => {
      x.set((e.clientX - window.innerWidth / 2) * DRIFT);
      y.set((e.clientY - window.innerHeight / 2) * DRIFT);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [reduce, x, y]);

  if (reduce) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-full will-change-transform"
        style={{
          width: SIZE,
          height: SIZE,
          marginLeft: -SIZE / 2,
          marginTop: -SIZE / 2,
          x: springX,
          y: springY,
          background:
            'radial-gradient(circle, rgba(255,214,150,0.045) 0%, rgba(255,214,150,0.016) 45%, rgba(255,214,150,0) 68%)',
        }}
      />
    </div>
  );
}
