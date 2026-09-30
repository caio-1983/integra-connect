import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { u } from '@/components/auth/authUnit';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import { z } from 'zod';


// Validation schemas
const emailSchema = z.string().trim().min(1, 'Informe seu e-mail').email('Confira o e-mail: falta algo como nome@empresa.com');
const passwordSchema = z.string().min(1, 'Informe sua senha');

/** Traduz os erros do Supabase Auth para uma frase com o próximo passo. */
function signInErrorMessage(error: Error & { status?: number }): string {
  const msg = error.message ?? '';
  if (msg.includes('Invalid login credentials')) {
    return 'E-mail ou senha incorretos. Confira e tente de novo.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Este e-mail ainda não foi confirmado. Peça ao gestor da sua equipe para liberar o acesso.';
  }
  if (error.status === 429 || /rate limit|too many/i.test(msg)) {
    return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  }
  if (/fetch|network/i.test(msg)) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  }
  console.error('[auth] signIn failed:', error);
  return 'Não foi possível entrar agora. Tente de novo em instantes.';
}

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Não há fluxo de redefinição no projeto: o link explica o caminho.
  const [showForgot, setShowForgot] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/operations', { replace: true });
    }
  }, [user, loading, navigate]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    setErrors(newErrors);
    if (newErrors.email) emailRef.current?.focus();
    else if (newErrors.password) passwordRef.current?.focus();
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setFormError(signInErrorMessage(error));
        // Senha errada é o caso mais comum: deixa pronta para redigitar.
        passwordRef.current?.focus();
        passwordRef.current?.select();
        return;
      }
      navigate('/operations', { replace: true });
    } catch (err) {
      setFormError(signInErrorMessage(err as Error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 aria-label="Carregando" className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow="Bem-vindo(a)"
      title="Acesse sua conta"
      subtitle="Converse com seus clientes, gerencie oportunidades e aumente suas vendas em um só lugar."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col" style={{ gap: u(26, 16) }}>
        <AuthField
          ref={emailRef}
          id="email"
          label="E-mail"
          icon={Mail}
          type="email"
          inputMode="email"
          placeholder="seu@empresa.com"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            setFormError(null);
          }}
          error={errors.email}
        />

        <AuthField
          ref={passwordRef}
          id="password"
          label="Senha"
          icon={Lock}
          type="password"
          placeholder="Sua senha"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            setFormError(null);
          }}
          error={errors.password}
        />

        <div style={{ marginTop: u(-3) }}>
          <AuthAlert message={formError} />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            style={{ height: u(54, 46), fontSize: u(19, 15) }}
            disabled={isSubmitting}
            aria-busy={isSubmitting || undefined}
          >
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden className="animate-spin" />
                Entrando…
              </>
            ) : (
              <>
                Entrar
                <ArrowRight aria-hidden style={{ width: u(21, 16), height: u(21, 16) }} />
              </>
            )}
          </Button>

          <div className="text-center" style={{ marginTop: u(13, 12) }}>
            <button
              type="button"
              onClick={() => setShowForgot((v) => !v)}
              aria-expanded={showForgot}
              aria-controls="auth-notice"
              className="rounded font-medium text-primary underline-offset-4 hover:underline"
              style={{ fontSize: u(15, 13) }}
            >
              Esqueceu a senha?
            </button>
            <p id="auth-notice" role="status" className="mt-2 text-[13px] leading-5 text-muted-foreground empty:hidden">
              {showForgot && 'Para redefinir sua senha, peça ao gestor da sua equipe.'}
            </p>
          </div>
        </div>
      </form>
    </AuthShell>
  );
};

export default Auth;
