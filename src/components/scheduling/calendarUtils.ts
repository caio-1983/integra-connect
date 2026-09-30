import type { Appointment } from '@/types';

export type ViewMode = 'month' | 'week' | 'day';

/** `YYYY-MM-DD` in local time — `toISOString` would give the UTC date (tomorrow after 21h in Brazil). */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Weeks start on Sunday, as in the Brazilian calendar. */
export function startOfWeek(d: Date): Date {
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -d.getDay());
}

export const sameDay = (a: Date, b: Date) => ymd(a) === ymd(b);

/** Postgres `time` comes back as HH:MM:SS; the UI works in HH:MM. */
export const hhmm = (t: string) => (t || '00:00').slice(0, 5);

export const toMinutes = (t: string) => {
  const [h, m] = hhmm(t).split(':').map(Number);
  return h * 60 + (m || 0);
};

export const fromMinutes = (total: number) => {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

export const endTime = (a: Pick<Appointment, 'time' | 'duration'>) => fromMinutes(toMinutes(a.time) + (a.duration || 60));

export function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** 42 days (6 weeks) covering the month, starting on the Sunday before the 1st. */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const weeks = Math.ceil((first.getDay() + last.getDate()) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
}

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One hue per person, assigned by position in the team list so two people
 * never share a colour while the team fits. Categorical on purpose — these are
 * the only non-token colours in the Agenda, each with a dark-mode variant.
 */
export const PERSON_COLORS = [
  // Only hues far apart on the colour wheel (amber/orange, sky/cyan/blue read as
  // the same person), ordered so the first people get the most distinct ones:
  // blue 217° · amber 38° · rose 350° · teal 173° · violet 258° · lime 84° · fuchsia 292°.
  { dot: 'bg-blue-500', soft: 'bg-blue-100 text-blue-950 hover:bg-blue-200 dark:bg-blue-400/20 dark:text-blue-50 dark:hover:bg-blue-400/30' },
  { dot: 'bg-amber-500', soft: 'bg-amber-100 text-amber-950 hover:bg-amber-200 dark:bg-amber-400/20 dark:text-amber-50 dark:hover:bg-amber-400/30' },
  { dot: 'bg-rose-500', soft: 'bg-rose-100 text-rose-950 hover:bg-rose-200 dark:bg-rose-400/20 dark:text-rose-50 dark:hover:bg-rose-400/30' },
  { dot: 'bg-teal-500', soft: 'bg-teal-100 text-teal-950 hover:bg-teal-200 dark:bg-teal-400/20 dark:text-teal-50 dark:hover:bg-teal-400/30' },
  { dot: 'bg-violet-500', soft: 'bg-violet-100 text-violet-950 hover:bg-violet-200 dark:bg-violet-400/20 dark:text-violet-50 dark:hover:bg-violet-400/30' },
  { dot: 'bg-lime-600', soft: 'bg-lime-100 text-lime-950 hover:bg-lime-200 dark:bg-lime-400/20 dark:text-lime-50 dark:hover:bg-lime-400/30' },
  { dot: 'bg-fuchsia-500', soft: 'bg-fuchsia-100 text-fuchsia-950 hover:bg-fuchsia-200 dark:bg-fuchsia-400/20 dark:text-fuchsia-50 dark:hover:bg-fuchsia-400/30' },
];
export const NO_PERSON_COLOR = { dot: 'bg-icon', soft: 'bg-secondary text-foreground hover:bg-accent' };
export type PersonColor = typeof NO_PERSON_COLOR;

export interface PlacedEvent { app: Appointment; start: number; end: number; col: number; cols: number }

/**
 * Side-by-side layout for overlapping events in one day column: events that
 * overlap (transitively) form a cluster and split its width into columns.
 */
export function layoutDay(apps: Appointment[]): PlacedEvent[] {
  const items = apps
    .map(app => { const start = toMinutes(app.time); return { app, start, end: Math.max(start + (app.duration || 60), start + 15), col: 0, cols: 1 }; })
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const placed: PlacedEvent[] = [];
  let cluster: PlacedEvent[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => { cluster.forEach(e => { e.cols = colEnds.length; }); placed.push(...cluster); cluster = []; colEnds = []; };
  for (const e of items) {
    if (e.start >= clusterEnd && cluster.length) flush();
    let col = colEnds.findIndex(end => end <= e.start);
    if (col < 0) { col = colEnds.length; colEnds.push(e.end); } else colEnds[col] = e.end;
    e.col = col;
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, e.end);
  }
  flush();
  return placed;
}
