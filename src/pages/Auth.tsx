import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { AuthShell } from '@/components/auth/AuthShell';
import { AnimatedInput } from '@/components/auth/AnimatedInput';
import { AnimatedButton } from '@/components/auth/AnimatedButton';
import { LedDivider } from '@/components/auth/LedDivider';
import { Reveal } from '@/components/auth/Reveal';
import { SEQ } from '@/components/auth/authMotion';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { z } from 'zod';


// Validation schemas
const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion() ?? false;

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
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Por favor, confirme seu email antes de fazer login');
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success('Login realizado com sucesso!');
      navigate('/operations', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#C9A45C]/70" />
      </div>
    );
  }

  return (
    <AuthShell
      logo={
        <img
          src="/logo-lumina-sidebar.png"
          alt="Lumina Lighting Design"
          className="h-20 w-auto object-contain sm:h-[5.5rem]"
          // The mark is black + petrol on transparent — retint it to warm
          // gold (#E8D8B0) so it reads as backlit signage, never pure white.
          style={{
            filter:
              'brightness(0) invert(0.9) sepia(0.55) saturate(1.25) brightness(1.02) drop-shadow(0 0 22px rgba(240,214,160,0.28))',
            opacity: 0.96,
          }}
        />
      }
      title="Bem-vindo(a) de volta"
      subtitle="Gerencie projetos, clientes e operações em um único lugar."
      footerNote={
        <>
          Não possui acesso? Solicite suas credenciais ao{' '}
          <span className="font-medium text-[#E8D8B0]">administrador</span>.
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Reveal delay={SEQ.fields}>
          <AnimatedInput
            id="email"
            label="E-mail"
            type="email"
            icon={Mail}
            placeholder="seu@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
        </Reveal>

        <Reveal delay={SEQ.fields + 0.12}>
          <AnimatedInput
            id="password"
            label="Senha"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
        </Reveal>

        <Reveal delay={SEQ.button} className="pt-1.5">
          <AnimatedButton type="submit" isLoading={isSubmitting} loadingLabel="Entrando…">
            Entrar
            <ArrowRight className="h-4 w-4" />
          </AnimatedButton>
        </Reveal>
      </form>

      <Reveal delay={SEQ.divider} className="mt-9">
        <LedDivider reduce={shouldReduceMotion} />
      </Reveal>
    </AuthShell>
  );
};

export default Auth;
