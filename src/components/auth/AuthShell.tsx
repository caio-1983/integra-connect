import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import '@fontsource-variable/fraunces';
import { LumeLamp } from './LumeLamp';

interface AuthShellProps {
  logo: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
  footerNote?: ReactNode;
}

/**
 * Shared "Spotlight Card" shell for the auth flow (login + forced password
 * change): a warm, near-black canvas lit by an original desk-lamp
 * illustration (see LumeLamp) whose glow reveals a light card floating above
 * it — the only surface the real (light-background) Lumina logo can sit on.
 */
export function AuthShell({ logo, title, subtitle, children, footerNote }: AuthShellProps) {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp = (delay: number, duration = 0.5) => ({
    initial: shouldReduceMotion ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: shouldReduceMotion ? 0 : duration,
      delay: shouldReduceMotion ? 0 : delay,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0E0C09] p-4">
      {/* Decorative layers — canvas depth, spotlight glow, vignette, lamp */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,#1A140D_0%,#0E0C09_60%)]" />
        {/* Static wrapper handles centering; framer-motion's inline transform on the
            child would otherwise clobber a translate-x utility placed on the same element. */}
        <div className="absolute left-1/2 top-[2%] h-[55vh] w-[130vw] max-w-[860px] -translate-x-1/2">
          <motion.div
            className="h-full w-full rounded-full bg-[radial-gradient(circle,#FCE8BE_0%,#E8A33C_24%,transparent_68%)] blur-[90px]"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 0.55, scale: 1 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.7,
              delay: shouldReduceMotion ? 0 : 0.55,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_20%,transparent_40%,#050403_100%)]" />
        <LumeLamp />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <motion.div {...fadeUp(0.55)} className="mb-4 flex justify-center">
            {logo}
          </motion.div>
          <motion.h1
            {...fadeUp(0.62)}
            className="font-[Fraunces_Variable,Georgia,serif] text-3xl font-semibold text-[#F5EFE6]"
          >
            {title}
          </motion.h1>
          <motion.p {...fadeUp(0.68)} className="mt-2 text-[#C9BFB0]">
            {subtitle}
          </motion.p>
        </div>

        <motion.div
          {...fadeUp(0.72, 0.6)}
          className="rounded-2xl border border-border bg-card p-8 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(232,163,60,0.18)]"
        >
          {children}
        </motion.div>

        {footerNote && (
          <motion.p {...fadeUp(0.85)} className="mt-6 text-center text-xs text-[#A89A85]">
            {footerNote}
          </motion.p>
        )}
      </div>
    </div>
  );
}
