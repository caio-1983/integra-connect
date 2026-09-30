import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes, KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Eye, EyeOff, ArrowBigUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { u } from './authUnit';

/**
 * Auth-flow text field on the design-system form field (`input` outline),
 * sized to the comp (51px tall, 10px radius) with an optional leading icon.
 * Password fields get a keyboard-reachable reveal toggle and a Caps Lock
 * notice; errors sit under the field and are wired through aria-describedby
 * so focusing the field announces them.
 */

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  icon?: LucideIcon;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ id, label, error, icon: Icon, type, className, onKeyUp, onBlur, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const describedBy =
      [error && `${id}-error`, isPassword && capsLock && `${id}-caps`].filter(Boolean).join(' ') || undefined;

    const handleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
      if (isPassword) setCapsLock(e.getModifierState('CapsLock'));
      onKeyUp?.(e);
    };

    const iconSize = { width: u(20, 18), height: u(20, 18) };

    return (
      <div className="flex flex-col" style={{ gap: u(10, 8) }}>
        <label htmlFor={id} className="block font-medium leading-[1.2] text-foreground" style={{ fontSize: u(18, 14) }}>
          {label}
        </label>
        <div className="relative">
          {Icon && (
            <Icon
              aria-hidden
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-icon"
              style={{ left: u(20, 14), ...iconSize }}
            />
          )}
          <Input
            ref={ref}
            id={id}
            type={inputType}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onKeyUp={handleKeyUp}
            onBlur={(e) => {
              setCapsLock(false);
              onBlur?.(e);
            }}
            className={cn(
              'rounded-[10px] placeholder:text-muted-foreground/80 focus-visible:ring-offset-0',
              error && 'border-danger focus-visible:ring-danger',
              className,
            )}
            style={{
              height: u(51, 44),
              fontSize: u(18, 15),
              paddingLeft: Icon ? u(58, 44) : u(18, 14),
              paddingRight: isPassword ? u(58, 48) : u(18, 14),
            }}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              className="absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full text-icon transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-offset-0"
              style={{ right: u(10, 6), width: u(40, 36), height: u(40, 36) }}
            >
              {showPassword ? <EyeOff style={{ width: u(22, 18), height: u(22, 18) }} /> : <Eye style={{ width: u(22, 18), height: u(22, 18) }} />}
            </button>
          )}
        </div>
        {isPassword && capsLock && (
          <p id={`${id}-caps`} className="flex items-center gap-1.5 text-[13px] text-warning">
            <ArrowBigUp aria-hidden className="h-4 w-4 shrink-0" />
            Caps Lock está ativado
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-[13px] text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);

AuthField.displayName = 'AuthField';
