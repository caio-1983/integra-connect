import { motion } from 'framer-motion';
import { beamReveal, SEQ, EASE_OUT } from './authMotion';

/**
 * The protagonist: a small ceiling spot switching on at the top of the
 * page, casting a warm 2700K cone that reveals only the logo, headline
 * and fields. After the entrance, the light never sits perfectly still:
 * the spot's halo drifts between 38–45% opacity (12s) and the cone
 * breathes scale 1→1.03 / opacity 0.70→0.78 (15s) — entrance lives on
 * outer wrappers, idle loops on inner layers, so they never fight.
 * Everything is transform/opacity on blurred static gradients.
 */
export function LightBeam({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[74vh] overflow-hidden">
      {/* Corpo da luminária — visto de baixo */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <div className="h-4 w-16 rounded-b-[14px] border border-white/[0.06] bg-[#020202]" />
      </div>

      {/* Halo do spot — nunca completamente parado (38% → 45% → 38%, 12s) */}
      <motion.div
        className="absolute left-1/2 top-[6px] h-10 w-28 -translate-x-1/2"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.8, delay: SEQ.spot, ease: EASE_OUT }}
      >
        <motion.div
          className="h-full w-full"
          style={{
            background:
              'radial-gradient(ellipse 50% 55% at 50% 30%, rgba(255,196,120,0.6) 0%, rgba(255,196,120,0) 70%)',
            filter: 'blur(10px)',
          }}
          animate={reduce ? { opacity: 0.42 } : { opacity: [0.38, 0.45, 0.38] }}
          transition={reduce ? { duration: 0 } : { duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Face acesa do spot */}
      <div className="absolute left-1/2 top-[13px] -translate-x-1/2">
        <motion.div
          className="h-[6px] w-9 rounded-full bg-[#FFE3B0]"
          style={{
            boxShadow:
              '0 0 14px 4px rgba(255,214,150,0.65), 0 0 46px 16px rgba(255,196,120,0.22)',
            filter: 'blur(0.5px)',
          }}
          initial={reduce ? false : { opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 0.8, delay: SEQ.spot, ease: EASE_OUT }}
        />
      </div>

      {/* Cone de luz 2700K — entrada no wrapper, respiração no interno (15s) */}
      <div className="absolute left-1/2 top-3 h-full w-[min(54rem,130vw)] -translate-x-1/2">
        <motion.div className="h-full w-full origin-top" {...beamReveal(reduce)}>
          <motion.div
            className="h-full w-full origin-top will-change-transform"
            style={{
              background:
                'conic-gradient(from 180deg at 50% 0%, rgba(255,214,150,0) 41%, rgba(255,214,150,0.34) 50%, rgba(255,214,150,0) 59%)',
              filter: 'blur(22px)',
            }}
            animate={
              reduce
                ? { opacity: 0.74 }
                : { scale: [1, 1.03, 1], opacity: [0.7, 0.78, 0.7] }
            }
            transition={
              reduce ? { duration: 0 } : { duration: 15, repeat: Infinity, ease: 'easeInOut' }
            }
          />
        </motion.div>
      </div>

      {/* Poça de luz onde o feixe encontra o conteúdo */}
      <motion.div
        className="absolute left-1/2 top-[22%] h-[52vh] w-[min(48rem,115vw)] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(ellipse 52% 45% at 50% 35%, rgba(255,214,150,0.11) 0%, rgba(255,214,150,0.035) 45%, rgba(255,214,150,0) 72%)',
        }}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 1.6, delay: SEQ.spot + 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}
