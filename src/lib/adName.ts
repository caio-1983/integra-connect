/**
 * Ad names as the team types them in Ads Manager follow `adNN_formato_tema_data`
 * (ad09_video_sanca_30-03-2026). The scoreboard shows the theme in plain words
 * ("Sanca") and keeps the raw name underneath, so nothing is hidden.
 */

const WORDS: Record<string, string> = {
  iluminacao: 'iluminação',
  ilumicacao: 'ilumicação',
  narracao: 'narração',
  lampada: 'lâmpada',
  publicacao: 'publicação',
  led: 'LED',
};

export function readableAdName(raw: string): string {
  const s = raw
    .replace(/^ad\d+_/i, '')
    .replace(/^(video|imagem|carrossel|foto)_/i, '')
    .replace(/_?\d{2}-\d{2}-\d{4}$/, '')
    .replace(/publicacao_existente\d{2}-\d{2}_?/i, '')
    .split('_')
    .filter(Boolean)
    .map((w) => WORDS[w.toLowerCase()] ?? w)
    .join(' ')
    .trim();
  if (!s) return raw;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "ad09" — tells apart ads with the same theme. */
export function adCode(raw: string): string | null {
  return /^(ad\d+)_/i.exec(raw)?.[1].toLowerCase() ?? null;
}

export const AD_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'No ar',
  PAUSED: 'Pausado',
  ADSET_PAUSED: 'Conjunto pausado',
  CAMPAIGN_PAUSED: 'Campanha pausada',
  ARCHIVED: 'Arquivado',
  DELETED: 'Excluído',
  DISAPPROVED: 'Reprovado',
  WITH_ISSUES: 'Com problema',
  IN_PROCESS: 'Em análise',
  PENDING_REVIEW: 'Em análise',
};

/** Which of two statuses to show for ads sharing a name: the one still running wins. */
export function liveliestStatus(a: string | null, b: string | null): string | null {
  if (a === 'ACTIVE' || b === 'ACTIVE') return 'ACTIVE';
  return a ?? b;
}
