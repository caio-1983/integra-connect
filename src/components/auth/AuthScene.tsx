import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { u } from './authUnit';

/**
 * The auth showcase's product mockup: a laptop in real CSS 3D, isolated on
 * the panel background (no desk, no room). The lid leans back 25° and the
 * camera sits centred, just above the hinge, so the base opens evenly on
 * both sides; a soft shadow sits right under it. Everything is drawn at
 * fixed stage pixels and scaled once to the measured width. Colors come from
 * the `.auth-scene` vars (index.css).
 */

// Stage and laptop geometry, in stage pixels.
export const SCREEN_W = 1000;
export const SCREEN_H = 560;
const RIM = 3;
const BEZEL = { top: 24, side: 18, chin: 24 };
const LID_W = SCREEN_W + 2 * (BEZEL.side + RIM);
const LID_H = SCREEN_H + BEZEL.top + BEZEL.chin + RIM;
const DECK_D = 755;
const DECK_T = 20;
const LID_TILT = 25;
const PERSPECTIVE = 6600;
const GROUP_X = 79;
const GROUP_Y = -60;
const EYE_X = GROUP_X + LID_W / 2;
const EYE_Y = GROUP_Y + LID_H - 165;
export const STAGE_W = 1200;
export const STAGE_H = 640;

/** Scale factor that fits a fixed-size drawing into its measured container. */
function useFitScale(width: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return { ref, scale };
}

const face = (style: CSSProperties): CSSProperties => ({ position: 'absolute', ...style });

function Laptop3D({ children }: { children: ReactNode }) {
  const { ref, scale } = useFitScale(STAGE_W);
  return (
    <div ref={ref} className="relative w-full" style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}>
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
          perspective: `${PERSPECTIVE}px`,
          perspectiveOrigin: `${EYE_X}px ${EYE_Y}px`,
        }}
      >
        <div
          style={face({
            left: GROUP_X,
            top: GROUP_Y,
            width: LID_W,
            height: LID_H + DECK_T,
            transformStyle: 'preserve-3d',
          })}
        >
          {/* Sombra de contato sob a base */}
          <div
            style={face({
              left: -16,
              top: LID_H + DECK_T + 2,
              width: LID_W + 32,
              height: DECK_D + 44,
              transformOrigin: '50% 0',
              transform: 'translateZ(-16px) rotateX(90deg)',
              background: 'radial-gradient(ellipse closest-side, var(--laptop-shadow) 80%, transparent)',
            })}
          />

          {/* Base: tampo (teclado, trackpad) e frente com rebaixo */}
          <div
            style={face({
              left: 0,
              top: LID_H,
              width: LID_W,
              height: DECK_D,
              transformOrigin: '50% 0',
              transform: 'rotateX(90deg)',
              borderRadius: '0 0 24px 24px',
              background: 'linear-gradient(to bottom, var(--alu-lo), var(--alu) 8%, var(--alu-hi))',
            })}
          >
            <div style={face({ left: 90, right: 90, top: 50, height: 330, borderRadius: 10, background: 'rgba(0,0,0,0.22)' })} />
            <div
              style={face({ left: '50%', top: 420, width: 460, height: 270, marginLeft: -230, borderRadius: 14, background: 'rgba(255,255,255,0.25)' })}
            />
          </div>
          <div
            style={face({
              left: 0,
              top: LID_H,
              width: LID_W,
              height: DECK_T,
              transform: `translateZ(${DECK_D}px)`,
              borderRadius: '0 0 16px 16px',
              background: 'linear-gradient(to bottom, var(--alu-hi), var(--alu) 40%, var(--alu-lo))',
            })}
          >
            <div
              style={face({ left: '50%', top: 0, width: 170, height: 8, marginLeft: -85, borderRadius: '0 0 9px 9px', background: 'var(--alu-lo)', opacity: 0.75 })}
            />
          </div>

          {/* Tampa inclinada para trás: aro fino e vidro preto */}
          <div
            style={face({
              left: 0,
              top: 0,
              width: LID_W,
              height: LID_H,
              padding: `${RIM}px ${RIM}px 0`,
              borderRadius: '24px 24px 4px 4px',
              background: 'var(--lid-rim)',
              transformOrigin: '50% 100%',
              transform: `rotateX(${LID_TILT}deg)`,
            })}
          >
            <div
              className="relative h-full"
              style={{
                padding: `${BEZEL.top}px ${BEZEL.side}px ${BEZEL.chin}px`,
                borderRadius: '21px 21px 2px 2px',
                background: 'linear-gradient(to bottom, #080c0f 93%, #20262a)',
              }}
            >
              <span
                className="absolute left-1/2 block rounded-full"
                style={{ top: 9, width: 7, height: 7, marginLeft: -3.5, background: '#1d2226', boxShadow: '0 0 0 1.5px #2a3136' }}
              />
              <div className="relative overflow-hidden rounded-[3px] bg-black" style={{ width: SCREEN_W, height: SCREEN_H }}>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The laptop with a soft shadow directly beneath it: a wide, diffuse pool
 * plus a tighter contact band along the base's front edge.
 */
export function LaptopScene({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full">
      <div
        className="absolute left-[4%] right-[4%] top-[87%] h-[13%] rounded-[50%]"
        style={{ background: 'radial-gradient(closest-side, var(--laptop-shadow), transparent)', filter: `blur(${u(14)})` }}
      />
      <div
        className="absolute left-[5%] right-[5%] top-[91.8%] h-[2.6%] rounded-[50%]"
        style={{ background: 'var(--laptop-shadow)', opacity: 0.75, filter: `blur(${u(5)})` }}
      />
      <Laptop3D>{children}</Laptop3D>
    </div>
  );
}