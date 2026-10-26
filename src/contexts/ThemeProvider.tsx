import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  type PaletteId,
  type ThemeConfig,
  type ThemeMode,
  applyThemeToDocument,
  getThemeConfig,
  normalizeThemeConfig,
  saveThemeConfig,
} from '@/services/themeConfigService';

interface ThemeContextValue extends ThemeConfig {
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setPalette: (palette: PaletteId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// user_preferences is newer than the generated Supabase types.
const preferences = () => (supabase as any).from('user_preferences');

/**
 * Owns the appearance state (mode + palette). Applies it to <html> and keeps
 * a localStorage copy for the pre-paint script in index.html. The user's row
 * in `user_preferences` is the source of truth: loaded on sign-in, written on
 * every change the user makes — so the choice follows them to any computer.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ThemeConfig>(() => getThemeConfig());
  const userId = useRef<string | null>(null);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
    applyThemeToDocument(config);
    saveThemeConfig(config);
  }, [config]);

  useEffect(() => {
    const load = async (id: string | null) => {
      userId.current = id;
      if (!id) return;
      const { data, error } = await preferences().select('theme').eq('user_id', id).maybeSingle();
      if (error) { console.error('[ThemeProvider] failed to load preferences:', error); return; }
      // No row yet: keep what this browser has; it is saved on the first change.
      if (data?.theme && Object.keys(data.theme).length) setConfig(normalizeThemeConfig(data.theme));
    };
    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') load(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /** Applies locally right away; the database write is best effort. */
  const update = useCallback((change: (c: ThemeConfig) => ThemeConfig) => {
    const next = change(configRef.current);
    configRef.current = next;
    setConfig(next);
    if (userId.current) {
      preferences()
        .upsert({ user_id: userId.current, theme: next, updated_at: new Date().toISOString() })
        .then(({ error }: { error: unknown }) => { if (error) console.error('[ThemeProvider] failed to save preferences:', error); });
    }
  }, []);

  const setMode = useCallback((mode: ThemeMode) => update((c) => ({ ...c, mode })), [update]);
  const toggleMode = useCallback(() => update((c) => ({ ...c, mode: c.mode === 'dark' ? 'light' : 'dark' })), [update]);
  const setPalette = useCallback((palette: PaletteId) => update((c) => ({ ...c, palette })), [update]);

  return (
    <ThemeContext.Provider value={{ ...config, setMode, toggleMode, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
