/**
 * User-level appearance preference (palette + light/dark), persisted client-side
 * in localStorage — mirrors the config-service shape used by aiConfigService.
 * The chosen palette maps to the [data-palette="…"] CSS blocks in index.css and
 * the mode toggles the `.dark` class. Company-wide defaults could later live in
 * Supabase, but per-user UI prefs belong on the device.
 */

export type ThemeMode = 'light' | 'dark';
export type PaletteId = 'oceano' | 'violet' | 'emerald' | 'amber' | 'rose' | 'indigo';

export interface ThemeConfig {
  palette: PaletteId;
  mode: ThemeMode;
}

export const DEFAULT_THEME: ThemeConfig = { palette: 'oceano', mode: 'light' };

const STORAGE_KEY = 'ic_theme_v1';

export function getThemeConfig(): ThemeConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_THEME };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
    return { ...DEFAULT_THEME, ...parsed };
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

export interface PaletteMeta {
  id: PaletteId;
  label: string;
  /** Preview swatch (light-mode primary/accent) shown in the picker. */
  swatch: { primary: string; accent: string };
}

/** Keep in sync with the [data-palette="…"] blocks in index.css. */
export const PALETTES: PaletteMeta[] = [
  { id: 'oceano',  label: 'Oceano',    swatch: { primary: 'hsl(188 95% 36%)', accent: 'hsl(263 70% 50%)' } },
  { id: 'violet',  label: 'Violeta',   swatch: { primary: 'hsl(263 70% 50%)', accent: 'hsl(280 65% 58%)' } },
  { id: 'emerald', label: 'Esmeralda', swatch: { primary: 'hsl(160 84% 39%)', accent: 'hsl(173 80% 36%)' } },
  { id: 'amber',   label: 'Âmbar',     swatch: { primary: 'hsl(32 95% 44%)',  accent: 'hsl(20 90% 50%)' } },
  { id: 'rose',    label: 'Rosé',      swatch: { primary: 'hsl(346 77% 50%)', accent: 'hsl(330 75% 55%)' } },
  { id: 'indigo',  label: 'Índigo',    swatch: { primary: 'hsl(239 84% 57%)', accent: 'hsl(217 91% 55%)' } },
];

/** Applies a theme to <html>: toggles `.dark` and stamps `data-palette`. */
export function applyThemeToDocument(config: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', config.mode === 'dark');
  root.dataset.palette = config.palette;
}
