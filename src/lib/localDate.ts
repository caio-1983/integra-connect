/**
 * `YYYY-MM-DD` in the browser's local timezone, offset by `addDays`.
 *
 * `appointments.date` is a local calendar date. `toISOString().split('T')[0]`
 * gives the UTC date, which in Brazil (UTC-3) turns into tomorrow from 21h on —
 * today's appointments would then count as overdue and drop out of "upcoming".
 */
export function localDateString(addDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
