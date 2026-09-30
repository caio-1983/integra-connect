/**
 * User-level appearance preference (light/dark), persisted client-side in
 * localStorage — mirrors the config-service shape used by aiConfigService.
 * The app has a single visual language (WhatsApp Web); the mode toggles the
 * `.dark` class. Per-user UI prefs belong on the device.
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  mode: ThemeMode;
}

export const DEFAULT_THEME: ThemeConfig = { mode: 'light' };

const STORAGE_KEY = 'ic_theme_v1';

export function getThemeConfig(): ThemeConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_THEME };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    // Older saves also carry `palette` — ignored since palettes were retired.
    const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
    return { mode: parsed.mode === 'dark' ? 'dark' : 'light' };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export function saveThemeConfig(config: ThemeConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* storage unavailable (private mode / quota) — non-fatal */
  }
}

/** Applies a theme to <html> by toggling `.dark`. */
export function applyThemeToDocument(config: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', config.mode === 'dark');
  delete root.dataset.palette;
}
