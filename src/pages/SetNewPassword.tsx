import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { AnimatedInput } from '@/components/auth/AnimatedInput';
import { AnimatedButton } from '@/components/auth/AnimatedButton';
import { Reveal } from '@/components/auth/Reveal';
import { SEQ } from '@/components/auth/authMotion';
import { toast } from 'sonner';
import { Lock, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

const SetNewPassword: React.FC = () => {
  const { user, loading, mustChangePassword, refreshMustChangePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#C9A45C]/70" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!mustChangePassword) {
    return <Navigate to="/operations" replace />;
  }

  const validateForm = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      // `must_change_password` isn't in the generated Supabase types yet (new column) — cast to
      // bypass the typed table union until types are regenerated.
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ must_change_password: false })
        .eq('user_id', user.id);

      if (profileError) {
        toast.error('Senha alterada, mas houve um erro ao atualizar o status. Tente recarregar a página.');
        return;
      }

      await refreshMustChangePassword();
      toast.success('Senha atualizada com sucesso!');
      navigate('/operations', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      logo={
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_0_44px_-10px_rgba(242,234,219,0.28)] backdrop-blur">
          <ShieldCheck className="h-7 w-7 text-[#C9A45C]" />
        </div>
      }
      title="Defina sua nova senha"
      subtitle="Sua conta foi criada com uma senha temporária. Escolha uma nova senha para continuar."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Reveal delay={SEQ.fields}>
          <AnimatedInput
            id="password"
            label="Nova senha"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
        </Reveal>

        <Reveal delay={SEQ.fields + 0.12}>
          <AnimatedInput
            id="confirmPassword"
            label="Confirmar nova senha"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />
        </Reveal>

        <Reveal delay={SEQ.button} className="pt-1.5">
          <AnimatedButton type="submit" isLoading={isSubmitting} loadingLabel="Salvando…">
            Salvar nova senha
            <ArrowRight className="h-4 w-4" />
          </AnimatedButton>
        </Reveal>
      </form>
    </AuthShell>
  );
};

export default SetNewPassword;
