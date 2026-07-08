import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Primary auth action: a dark surface with internal illumination — a
 * whisper of the brand's petrol green in a near-black gradient, lit from
 * the top edge like a fixture housing. Hover: a band of light crosses
 * the face, a sheen over a metal finish. Loading: no spinner — a
 * horizontal light travels the button like an LED strip being energized.
 */

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

export function AnimatedButton({
  isLoading = false,
  loadingLabel = 'Aguarde…',
  children,
  className,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'group relative h-14 w-full overflow-hidden rounded-2xl',
        'border border-white/[0.08] bg-gradient-to-b from-[#2E443B] to-[#1A2620]',
        'text-[15px] font-medium tracking-[0.02em] text-[#F1EDE4]',
        'shadow-[0_16px_40px_-16px_rgba(46,84,66,0.5),0_18px_44px_-20px_rgba(0,0,0,0.9)]',
        'transition-[border-color,box-shadow,transform] duration-300 ease-out',
        'hover:-translate-y-0.5 hover:scale-[1.01] hover:border-white/[0.14] hover:shadow-[0_20px_48px_-14px_rgba(46,84,66,0.62),0_22px_50px_-20px_rgba(0,0,0,0.95)]',
        'active:translate-y-0 active:scale-[0.985] active:duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A45C]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070707]',
        'disabled:pointer-events-none disabled:opacity-75',
        className,
      )}
      {...props}
    >
      {/* Borda superior iluminada — hairline de luz no topo do acabamento */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-0 h-px"
        style={{
          background:
            'linear-gradient(to right, rgba(240,214,160,0) 0%, rgba(240,214,160,0.35) 50%, rgba(240,214,160,0) 100%)',
        }}
      />

      {/* Iluminação interna — luz quente descendo do topo do botão */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            'radial-gradient(ellipse 65% 90% at 50% -20%, rgba(240,214,160,0.13) 0%, rgba(240,214,160,0) 62%)',
        }}
      />

      {/* Sheen no hover — uma faixa de luz atravessa o acabamento */}
      {!reduce && !isLoading && (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <span className="absolute bottom-0 left-[-45%] top-0 w-[36%] -skew-x-12 transform-gpu bg-gradient-to-r from-transparent via-[rgba(240,214,160,0.16)] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[420%]" />
        </span>
      )}

      {/* Fita de LED energizando — loop durante a autenticação */}
      {!reduce && isLoading && (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <motion.span
            className="absolute bottom-0 top-0 w-1/3 bg-gradient-to-r from-transparent via-[rgba(240,214,160,0.2)] to-transparent will-change-transform"
            initial={{ x: '-120%' }}
            animate={{ x: '420%' }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      )}

      <span className="relative grid place-items-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={isLoading ? 'loading' : 'idle'}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduce ? 0.1 : 0.25, ease: 'easeOut' }}
            className="inline-flex items-center gap-2"
          >
            {isLoading ? loadingLabel : children}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
