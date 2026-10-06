import { backendBaseUrl, backendHeaders, backendAuthOnlyHeaders, handleBackendResponse } from './backendGateway';

/** Mirrors backend/src/projects/LightingProjectParser.ts. */
export interface LuminaireLine {
  code: string;
  counted: number;
  declared: number | null;
  perView: number[];
  ambiente: string;
  description: string;
  divergent: boolean;
}

export interface LightingProjectResult {
  lines: LuminaireLine[];
  total: number;
  views: number;
  hasSummaryTable: boolean;
  readable: boolean;
  pages: number;
  fileName: string | null;
}

/** The backend answers `{ error }`; surface that sentence, not the HTTP envelope. */
async function readResult(res: Response): Promise<LightingProjectResult> {
  try {
    return await handleBackendResponse<LightingProjectResult>(res);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const match = raw.match(/\{.*\}/s);
    let message: string | undefined;
    try { message = match ? (JSON.parse(match[0]) as { error?: string }).error : undefined; } catch { /* not JSON */ }
    // 400s are written for the attendant ("O anexo não é um PDF."); 5xx carry
    // storage/parser internals, which only help in the console.
    if (res.status >= 500 || !message) {
      console.error('[Projetos] Falha ao ler o projeto:', raw);
      throw new Error(res.status >= 500
        ? 'O servidor não conseguiu abrir este PDF. Tente de novo em instantes; se continuar, peça ao cliente para reenviar o arquivo.'
        : 'Não foi possível ler este PDF. Peça ao cliente o arquivo exportado direto do CAD.');
    }
    throw new Error(message);
  }
}

/** fetch, with the offline/blocked case explained instead of "Failed to fetch". */
async function reach(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    console.error('[Projetos] Sem resposta do servidor:', e);
    throw new Error('Sem conexão com o servidor. Confira a internet e tente de novo.');
  }
}

export function isPdfAttachment(mediaUrl: string | null | undefined): boolean {
  return !!mediaUrl && /\.pdf(\?|$)/i.test(mediaUrl);
}

export async function analyzeMessageProject(messageId: string): Promise<LightingProjectResult> {
  const res = await reach(`${backendBaseUrl()}/v1/projects/messages/${encodeURIComponent(messageId)}/analyze`, {
    method: 'POST',
    headers: backendAuthOnlyHeaders(),
  });
  return readResult(res);
}

export async function analyzeUploadedProject(file: File): Promise<LightingProjectResult> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  const res = await reach(`${backendBaseUrl()}/v1/projects/analyze`, {
    method: 'POST',
    headers: backendHeaders(),
    body: JSON.stringify({ base64: btoa(binary), fileName: file.name }),
  });
  return readResult(res);
}

export interface ProjectScanEntry {
  isProject: boolean;
  total: number;
  divergent: boolean;
  failed?: boolean;
}

/** Which chat PDFs are lighting projects — the backend reads each one (cached). */
// A message's attachment never changes, so whether it is a project is decided
// once per browser: reopening the page only sends the PDFs it hasn't seen.
const SCAN_CACHE_KEY = 'projects:scan:v1';
const SCAN_CACHE_LIMIT = 1000;

function readScanCache(): Record<string, ProjectScanEntry> {
  try {
    return JSON.parse(localStorage.getItem(SCAN_CACHE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeScanCache(cache: Record<string, ProjectScanEntry>): void {
  try {
    const entries = Object.entries(cache);
    localStorage.setItem(SCAN_CACHE_KEY, JSON.stringify(Object.fromEntries(entries.slice(-SCAN_CACHE_LIMIT))));
  } catch {
    // Storage full or blocked: the scan still works, just uncached.
  }
}

export async function scanMessageProjects(messageIds: string[]): Promise<Record<string, ProjectScanEntry>> {
  const cache = readScanCache();
  const out: Record<string, ProjectScanEntry> = {};
  const missing: string[] = [];
  for (const id of messageIds) {
    if (cache[id]) out[id] = cache[id];
    else missing.push(id);
  }
  if (missing.length === 0) return out;
  const res = await fetch(`${backendBaseUrl()}/v1/projects/scan`, {
    method: 'POST',
    headers: backendHeaders(),
    body: JSON.stringify({ messageIds: missing }),
  });
  const fresh = await handleBackendResponse<Record<string, ProjectScanEntry>>(res);
  for (const [id, entry] of Object.entries(fresh)) {
    out[id] = entry;
    if (!entry.failed) cache[id] = entry;
  }
  writeScanCache(cache);
  return out;
}

/** Best quantity per line: what the table declares, else what was counted. */
export function lineQuantity(line: LuminaireLine): number {
  return line.declared ?? line.counted;
}

/** Plain-text summary the attendant can paste into the reply to the customer. */
export function projectSummaryText(result: LightingProjectResult): string {
  const rows = result.lines.map((l) => {
    // The customer reads this in WhatsApp: the product and its model, not the
    // whole spec paragraph (that goes in the spreadsheet).
    const d = splitDescription(l.description);
    const product = [d.produto, d.modelo && `modelo ${d.modelo}`].filter(Boolean).join(', ');
    return `*${l.code}* — ${lineQuantity(l)} un.${product ? `: ${product}` : ''}`;
  });
  return [`Total: ${result.total} itens em ${result.lines.length} códigos`, '', ...rows].join('\n');
}

const XLSX_COLUMNS: Array<[string, number]> = [
  ['Código', 9], ['Qtd.', 6], ['Ambiente', 22], ['Produto', 45], ['Fabricante', 22], ['Modelo', 20],
  ['Especificações', 50], ['Instalação', 40], ['Qtd. contada na planta', 12], ['Divergente', 11],
];

export async function projectXlsx(result: LightingProjectResult): Promise<Blob> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const header = XLSX_COLUMNS.map(([title]) => ({
    value: title, fontWeight: 'bold' as const, backgroundColor: '#E7F3EE', wrap: true, alignVertical: 'center' as const,
  }));
  const rows = result.lines.map((l) => {
    const d = splitDescription(l.description);
    const text = (value: string | null) => ({ value: value || null, wrap: true, alignVertical: 'top' as const });
    const num = (value: number | null) => ({ value, type: Number, alignVertical: 'top' as const });
    return [
      text(l.code), num(lineQuantity(l)), text(l.ambiente), text(d.produto), text(d.fabricante), text(d.modelo),
      text(d.specs), text(d.instalacao), num(l.counted),
      { ...text(l.divergent ? 'sim' : 'não'), ...(l.divergent ? { textColor: '#B45309', fontWeight: 'bold' as const } : {}) },
    ];
  });
  const totalRow = [{ value: 'Total', fontWeight: 'bold' as const }, { value: result.total, type: Number, fontWeight: 'bold' as const }];
  return writeXlsxFile([header, ...rows, [], totalRow], {
    sheet: 'Luminárias',
    columns: XLSX_COLUMNS.map(([, width]) => ({ width })),
    stickyRowsCount: 1,
  }).toBlob();
}

const LABELS: Array<[keyof Omit<DescriptionParts, 'produto' | 'specs'>, RegExp]> = [
  ['fabricante', /fabricante\s*:/i],
  ['modelo', /modelo\s*:/i],
  ['instalacao', /instala[çc][ãa]o\s*:/i],
];

interface DescriptionParts {
  produto: string;
  fabricante: string;
  modelo: string;
  specs: string;
  instalacao: string;
}

/** The table's description is one run-on paragraph ("Perfil … / Fabricante: X /
 * Modelo: Y Fita de LED: … / IRC 90 Instalação: …"). Splits it at the labels
 * the projects use, so each piece lands in its own spreadsheet column. */
export function splitDescription(text: string | null): DescriptionParts {
  const out: DescriptionParts = { produto: '', fabricante: '', modelo: '', specs: '', instalacao: '' };
  if (!text) return out;
  const marks = LABELS
    .map(([key, re]) => { const m = re.exec(text); return m ? { key, at: m.index, end: m.index + m[0].length } : null; })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => a.at - b.at);
  const clean = (s: string) => s.replace(/^[\s/]+|[\s/]+$/g, '').replace(/\s+/g, ' ');
  const head = text.slice(0, marks[0]?.at ?? text.length);
  const [produto, ...rest] = head.split(' / ');
  out.produto = clean(produto);
  const extra = [rest.join(' / ')];
  marks.forEach((m, i) => {
    let value = clean(text.slice(m.end, marks[i + 1]?.at ?? text.length));
    // Modelo is short; whatever follows the first "Something:" label after it
    // (e.g. "Fita de LED: Marca Stella / …") is a spec, not the model.
    if (m.key === 'modelo') {
      const spill = /\s([A-ZÀ-Ú][\wÀ-ú ]{1,20}):/.exec(value);
      if (spill) { extra.push(value.slice(spill.index)); value = clean(value.slice(0, spill.index)); }
    }
    if (m.key === 'fabricante' || m.key === 'modelo') {
      const [first, ...tail] = value.split(' / ');
      value = clean(first);
      if (tail.length) extra.push(tail.join(' / '));
    }
    out[m.key] = value;
  });
  out.specs = clean(extra.map(clean).filter(Boolean).join(' / '));
  return out;
}
