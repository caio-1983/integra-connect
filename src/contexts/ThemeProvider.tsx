import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  type ThemeConfig,
  type ThemeMode,
  applyThemeToDocument,
  getThemeConfig,
  saveThemeConfig,
} from '@/services/themeConfigService';

interface ThemeContextValue extends ThemeConfig {
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Owns the appearance state (light/dark). Reads the saved config on
 * mount and, on every change, applies it to <html> and persists it. An inline
 * script in index.html applies the same saved config before first paint so
 * there's no flash before this provider mounts.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ThemeConfig>(() => getThemeConfig());

  useEffect(() => {
    applyThemeToDocument(config);
    saveThemeConfig(config);
  }, [config]);

  const setMode = useCallback((mode: ThemeMode) => setConfig((c) => ({ ...c, mode })), []);
  const toggleMode = useCallback(
    () => setConfig((c) => ({ ...c, mode: c.mode === 'dark' ? 'light' : 'dark' })),
    [],
  );

  return (
    <ThemeContext.Provider value={{ ...config, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
