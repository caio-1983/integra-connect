import { motion } from 'framer-motion';
import { ShowroomScene } from './ShowroomScene';

/**
 * The showroom envelope: near-black neutral base (#070707/#0B0B0C/#111111),
 * the blurred architectural scene, film-grain texture, an edge vignette,
 * and — behind the form — a large warm halo that breathes on a slow loop.
 * No colored gradients: all light is warm-white 2700K at low opacity.
 */

const NOISE_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function BackgroundLighting({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base — layered neutral near-blacks, no hue cast */}
      <div className="absolute inset-0 bg-[#070707]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_65%_at_50%_-5%,#111111_0%,rgba(17,17,17,0)_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_58%,#0B0B0C_0%,rgba(11,11,12,0)_75%)]" />

      {/* Halo quente atrás do formulário — respiração lenta */}
      <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="h-[125vmin] w-[125vmin] rounded-full will-change-transform"
          style={{
            background:
              'radial-gradient(closest-side, rgba(240,216,166,0.09) 0%, rgba(240,216,166,0.045) 38%, rgba(240,216,166,0.015) 58%, rgba(240,216,166,0) 76%)',
          }}
          // Respiração: pico do gradiente 9% × opacity 0.55→1 ≈ 5% → 9% → 5%
          animate={
            reduce
              ? { opacity: 0.8 }
              : { scale: [1, 1.04, 1], opacity: [0.55, 1, 0.55] }
          }
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 18, repeat: Infinity, ease: 'easeInOut' }
          }
        />
      </div>

      {/* Grão de filme — estático, quase imperceptível */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: NOISE_TEXTURE, backgroundSize: '160px 160px' }}
      />

      {/* Vinheta — escurece as bordas, mantém o olhar no centro iluminado */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_130%_100%_at_50%_38%,rgba(4,4,4,0)_44%,rgba(4,4,4,0.92)_100%)]" />

      {/* Cena arquitetônica por cima da vinheta — os elementos já carregam
          seus próprios falloffs; abaixo dela a vinheta os apagava. */}
      <ShowroomScene reduce={reduce} />
    </div>
  );
}
