import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Auth-flow text field, drawn directly over the dark showroom — no card.
 * Near-transparent surface, hairline border, matte-gold icons and a
 * discreet warm-gold focus glow in place of the app's global violet
 * focus ring — never blue.
 *
 * Colors are fixed (not theme tokens) because the auth flow lives on a
 * near-black surface independent of the app theme.
 */

interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ id, label, icon: Icon, error, className, type, ...props }, ref) => {
    const reduce = useReducedMotion() ?? false;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="space-y-2.5">
        <label htmlFor={id} className="block text-[13px] font-medium tracking-[0.02em] text-[#CFC9BC]">
          {label}
        </label>
        <div className="group relative">
          <Icon
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(232,216,176,0.5)] transition-colors duration-300 group-focus-within:text-[#E8D8B0]"
          />
          <input
            ref={ref}
            id={id}
            type={inputType}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              'h-14 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] pl-11 text-[15px] text-[#F1EDE4] caret-[#E8D8B0]',
              isPassword ? 'pr-12' : 'pr-4',
              'placeholder:text-[rgba(241,237,228,0.52)]',
              // Placeholder sobe 2px e esmaece quando o campo é iluminado
              '[&::placeholder]:transition-[opacity,transform] [&::placeholder]:duration-300',
              'focus:placeholder:-translate-y-0.5 focus:placeholder:opacity-60',
              'transition-[border-color,background-color,box-shadow] duration-300 ease-out',
              'hover:border-white/[0.16] hover:bg-white/[0.05]',
              'focus:border-[rgba(201,164,92,0.55)] focus:bg-white/[0.04] focus:shadow-[0_0_0_3px_rgba(201,164,92,0.10),0_0_26px_-6px_rgba(201,164,92,0.35),inset_0_0_18px_rgba(201,164,92,0.05)]',
              'focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
              // Autofill do navegador pintaria os campos de branco/amarelo claro
              '[&:-webkit-autofill]:[-webkit-box-shadow:inset_0_0_0_1000px_#101010]',
              '[&:-webkit-autofill]:[-webkit-text-fill-color:#F1EDE4]',
              error && 'border-[rgba(244,124,110,0.45)] bg-[rgba(244,124,110,0.05)]',
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              tabIndex={-1}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[rgba(232,216,176,0.5)] transition-colors duration-200 hover:text-[#E8D8B0] focus:text-[#E8D8B0] focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {error && (
            <motion.p
              id={`${id}-error`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduce ? 0.1 : 0.25, ease: 'easeOut' }}
              className="text-[13px] text-[#F0A9A0]"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

AnimatedInput.displayName = 'AnimatedInput';
