/**
 * Comp-pixel sizing for the auth screen. The approved comp is 1791×878 and
 * `--u` (set by `.auth-u` on AuthShell) is one comp pixel at the current
 * viewport, so `u(62)` is the comp's 62px title at any screen size. Pass a
 * floor for anything that must stay usable on small screens.
 */
export const u = (px: number, min?: number) =>
  min === undefined ? `calc(var(--u) * ${px})` : `max(${min}px, calc(var(--u) * ${px}))`;
