import { motion } from 'framer-motion';

/**
 * Architectural backdrop — abstract cues of a lighting showroom, all
 * heavily blurred and dim so they never compete with the form:
 * a laterally-lit wood-slat panel on the left, a vertical embedded LED
 * line on the right, a horizontal LED profile across the back wall,
 * stair edges washed by LED strips in the lower right, and a warm
 * floor reflection. The scene itself is static; every 15–20s a faint
 * brightness variation travels along the horizontal LED lines, like
 * energy passing through them. Nothing here animates under reduced motion.
 */

/** Faixa de brilho que percorre uma linha de LED horizontal. */
function EnergyPulse({
  reduce,
  delay,
  repeatDelay,
}: {
  reduce: boolean;
  delay: number;
  repeatDelay: number;
}) {
  if (reduce) return null;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.span
        className="absolute inset-y-0 w-[22%] will-change-transform"
        style={{
          background:
            'linear-gradient(to right, rgba(255,214,150,0) 0%, rgba(255,214,150,0.4) 50%, rgba(255,214,150,0) 100%)',
          filter: 'blur(2px)',
        }}
        initial={{ x: '-120%' }}
        animate={{ x: '560%' }}
        transition={{ duration: 3.8, delay, repeat: Infinity, repeatDelay, ease: 'easeInOut' }}
      />
    </div>
  );
}

export function ShowroomScene({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Ripado de madeira — vertical slats grazed by warm light, left side */}
      <div
        className="absolute -left-6 bottom-[14%] top-[6%] w-[24vw] max-w-[320px]"
        style={{
          background:
            'repeating-linear-gradient(90deg, rgba(206,150,88,0.34) 0px, rgba(206,150,88,0.34) 7px, rgba(0,0,0,0) 7px, rgba(0,0,0,0) 30px)',
          maskImage:
            'radial-gradient(ellipse 100% 85% at 0% 62%, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 100% 85% at 0% 62%, black 30%, transparent 80%)',
          filter: 'blur(10px)',
          opacity: 0.7,
        }}
      />
      {/* Uplight na base do ripado */}
      <div
        className="absolute bottom-[8%] left-0 h-[26vh] w-[20vw] max-w-[280px]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 10% 100%, rgba(255,178,102,0.20) 0%, rgba(255,178,102,0) 70%)',
          filter: 'blur(28px)',
        }}
      />

      {/* Linha de LED embutida — vertical, à direita */}
      <div className="absolute right-[11vw] top-[14%] h-[46%]">
        <div
          className="h-full w-px"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,203,133,0) 0%, rgba(255,203,133,0.7) 30%, rgba(255,203,133,0.7) 70%, rgba(255,203,133,0) 100%)',
            filter: 'blur(1.5px)',
          }}
        />
        <div
          className="absolute -inset-x-10 inset-y-0"
          style={{
            background:
              'radial-gradient(ellipse 100% 60% at 50% 50%, rgba(255,190,120,0.10) 0%, rgba(255,190,120,0) 70%)',
            filter: 'blur(24px)',
          }}
        />
      </div>

      {/* Degraus com fita de LED — inferior direito */}
      {[
        { top: '68%', width: '30vw', pulseDelay: 6, pulseRepeat: 17 },
        { top: '78%', width: '24vw', pulseDelay: 6.5, pulseRepeat: 17 },
        { top: '88%', width: '18vw', pulseDelay: 7, pulseRepeat: 17 },
      ].map((step, i) => (
        <div key={i} className="absolute right-0" style={{ top: step.top, width: step.width }}>
          <div className="relative h-px w-full">
            <div
              className="h-full w-full"
              style={{
                background:
                  'linear-gradient(to left, rgba(255,196,124,0.65) 0%, rgba(255,196,124,0.35) 55%, rgba(255,196,124,0) 100%)',
                filter: 'blur(1.5px)',
              }}
            />
            <EnergyPulse reduce={reduce} delay={step.pulseDelay} repeatDelay={step.pulseRepeat} />
          </div>
          <div
            className="absolute inset-x-0 -top-4 h-9"
            style={{
              background:
                'linear-gradient(to left, rgba(255,180,102,0.10) 0%, rgba(255,180,102,0) 80%)',
              filter: 'blur(16px)',
            }}
          />
        </div>
      ))}

      {/* Perfil de LED horizontal embutido na parede ao fundo */}
      <div className="absolute inset-x-[6%] top-[64%]">
        <div className="relative h-px w-full">
          <div
            className="h-full w-full"
            style={{
              background:
                'linear-gradient(to right, rgba(255,196,124,0) 0%, rgba(255,196,124,0.22) 22%, rgba(255,196,124,0.3) 50%, rgba(255,196,124,0.22) 78%, rgba(255,196,124,0) 100%)',
              filter: 'blur(1.5px)',
            }}
          />
          <EnergyPulse reduce={reduce} delay={2} repeatDelay={15} />
        </div>
        <div
          className="absolute inset-x-[10%] -top-5 h-11"
          style={{
            background:
              'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(255,180,102,0.05) 0%, rgba(255,180,102,0) 75%)',
            filter: 'blur(14px)',
          }}
        />
      </div>

      {/* Reflexo quente do piso sob o centro */}
      <div
        className="absolute inset-x-0 bottom-0 h-[22vh]"
        style={{
          background:
            'radial-gradient(ellipse 55% 90% at 50% 100%, rgba(255,196,130,0.05) 0%, rgba(255,196,130,0) 70%)',
          filter: 'blur(20px)',
        }}
      />
    </div>
  );
}
