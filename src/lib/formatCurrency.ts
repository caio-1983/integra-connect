/**
 * The single BRL formatter for the whole app.
 *
 * Six components each carried their own `Intl.NumberFormat('pt-BR', ...)`
 * (Kanban, DealTable, DealSummary, CompanySheet, PersonSheet, GlobalSearch) and
 * `api.ts` had a seventh that was never called. They disagreed on decimals, so
 * the same deal value rendered differently depending on where you looked at it.
 * Revenue reporting makes that a correctness problem, not just a cosmetic one.
 */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const BRL_CENTS = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * `R$ 4.250` — the default everywhere. Deal values in this product are whole
 * reais in practice, and hiding centavos keeps dense tables and Kanban cards
 * readable.
 */
export function formatCurrency(value: number | null | undefined): string {
  return BRL.format(value ?? 0);
}

/** `R$ 4.250,00` — for a single focused figure (detail panel, confirmation). */
export function formatCurrencyExact(value: number | null | undefined): string {
  return BRL_CENTS.format(value ?? 0);
}

/**
 * `R$ 1,2 mi` / `R$ 340 mil` — for axis ticks and KPI tiles where the full
 * number would wrap. Never use in a table cell: the reader needs the exact
 * figure there.
 */
export function formatCurrencyCompact(value: number | null | undefined): string {
  const v = value ?? 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return formatCurrency(v);
}

/**
 * Signed variation for period-over-period comparison: `+R$ 12.400` /
 * `-R$ 3.100`. The sign is what the reader is looking for, so it is always
 * explicit — including the `+`.
 */
export function formatCurrencyDelta(value: number | null | undefined): string {
  const v = value ?? 0;
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}${formatCurrency(Math.abs(v))}`;
}

/**
 * Parses what a user typed into a currency input. Accepts `1.234,56`,
 * `1234,56`, `1234.56` and `R$ 1.234,56`. Returns null when there is no number
 * at all, so a caller can tell "empty" from "zero" — marking a deal as won with
 * a blank value must not silently persist R$ 0.
 */
export function parseCurrencyInput(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;

  // pt-BR ("1.234,56") vs plain ("1234.56"): if a comma is present it is the
  // decimal separator and dots are thousands; otherwise the dot is decimal.
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
