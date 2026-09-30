import type { ReactNode } from 'react';
import { AuthShowcase } from './AuthShowcase';
import { u } from './authUnit';

interface AuthShellProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * Shared shell for the auth flow (login + forced password change), built to
 * the approved comp: a white form column (42%) that dominates, and from lg a
 * product presentation (<AuthShowcase>). Sizes are in comp pixels (`u`), with
 * floors so the form stays usable on small screens, where only it renders.
 */
export function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <div className="auth-u grid min-h-screen bg-card lg:grid-cols-[42.1fr_57.9fr]">
      <div
        className="flex min-h-screen flex-col"
        style={{ padding: `${u(57, 24)} ${u(84, 24)} ${u(40, 24)}` }}
      >
        <div className="flex items-center">
          <img
            src="/logo-lumina-sidebar.png"
            alt="Lumina"
            className="w-auto object-contain dark:brightness-0 dark:invert"
            style={{ height: u(63, 40), marginLeft: u(-7) }}
          />
          <span aria-hidden className="w-px bg-border" style={{ height: u(30, 22), margin: `0 ${u(26, 14)} 0 ${u(20, 12)}` }} />
          <span className="font-semibold tracking-[-0.01em] text-foreground" style={{ fontSize: u(21, 15) }}>
            Integra Connect
          </span>
        </div>

        <main
          className="flex w-full flex-1 flex-col justify-center"
          style={{ maxWidth: `max(min(100%, 380px), ${u(555)})`, paddingBottom: u(34, 16) }}
        >
          {eyebrow && (
            <p
              className="font-semibold uppercase leading-none tracking-[0.3em] text-muted-foreground"
              style={{ fontSize: u(12.5, 11) }}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className="font-bold leading-[1.08] tracking-[-0.035em] text-foreground [text-wrap:balance]"
            style={{ fontSize: u(64, 34), marginTop: u(11, 10) }}
          >
            {title}
          </h1>
          <p
            className="leading-[1.3] text-muted-foreground [text-wrap:pretty]"
            style={{ fontSize: u(21, 16), marginTop: u(10, 8), maxWidth: `max(min(100%, 380px), ${u(495)})` }}
          >
            {subtitle}
          </p>

          <div style={{ marginTop: u(39, 28) }}>{children}</div>
        </main>

        <p className="text-muted-foreground" style={{ fontSize: u(14, 12) }}>
          © {new Date().getFullYear()} Integra Solutions. Todos os direitos reservados.
        </p>
      </div>

      <AuthShowcase />
    </div>
  );
}
