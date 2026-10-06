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
    throw new Error(message || (res.status >= 500 ? 'O servidor não conseguiu ler o projeto. Tente de novo em instantes.' : raw));
  }
}

export function isPdfAttachment(mediaUrl: string | null | undefined): boolean {
  return !!mediaUrl && /\.pdf(\?|$)/i.test(mediaUrl);
}

export async function analyzeMessageProject(messageId: string): Promise<LightingProjectResult> {
  const res = await fetch(`${backendBaseUrl()}/v1/projects/messages/${encodeURIComponent(messageId)}/analyze`, {
    method: 'POST',
    headers: backendAuthOnlyHeaders(),
  });
  return readResult(res);
}

export async function analyzeUploadedProject(file: File): Promise<LightingProjectResult> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  const res = await fetch(`${backendBaseUrl()}/v1/projects/analyze`, {
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
}

/** Which chat PDFs are lighting projects — the backend reads each one (cached). */
export async function scanMessageProjects(messageIds: string[]): Promise<Record<string, ProjectScanEntry>> {
  if (messageIds.length === 0) return {};
  const res = await fetch(`${backendBaseUrl()}/v1/projects/scan`, {
    method: 'POST',
    headers: backendHeaders(),
    body: JSON.stringify({ messageIds }),
  });
  return handleBackendResponse<Record<string, ProjectScanEntry>>(res);
}

/** Best quantity per line: what the table declares, else what was counted. */
export function lineQuantity(line: LuminaireLine): number {
  return line.declared ?? line.counted;
}

/** Plain-text summary the attendant can paste into the reply to the customer. */
export function projectSummaryText(result: LightingProjectResult): string {
  const rows = result.lines.map((l) => {
    const what = [l.ambiente, l.description].filter(Boolean).join(' — ');
    return `${l.code}: ${lineQuantity(l)} un.${what ? ` (${what})` : ''}`;
  });
  return [`Total: ${result.total} itens em ${result.lines.length} códigos`, '', ...rows].join('\n');
}

export function projectCsv(result: LightingProjectResult): string {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Código', 'Ambiente', 'Descrição', 'Qtd. no quadro', 'Qtd. contada na planta', 'Divergente'];
  const rows = result.lines.map((l) => [l.code, l.ambiente, l.description, l.declared, l.counted, l.divergent ? 'sim' : 'não']);
  return '﻿' + [header, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
}
