import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lineQuantity, projectXlsx, splitDescription, type LuminaireLine, projectSummaryText, type LightingProjectResult } from '@/services/lightingProjectService';
import { toast } from 'sonner';

/**
 * The luminaire count of one project — shared by the chat sheet and the
 * Projetos page so both read the same way. Reads like the project's own
 * summary table: code, where it goes, how many.
 */
export const LightingProjectResultView: React.FC<{ result: LightingProjectResult }> = ({ result }) => {
  const divergent = result.lines.filter((l) => l.divergent);

  if (!result.readable || result.lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg bg-card px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-avatar text-avatar-foreground">
          <FileWarning className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-[15px] text-foreground">
          {result.readable ? 'Nenhum código de luminária encontrado' : 'Este PDF não tem texto para ler'}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {result.readable
            ? 'A contagem procura códigos como LT-1 ou LS-2 na planta. Confira se o projeto usa essa marcação.'
            : 'Ele foi escaneado ou exportado como imagem. Peça ao cliente o PDF exportado direto do CAD.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 divide-x divide-border rounded-lg bg-card">
        <Figure value={result.total} label={result.total === 1 ? 'item' : 'itens'} />
        <Figure value={result.lines.length} label={result.lines.length === 1 ? 'código' : 'códigos'} />
        <Figure
          value={divergent.length}
          label={divergent.length === 1 ? 'divergência' : 'divergências'}
          tone={divergent.length > 0 ? 'warning' : undefined}
        />
      </div>

      {divergent.length > 0 && (
        <div className="flex gap-2.5 rounded-lg bg-warning-subtle px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p>
            A planta e o quadro resumo não batem em <strong className="font-semibold">{divergent.map((l) => l.code).join(', ')}</strong>.
            {' '}Confirme com o cliente antes de orçar.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-card">
        <ul className="divide-y divide-border">
          {[...divergent, ...result.lines.filter((l) => !l.divergent)].map((line) => (
            <LuminaireRow key={line.code} line={line} />
          ))}
        </ul>
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        {result.hasSummaryTable
          ? 'Quantidades do quadro resumo, conferidas contra os códigos marcados na planta.'
          : 'O PDF não tem quadro resumo: as quantidades vêm só dos códigos marcados na planta.'}
        {result.views > 1 && ` A planta aparece ${result.views} vezes na folha e foi contada uma vez só.`}
      </p>
    </div>
  );
};

const DETAIL_FIELDS: Array<[keyof ReturnType<typeof splitDescription>, string]> = [
  ['produto', 'Produto'], ['fabricante', 'Fabricante'], ['modelo', 'Modelo'], ['specs', 'Especificações'], ['instalacao', 'Instalação'],
];

/** One code of the summary table. Collapsed it reads like the table; opened it
 * splits the run-on description into the fields the attendant quotes from. */
const LuminaireRow: React.FC<{ line: LuminaireLine }> = ({ line }) => {
  const [open, setOpen] = useState(false);
  const detail = splitDescription(line.description);
  const fields = DETAIL_FIELDS.filter(([key]) => detail[key]);
  const quantity = (
    <div className="shrink-0 text-right">
      <span className="text-xl font-semibold leading-6 text-foreground tabular-nums">{lineQuantity(line)}</span>
      {line.divergent && <p className="text-xs text-warning tabular-nums">planta: {line.counted}</p>}
    </div>
  );
  const heading = (
    <>
      <span className="w-14 shrink-0 pt-0.5 text-sm font-semibold text-primary tabular-nums">{line.code}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-5 text-foreground">{titleCase(line.ambiente) || 'Sem ambiente no quadro'}</span>
        {line.description && !open && (
          <span className="mt-0.5 line-clamp-2 text-[13px] leading-[18px] text-muted-foreground">{detail.produto || line.description}</span>
        )}
      </span>
    </>
  );

  return (
    <li className={cn(line.divergent && 'bg-warning-subtle')}>
      {fields.length === 0 ? (
        <div className="flex items-start gap-4 px-4 py-3">{heading}{quantity}</div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-start gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/60"
        >
          {heading}
          {quantity}
          <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-icon transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      )}
      {open && (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-4 pb-4 sm:grid-cols-[minmax(88px,auto)_1fr] sm:pl-[88px] text-[13px] leading-[18px]">
          {fields.map(([key, label]) => (
            <React.Fragment key={key}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mb-1 text-foreground sm:mb-0">{detail[key]}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </li>
  );
};

const Figure: React.FC<{ value: number; label: string; tone?: 'warning' }> = ({ value, label, tone }) => (
  <div className="flex flex-col items-center px-3 py-3">
    <span className={cn('text-2xl font-semibold leading-7 tabular-nums', tone === 'warning' ? 'text-warning' : 'text-foreground')}>
      {value}
    </span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

/** "ILUMINAÇÃO DE EXPOSITOR" → "Iluminação de expositor": CAD tables shout. */
function titleCase(text: string): string {
  if (!text || text !== text.toUpperCase()) return text;
  const lower = text.toLocaleLowerCase('pt-BR');
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
}

export async function copyProjectSummary(result: LightingProjectResult): Promise<void> {
  try {
    await navigator.clipboard.writeText(projectSummaryText(result));
    toast.success('Resumo copiado.');
  } catch {
    toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
  }
}

export async function downloadProjectSpreadsheet(result: LightingProjectResult): Promise<void> {
  let blob: Blob;
  try {
    blob = await projectXlsx(result);
  } catch {
    toast.error('Não foi possível gerar a planilha.');
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(result.fileName ?? 'projeto').replace(/\.pdf$/i, '')}-luminarias.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
