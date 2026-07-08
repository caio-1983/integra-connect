import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import '@fontsource-variable/fraunces';
import { BackgroundLighting } from './BackgroundLighting';
import { LightBeam } from './LightBeam';
import { FloatingParticles } from './FloatingParticles';
import { MouseLight } from './MouseLight';
import { AnimatedLogo } from './AnimatedLogo';
import { reveal, SEQ } from './authMotion';

interface AuthShellProps {
  logo: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
  footerNote?: ReactNode;
}

/**
 * Shared shell for the auth flow (login + forced password change),
 * staged as the entrance of a lighting showroom: a near-black envelope
 * with blurred architecture, a ceiling spot switching on, the brand
 * emerging backlit under 2700K light, and the form drawn directly on
 * the wall — no card. Pages stagger their own fields with <Reveal>;
 * all timing lives in authMotion.ts and the whole sequence collapses
 * to an instant render under reduced motion.
 */
export function AuthShell({ logo, title, subtitle, children, footerNote }: AuthShellProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070707] px-4 py-14">
      <BackgroundLighting reduce={reduce} />
      <LightBeam reduce={reduce} />
      <FloatingParticles reduce={reduce} />
      <MouseLight reduce={reduce} />

      <div className="relative z-10 w-full max-w-[30rem]">
        <header className="mb-12 text-center">
          <AnimatedLogo reduce={reduce}>{logo}</AnimatedLogo>

          <motion.h1
            {...reveal(reduce, SEQ.title)}
            // Inline style: Tailwind's arbitrary font-[...] class fails to emit
            // this family (comma-separated arbitrary value), so the serif was
            // silently falling back to the sans stack.
            style={{ fontFamily: "'Fraunces Variable', Georgia, serif" }}
            className="mt-7 text-[2.1rem] font-semibold leading-tight text-[#F2EEE3] [text-wrap:balance] sm:text-[2.35rem]"
          >
            {title}
          </motion.h1>

          <motion.p
            {...reveal(reduce, SEQ.subtitle)}
            className="mx-auto mt-4 text-[15px] leading-relaxed text-[#BFB9AC]"
          >
            {subtitle}
          </motion.p>
        </header>

        {/* Plano invisível: o formulário nasce da luz — um glow radial quase
            imperceptível e uma lâmina de vidro que o cérebro percebe como um
            plano separado do ambiente, sem nunca virar um card. Entra na
            sequência e depois flutua ±3px num loop de 18s. */}
        <motion.div {...reveal(reduce, SEQ.plane)} className="relative">
          <motion.div
            className="relative will-change-transform"
            animate={reduce ? undefined : { y: [0, -3, 0] }}
            transition={reduce ? { duration: 0 } : { duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              aria-hidden
              className="absolute -inset-x-10 -inset-y-8"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,220,160,0.05) 0%, rgba(255,220,160,0) 70%)',
              }}
            />
            <div className="relative rounded-3xl border border-white/[0.04] bg-white/[0.015] p-7 backdrop-blur-[12px] sm:p-8">
              {children}
            </div>
          </motion.div>
        </motion.div>

        {footerNote && (
          <motion.p
            {...reveal(reduce, SEQ.footer, { y: 8 })}
            className="mx-auto mt-9 text-center text-[13px] leading-relaxed text-[#9A948A]"
          >
            {footerNote}
          </motion.p>
        )}
      </div>
    </div>
  );
}
