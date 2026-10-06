import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Reads a lighting project (projeto luminotécnico) exported from CAD as a
// vector PDF and counts the luminaires, so the attendant doesn't count by hand.
//
// What a CAD export gives us: every luminaire on the floor plan is a text tag
// (LT-1, LS-1, LM-3…) and the sheet carries a "QUADRO RESUMO" table that lists
// each code once with its declared quantity and description. So:
//   - a tag with an integer just to its right, on the same baseline, is a
//     table row (code → declared quantity); everything else is the plan;
//   - one sheet often shows the same plan more than once (planta de forro +
//     planta de iluminação), so plan tags are clustered into views by x gap and
//     the count per code is the max over views, not the sum.
// The count vs. declared divergence is surfaced instead of hidden: that is
// exactly where a project error shows up.

export interface PositionedText {
  str: string;
  x: number;
  y: number;
  page: number;
}

export interface LuminaireLine {
  code: string;
  /** Tags found on the plan (max across repeated views of the same plan). */
  counted: number;
  /** Quantity declared in the summary table, null when the code isn't in it. */
  declared: number | null;
  /** Plan tags per view, left to right — lets the UI explain the count. */
  perView: number[];
  ambiente: string;
  description: string;
  divergent: boolean;
}

export interface LightingProjectAnalysis {
  lines: LuminaireLine[];
  /** Sum of the best quantity per code (declared when present, else counted). */
  total: number;
  views: number;
  hasSummaryTable: boolean;
  /** False when the PDF has no extractable text (scanned / raster export). */
  readable: boolean;
  pages: number;
  /** True when a page is bigger than A4 — CAD sheets (A3…A0) are, invoices and boletos are not. */
  largeFormat: boolean;
}

const DEFAULT_CODE_PATTERN = /^L[A-Z]{1,3}-\d{1,3}[A-Z]?$/;
const SAME_ROW_TOLERANCE = 4;
const TABLE_QTY_MAX_DX = 160;
const VIEW_GAP = 120;

export function analyzeTextItems(
  items: PositionedText[],
  codePattern: RegExp = DEFAULT_CODE_PATTERN,
): Omit<LightingProjectAnalysis, 'pages' | 'largeFormat'> {
  const texts = items
    .map((item) => ({ ...item, str: item.str.trim() }))
    .filter((item) => item.str.length > 0);
  const isCode = (s: string) => codePattern.test(s);
  const codes = texts.filter((t) => isCode(t.str));
  const integers = texts.filter((t) => /^\d{1,4}$/.test(t.str));

  // Table rows: code + integer to its right on the same line.
  interface Row { code: string; x: number; y: number; page: number; qtyX: number; declared: number }
  const rows: Row[] = [];
  const tableItems = new Set<PositionedText>();
  for (const code of codes) {
    const qty = integers
      .filter((n) => n.page === code.page && Math.abs(n.y - code.y) <= SAME_ROW_TOLERANCE && n.x > code.x && n.x - code.x <= TABLE_QTY_MAX_DX)
      .sort((a, b) => a.x - b.x)[0];
    if (!qty) continue;
    rows.push({ code: code.str, x: code.x, y: code.y, page: code.page, qtyX: qty.x, declared: Number(qty.str) });
    tableItems.add(code);
  }

  // A lone "code + number" pair is more likely a plan label than a table. Only
  // treat rows as a table when several of them share a column.
  const tableRows = rows.filter((r) => rows.filter((o) => o.page === r.page && Math.abs(o.x - r.x) <= 10).length >= 3);
  const tableCodes = new Set(tableRows.map((r) => r.code));
  for (const code of codes) if (!tableRows.some((r) => r.x === code.x && r.y === code.y && r.page === code.page)) tableItems.delete(code);

  const planTags = codes.filter((c) => !tableItems.has(c));
  const descriptions = describeRows(tableRows, texts, planTags);

  const views = clusterViews(planTags);
  const allCodes = new Set<string>([...planTags.map((t) => t.str), ...tableCodes]);

  const lines: LuminaireLine[] = [...allCodes].sort(compareCodes).map((code) => {
    const perView = views.map((view) => view.filter((t) => t.str === code).length);
    const counted = perView.length ? Math.max(...perView) : 0;
    const row = tableRows.find((r) => r.code === code);
    const declared = row ? row.declared : null;
    const desc = descriptions.get(code) ?? { ambiente: '', description: '' };
    return {
      code,
      counted,
      declared,
      perView,
      ambiente: desc.ambiente,
      description: desc.description,
      divergent: declared !== null && declared !== counted,
    };
  });

  return {
    lines,
    total: lines.reduce((sum, l) => sum + (l.declared ?? l.counted), 0),
    views: views.length,
    hasSummaryTable: tableRows.length > 0,
    readable: texts.length > 0,
  };
}

function clusterViews(tags: PositionedText[]): PositionedText[][] {
  const views: PositionedText[][] = [];
  const byPage = new Map<number, PositionedText[]>();
  for (const tag of tags) byPage.set(tag.page, [...(byPage.get(tag.page) ?? []), tag]);
  for (const pageTags of byPage.values()) {
    const sorted = [...pageTags].sort((a, b) => a.x - b.x);
    let current: PositionedText[] = [];
    for (const tag of sorted) {
      if (current.length && tag.x - current[current.length - 1].x > VIEW_GAP) {
        views.push(current);
        current = [];
      }
      current.push(tag);
    }
    if (current.length) views.push(current);
  }
  return views;
}

// Each table row owns the band between the midpoints to its neighbours (PDF y
// grows upwards). Inside the band, right of the quantity column and left of the
// plan: the short centred words are the ambiente, the long left-aligned lines
// from the description column on are the description.
function describeRows(
  rows: { code: string; y: number; page: number; qtyX: number }[],
  texts: PositionedText[],
  planTags: PositionedText[],
): Map<string, { ambiente: string; description: string }> {
  const result = new Map<string, { ambiente: string; description: string }>();
  const byPage = new Map<number, typeof rows>();
  for (const row of rows) byPage.set(row.page, [...(byPage.get(row.page) ?? []), row]);

  for (const [page, pageRows] of byPage) {
    const sorted = [...pageRows].sort((a, b) => b.y - a.y);
    const gaps = sorted.slice(1).map((r, i) => sorted[i].y - r.y);
    const half = gaps.length ? Math.min(...gaps) / 2 : 20;
    const qtyX = Math.max(...sorted.map((r) => r.qtyX));
    const planToRight = planTags.filter((t) => t.page === page && t.x > qtyX).map((t) => t.x);
    const rightEdge = planToRight.length ? Math.min(...planToRight) - 40 : Infinity;
    const inTable = texts.filter((t) => t.page === page && t.x > qtyX + 8 && t.x < rightEdge && !/^\d{1,4}$/.test(t.str));
    const longLines = inTable.filter((t) => t.str.length > 25).map((t) => t.x);
    const descriptionX = longLines.length ? Math.min(...longLines) - 5 : Infinity;

    sorted.forEach((row, i) => {
      const top = i === 0 ? row.y + half : (sorted[i - 1].y + row.y) / 2;
      const bottom = i === sorted.length - 1 ? row.y - half : (row.y + sorted[i + 1].y) / 2;
      const band = inTable.filter((t) => t.y < top && t.y >= bottom).sort((a, b) => b.y - a.y || a.x - b.x);
      if (!band.length) return;
      result.set(row.code, {
        ambiente: band.filter((t) => t.x < descriptionX).map((t) => t.str).join(' '),
        description: band.filter((t) => t.x >= descriptionX).map((t) => t.str).join(' '),
      });
    });
  }
  return result;
}

function compareCodes(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { numeric: true });
}

// A4 is 595×842 pt; anything clearly larger on its long side is a drawing sheet.
const A4_LONG_SIDE_PT = 842;
const LARGE_FORMAT_MARGIN = 1.15;

export async function extractPdfText(data: Uint8Array): Promise<{ items: PositionedText[]; pages: number; largeFormat: boolean }> {
  const doc = await getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  const items: PositionedText[] = [];
  let largeFormat = false;
  try {
    for (let page = 1; page <= doc.numPages; page++) {
      const pdfPage = await doc.getPage(page);
      const { width, height } = pdfPage.getViewport({ scale: 1 });
      if (Math.max(width, height) > A4_LONG_SIDE_PT * LARGE_FORMAT_MARGIN) largeFormat = true;
      const content = await pdfPage.getTextContent();
      for (const item of content.items) {
        if (!('str' in item)) continue;
        items.push({ str: item.str, x: item.transform[4], y: item.transform[5], page });
      }
    }
    return { items, pages: doc.numPages, largeFormat };
  } finally {
    await doc.destroy();
  }
}

export async function analyzeLightingProject(data: Uint8Array): Promise<LightingProjectAnalysis> {
  const { items, pages, largeFormat } = await extractPdfText(data);
  return { ...analyzeTextItems(items), pages, largeFormat };
}
