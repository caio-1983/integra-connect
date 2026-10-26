/**
 * User-level appearance preference: light/dark mode + brand palette.
 *
 * The neutrals stay WhatsApp Web in every palette; a palette only swaps the
 * brand color (primary, active chips, focus ring, sidebar highlight, first
 * chart series, the outgoing bubble). Status colors never change, so an alert
 * still reads as an alert.
 *
 * Source of truth is the user's row in `user_preferences` (follows them to
 * any computer). localStorage keeps a copy — including the resolved CSS
 * variables — so the inline script in index.html paints the right colors
 * before React mounts.
 */

export type ThemeMode = 'light' | 'dark';

export type PaletteId =
  | 'whatsapp' | 'ambar-lumina' | 'azul-oceano' | 'violeta' | 'rubi' | 'grafite'
  | 'petroleo' | 'marinho' | 'musgo' | 'cafe' | 'cobre' | 'magenta'
  | 'oceano' | 'violet' | 'emerald' | 'amber' | 'rose' | 'indigo';

export interface ThemeConfig {
  mode: ThemeMode;
  palette: PaletteId;
}

export interface PaletteMeta {
  id: PaletteId;
  label: string;
  /** 'atual' = proposed in Oct/2026; 'julho' = the July palettes, adjusted for contrast. */
  group: 'atual' | 'julho';
  /** Light: brand, text on the brand's subtle tint, outgoing bubble. */
  light: { primary: string; subtleForeground: string; out: string };
  /** Dark: brand, outgoing bubble (also the subtle tint). */
  dark: { primary: string; out: string };
}

/** Every primary passes WCAG AA (4.5:1) against white (light) and #111b21 (dark) text. */
export const PALETTES: PaletteMeta[] = [
  { id: 'whatsapp', label: 'Verde WhatsApp', group: 'atual', light: { primary: '#008069', subtleForeground: '#005c4b', out: '#d9fdd3' }, dark: { primary: '#00a884', out: '#005c4b' } },
  { id: 'ambar-lumina', label: 'Âmbar Lumina', group: 'atual', light: { primary: '#a35200', subtleForeground: '#7a3d00', out: '#ffefd1' }, dark: { primary: '#f2a93b', out: '#5c3a0c' } },
  { id: 'azul-oceano', label: 'Azul Oceano', group: 'atual', light: { primary: '#0b63b8', subtleForeground: '#084a8a', out: '#dcecfd' }, dark: { primary: '#5aa9f0', out: '#0d3a63' } },
  { id: 'violeta', label: 'Violeta', group: 'atual', light: { primary: '#6a46c2', subtleForeground: '#4d2f99', out: '#ece5ff' }, dark: { primary: '#a68cf2', out: '#3b2a6b' } },
  { id: 'rubi', label: 'Rubi', group: 'atual', light: { primary: '#a8234c', subtleForeground: '#7d1838', out: '#fde3ea' }, dark: { primary: '#f07a9a', out: '#5e1a2f' } },
  { id: 'grafite', label: 'Grafite', group: 'atual', light: { primary: '#37474f', subtleForeground: '#263238', out: '#e7ecef' }, dark: { primary: '#b8c4ca', out: '#2f3d45' } },
  { id: 'petroleo', label: 'Petróleo', group: 'atual', light: { primary: '#0f5f6b', subtleForeground: '#0a444d', out: '#d8eff1' }, dark: { primary: '#4fb8c4', out: '#0e3f46' } },
  { id: 'marinho', label: 'Marinho', group: 'atual', light: { primary: '#1f3a8a', subtleForeground: '#172c69', out: '#e0e7fb' }, dark: { primary: '#8aa8f0', out: '#1e2f5e' } },
  { id: 'musgo', label: 'Musgo', group: 'atual', light: { primary: '#4d6b1f', subtleForeground: '#3a5117', out: '#e8f0d8' }, dark: { primary: '#a8c66c', out: '#33451a' } },
  { id: 'cafe', label: 'Café', group: 'atual', light: { primary: '#7a4a2a', subtleForeground: '#5c371f', out: '#f3e6da' }, dark: { primary: '#d9a77c', out: '#4a3020' } },
  { id: 'cobre', label: 'Cobre', group: 'atual', light: { primary: '#a14a2a', subtleForeground: '#7a381f', out: '#fbe5da' }, dark: { primary: '#ec9670', out: '#5a2a18' } },
  { id: 'magenta', label: 'Magenta', group: 'atual', light: { primary: '#a3168a', subtleForeground: '#7a1068', out: '#fbe1f5' }, dark: { primary: '#e77fd1', out: '#55124a' } },
  { id: 'oceano', label: 'Oceano', group: 'julho', light: { primary: '#08758a', subtleForeground: '#065766', out: '#d6f1f5' }, dark: { primary: '#3cc6dd', out: '#0b3f49' } },
  { id: 'violet', label: 'Violeta clássico', group: 'julho', light: { primary: '#7c3aed', subtleForeground: '#5b21b6', out: '#efe6ff' }, dark: { primary: '#a78bfa', out: '#3b2670' } },
  { id: 'emerald', label: 'Esmeralda', group: 'julho', light: { primary: '#047857', subtleForeground: '#065f46', out: '#d8f5e9' }, dark: { primary: '#34d399', out: '#0b4a37' } },
  { id: 'amber', label: 'Âmbar', group: 'julho', light: { primary: '#b45309', subtleForeground: '#8a3f06', out: '#fdecd3' }, dark: { primary: '#f5a623', out: '#573a0d' } },
  { id: 'rose', label: 'Rosé', group: 'julho', light: { primary: '#c81e4a', subtleForeground: '#9b1639', out: '#fde3ea' }, dark: { primary: '#f0577a', out: '#5c1426' } },
  { id: 'indigo', label: 'Índigo', group: 'julho', light: { primary: '#4f46e5', subtleForeground: '#3730a3', out: '#e6e6fd' }, dark: { primary: '#8285f4', out: '#2a2a70' } },
];

export const DEFAULT_THEME: ThemeConfig = { mode: 'light', palette: 'whatsapp' };

const STORAGE_KEY = 'ic_theme_v1';

const isPalette = (id: unknown): id is PaletteId => PALETTES.some((p) => p.id === id);

/** Coerces anything stored (localStorage or the database) into a valid config. */
export function normalizeThemeConfig(raw: unknown): ThemeConfig {
  const value = (raw ?? {}) as Partial<ThemeConfig>;
  return {
    mode: value.mode === 'dark' ? 'dark' : 'light',
    // July saves stored 'oceano' etc. — still valid ids, so they come back.
    palette: isPalette(value.palette) ? value.palette : DEFAULT_THEME.palette,
  };
}

export function getThemeConfig(): ThemeConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_THEME };
  try {
    return normalizeThemeConfig(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    return { ...DEFAULT_THEME };
  }
}

/** `#rrggbb` → the `h s% l%` triplet the shadcn tokens in index.css use. */
function hexToHslTriplet(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return `${Math.round(h)} ${Math.round(s * 1000) / 10}% ${Math.round(l * 1000) / 10}%`;
}

/**
 * CSS variables a palette sets on <html>. For the default palette only the
 * sidebar tint: index.css already holds the WhatsApp brand values.
 */
export function paletteVariables(config: ThemeConfig): Record<string, string> {
  const p = PALETTES.find((x) => x.id === config.palette)!;
  const dark = config.mode === 'dark';
  // The sidebar surface carries a hint of the brand in every palette, the
  // default included, so switching palettes visibly changes the whole shell.
  const sidebar = {
    '--sidebar-bg': `color-mix(in oklab, ${dark ? p.dark.primary : p.light.primary} ${dark ? 10 : 6}%, hsl(var(--sidebar-background)))`,
  };
  if (config.palette === DEFAULT_THEME.palette) return sidebar;
  const primary = hexToHslTriplet(dark ? p.dark.primary : p.light.primary);
  const onPrimary = dark ? '203 32% 10%' : '0 0% 100%';
  const out = dark ? p.dark.out : p.light.out;
  return {
    ...sidebar,
    '--primary': primary,
    '--primary-foreground': onPrimary,
    '--primary-subtle': hexToHslTriplet(out),
    '--primary-subtle-foreground': dark ? primary : hexToHslTriplet(p.light.subtleForeground),
    '--ring': primary,
    '--sidebar-primary': primary,
    '--sidebar-primary-foreground': onPrimary,
    '--sidebar-ring': primary,
    '--chart-1': primary,
    // Read by .chat-wall (index.css), which otherwise keeps WhatsApp's own green.
    '--palette-wa-out': out,
    '--palette-wa-action': dark ? p.dark.primary : p.light.primary,
  };
}

/** Every variable any palette may set — cleared before applying the next one. */
const PALETTE_VARIABLE_NAMES = Object.keys(paletteVariables({ mode: 'light', palette: 'violeta' }));

export function saveThemeConfig(config: ThemeConfig): void {
  if (typeof window === 'undefined') return;
  try {
    // `vars` is for the pre-paint script in index.html, which can't import this module.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, vars: paletteVariables(config) }));
  } catch {
    /* storage unavailable (private mode / quota) — non-fatal */
  }
}

/** Applies a theme to <html>: toggles `.dark` and sets the palette's variables. */
export function applyThemeToDocument(config: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', config.mode === 'dark');
  root.dataset.palette = config.palette;
  PALETTE_VARIABLE_NAMES.forEach((name) => root.style.removeProperty(name));
  Object.entries(paletteVariables(config)).forEach(([name, value]) => root.style.setProperty(name, value));
}
