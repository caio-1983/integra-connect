import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshMustChangePassword: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const fetchMustChangePassword = useCallback(async (userId: string) => {
    // `must_change_password` isn't in the generated Supabase types yet (new column) — cast to
    // bypass the typed table union until types are regenerated.
    const { data } = await (supabase as any)
      .from('profiles')
      .select('must_change_password')
      .eq('user_id', userId)
      .maybeSingle();
    setMustChangePassword(!!(data as { must_change_password?: boolean } | null)?.must_change_password);
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          fetchMustChangePassword(session.user.id);
        } else {
          setMustChangePassword(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchMustChangePassword(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchMustChangePassword]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    // supabase.auth.signOut() resolve sem lançar: erros (rede, 5xx, refresh
    // inválido) voltam em `error` e, nesses casos, o auth-js 2.84 NÃO remove a
    // sessão local (só ignora 401/403/404) — o usuário veria "logout com
    // sucesso" e continuaria logado, qualquer que fosse o scope.
    const { error } = await supabase.auth.signOut();
    if (error) {
      // Último recurso: apaga a sessão persistida e recarrega o app limpo.
      // `storageKey` é propriedade protegida do client, mas existe em runtime.
      const storageKey =
        (supabase.auth as unknown as { storageKey?: string }).storageKey ??
        `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}-code-verifier`);
      window.location.replace('/auth');
    }
  };

  const refreshMustChangePassword = useCallback(async () => {
    if (user) {
      await fetchMustChangePassword(user.id);
    }
  }, [user, fetchMustChangePassword]);

  return (
    <AuthContext.Provider value={{ user, session, loading, mustChangePassword, signIn, signOut, refreshMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
