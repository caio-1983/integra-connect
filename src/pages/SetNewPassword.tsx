import React, { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { u } from '@/components/auth/authUnit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

const SetNewPassword: React.FC = () => {
  const { user, loading, mustChangePassword, refreshMustChangePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 aria-label="Carregando" className="h-6 w-6 animate-spin text-muted-foreground" />
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
    if (newErrors.password) passwordRef.current?.focus();
    else if (newErrors.confirmPassword) confirmRef.current?.focus();
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        console.error('[auth] updateUser failed:', updateError);
        setFormError(
          /same|different from the old/i.test(updateError.message)
            ? 'A nova senha precisa ser diferente da senha temporária.'
            : /weak|characters/i.test(updateError.message)
              ? 'Senha fraca. Use pelo menos 6 caracteres, misturando letras e números.'
              : 'Não foi possível salvar a senha agora. Tente de novo em instantes.',
        );
        return;
      }

      // `must_change_password` isn't in the generated Supabase types yet (new column) — cast to
      // bypass the typed table union until types are regenerated.
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ must_change_password: false })
        .eq('user_id', user.id);

      if (profileError) {
        setFormError('Senha alterada, mas houve um erro ao atualizar o status. Recarregue a página para continuar.');
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
      title="Defina sua nova senha"
      subtitle="Sua conta foi criada com uma senha temporária. Escolha uma nova senha para continuar."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col" style={{ gap: u(26, 16) }}>
        <AuthField
          ref={passwordRef}
          id="password"
          label="Nova senha"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            setFormError(null);
          }}
          error={errors.password}
        />

        <AuthField
          ref={confirmRef}
          id="confirmPassword"
          label="Confirmar nova senha"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            setFormError(null);
          }}
          error={errors.confirmPassword}
        />

        <div>
          <AuthAlert message={formError} />
          <Button type="submit" size="lg" className="w-full" style={{ height: u(54, 46), fontSize: u(19, 15) }} disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden className="animate-spin" />
                Salvando…
              </>
            ) : (
              'Salvar nova senha'
            )}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
};

export default SetNewPassword;
