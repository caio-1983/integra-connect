import { getSupabase } from '../persistence/supabaseClient.js';
import { analyzeLightingProject, type LightingProjectAnalysis } from './LightingProjectParser.js';

const MEDIA_BUCKET = 'audio-messages';
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const CACHE_LIMIT = 200;

export interface LightingProjectResult extends LightingProjectAnalysis {
  fileName: string | null;
}

// A message's attachment never changes, so its analysis is cached in memory by
// message id: reopening the sheet in the chat is instant and parses nothing.
const cache = new Map<string, LightingProjectResult>();

export async function analyzeMessageAttachment(messageId: string): Promise<LightingProjectResult> {
  const cached = cache.get(messageId);
  if (cached) return cached;

  const supabase = getSupabase();
  const { data: message, error } = await supabase
    .from('messages')
    .select('id, media_url, content')
    .eq('id', messageId)
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar a mensagem: ${error.message}`);
  if (!message?.media_url) throw new ProjectInputError('Mensagem sem anexo.');

  // Only our own media bucket is read — the URL comes from the database, but
  // fetching whatever it says would make this route an open proxy.
  const path = storagePathOf(message.media_url as string);
  if (!path) throw new ProjectInputError('Anexo fora do armazenamento do sistema.');

  const { data: blob, error: downloadError } = await supabase.storage.from(MEDIA_BUCKET).download(path);
  if (downloadError || !blob) throw new Error(`Falha ao baixar o anexo: ${downloadError?.message ?? 'vazio'}`);

  const result = await analyzePdf(new Uint8Array(await blob.arrayBuffer()), fileNameOf(path));
  cache.set(messageId, result);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  return result;
}

export interface ProjectScanEntry {
  isProject: boolean;
  total: number;
  divergent: boolean;
  /** Download or parse failed: "not a project" for now, but worth asking again. */
  failed?: boolean;
}

// A lighting project has several luminaire codes tagged on its plan; an
// invoice or a catalogue that happens to mention "LA-1" once does not.
const MIN_CODES_FOR_PROJECT = 2;
const MIN_PLAN_TAGS_FOR_PROJECT = 3;
const SCAN_CONCURRENCY = 3;

/** Codes alone are not enough: an invoice line or a boleto field can look like
 * "LA-1". A project is also a drawing sheet (larger than A4) or carries the
 * luminaire summary table. */
export function isLightingProject(r: LightingProjectAnalysis): boolean {
  const planTags = r.lines.reduce((n, l) => n + l.counted, 0);
  return r.readable
    && r.lines.length >= MIN_CODES_FOR_PROJECT
    && planTags >= MIN_PLAN_TAGS_FOR_PROJECT
    && (r.largeFormat || r.hasSummaryTable);
}

/** Tells which of the given chat PDFs are lighting projects. Unreadable or
 * failing files are simply "not a project" — the scan never fails as a whole. */
export async function scanMessageAttachments(messageIds: string[]): Promise<Record<string, ProjectScanEntry>> {
  const out: Record<string, ProjectScanEntry> = await loadStoredScans(messageIds);
  const queue = [...new Set(messageIds)].filter((id) => !out[id]);
  const fresh: Array<[string, ProjectScanEntry]> = [];
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      try {
        const r = await analyzeMessageAttachment(id);
        out[id] = {
          isProject: isLightingProject(r),
          total: r.total,
          divergent: r.lines.some((l) => l.divergent),
        };
        fresh.push([id, out[id]]);
      } catch {
        out[id] = { isProject: false, total: 0, divergent: false, failed: true };
      }
    }
  };
  await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, worker));
  await storeScans(fresh);
  return out;
}

// Stored verdicts (table lighting_project_scans). Storage is an optimization:
// if the table is missing or the query fails, the scan just reads the PDFs.
async function loadStoredScans(messageIds: string[]): Promise<Record<string, ProjectScanEntry>> {
  const { data, error } = await getSupabase()
    .from('lighting_project_scans')
    .select('message_id, is_project, total, divergent')
    .in('message_id', messageIds);
  if (error) return {};
  return Object.fromEntries((data ?? []).map((row) => [
    row.message_id as string,
    { isProject: row.is_project as boolean, total: row.total as number, divergent: row.divergent as boolean },
  ]));
}

async function storeScans(entries: Array<[string, ProjectScanEntry]>): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await getSupabase().from('lighting_project_scans').upsert(
    entries.map(([id, e]) => ({ message_id: id, is_project: e.isProject, total: e.total, divergent: e.divergent })),
    { onConflict: 'message_id' },
  );
  if (error) console.warn('[projects] scan cache not stored:', error.message);
}

export async function analyzePdf(data: Uint8Array, fileName: string | null): Promise<LightingProjectResult> {
  if (data.byteLength > MAX_PDF_BYTES) throw new ProjectInputError('Arquivo excede 50 MB.');
  if (!isPdf(data)) throw new ProjectInputError('O anexo não é um PDF.');
  return { ...(await analyzeLightingProject(data)), fileName };
}

export class ProjectInputError extends Error {}

function isPdf(data: Uint8Array): boolean {
  return data.length > 4 && String.fromCharCode(...data.subarray(0, 5)) === '%PDF-';
}

function storagePathOf(url: string): string | null {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at < 0) return null;
  const path = decodeURIComponent(url.slice(at + marker.length).split('?')[0]);
  return path && !path.includes('..') ? path : null;
}

function fileNameOf(path: string): string {
  return path.split('/').pop() ?? path;
}
