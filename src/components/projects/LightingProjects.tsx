import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ChevronDown, Copy, FileSpreadsheet, FilePlus2, FileText, Lightbulb, Loader2, MessageSquare, MoreVertical, PanelRightClose, PanelRightOpen, RotateCw, Search, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn, contactDisplayName } from '@/lib/utils';
import { analyzeMessageProject, analyzeUploadedProject, scanMessageProjects, type LightingProjectResult, type ProjectScanEntry } from '@/services/lightingProjectService';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PdfSheetPreview } from './PdfSheetPreview';
import { LightingProjectResultView, copyProjectSummary, downloadProjectSpreadsheet } from './LightingProjectResultView';

/** A project in the list: a PDF received in a chat, or one uploaded on this page. */
interface ProjectEntry {
  id: string;
  source: 'chat' | 'upload';
  name: string;
  /** Contact name for chat PDFs, "Enviado por você" for uploads. */
  origin: string;
  date: string;
  phone: string | null;
  /** Public URL (chat) or object URL (upload) — feeds the PDF preview. */
  pdfUrl: string | null;
  file?: File;
}

interface Analysis {
  status: 'loading' | 'done' | 'error';
  result?: LightingProjectResult;
  error?: string;
}

/**
 * Projetos — reads a lighting project PDF and tells how many luminaires of each
 * code it asks for, instead of the attendant counting by hand. Same two-pane
 * shape as Atendimento: the projects on the left, the open one on the right.
 */
export const LightingProjects: React.FC = () => {
  const [received, setReceived] = useState<ProjectEntry[] | null>(null);
  const [uploads, setUploads] = useState<ProjectEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [query, setQuery] = useState('');
  const [showPdf, setShowPdf] = useState(true);
  const [dragging, setDragging] = useState(false);
  /** Which received PDFs are lighting projects. null while the backend reads them. */
  const [scan, setScan] = useState<Record<string, ProjectScanEntry> | null>(null);
  const [scanFailed, setScanFailed] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from('messages')
      .select('id, content, sent_at, media_url, conversation:conversations(contact:contacts(name, call_name, phone_number))')
      .ilike('media_url', '%.pdf')
      .order('sent_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) console.error('[Projetos] Error fetching PDFs:', error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entries: ProjectEntry[] = (data ?? []).map((row: any) => {
            const contact = row.conversation?.contact;
            return {
              id: row.id,
              source: 'chat' as const,
              name: row.content || 'Projeto.pdf',
              origin: contactDisplayName(contact?.call_name || contact?.name, contact?.phone_number, 'Contato'),
              date: row.sent_at,
              phone: contact?.phone_number ?? null,
              pdfUrl: row.media_url,
            };
          });
        setReceived(entries);
        // Most PDFs in a chat are invoices, catalogues, boletos — only the ones
        // with luminaire codes on a plan are projects.
        scanMessageProjects(entries.map((e) => e.id))
          .then(setScan)
          .catch((err) => { console.error('[Projetos] Error scanning PDFs:', err); setScanFailed(true); setScan({}); });
      });
  }, []);

  // Object URLs of uploads live as long as the page.
  useEffect(() => () => uploads.forEach((u) => u.pdfUrl && URL.revokeObjectURL(u.pdfUrl)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const all = useMemo(() => [...uploads, ...(received ?? [])], [uploads, received]);
  const selected = all.find((p) => p.id === selectedId) ?? null;
  const analysis = selectedId ? analyses[selectedId] : undefined;

  const filter = (list: ProjectEntry[]) => {
    const q = query.trim().toLocaleLowerCase('pt-BR');
    return q ? list.filter((p) => `${p.name} ${p.origin}`.toLocaleLowerCase('pt-BR').includes(q)) : list;
  };

  const analyze = async (entry: ProjectEntry) => {
    setSelectedId(entry.id);
    if (analyses[entry.id]?.status === 'done' || analyses[entry.id]?.status === 'loading') return;
    setAnalyses((prev) => ({ ...prev, [entry.id]: { status: 'loading' } }));
    try {
      const result = entry.file ? await analyzeUploadedProject(entry.file) : await analyzeMessageProject(entry.id);
      setAnalyses((prev) => ({ ...prev, [entry.id]: { status: 'done', result } }));
    } catch (e) {
      setAnalyses((prev) => ({ ...prev, [entry.id]: { status: 'error', error: e instanceof Error ? e.message : String(e) } }));
    }
  };

  const addFile = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setAnalyses((prev) => ({ ...prev, rejected: { status: 'error', error: `"${file.name}" não é um PDF.` } }));
      setSelectedId('rejected');
      return;
    }
    const entry: ProjectEntry = {
      id: `upload-${Date.now()}`,
      source: 'upload',
      name: file.name,
      origin: 'Enviado por você',
      date: new Date().toISOString(),
      phone: null,
      pdfUrl: URL.createObjectURL(file),
      file,
    };
    setUploads((prev) => [entry, ...prev]);
    analyze(entry);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFile(e.dataTransfer.files[0]);
  };

  // A failed scan never promotes every PDF to "project": they all wait in Outros.
  const projects = (received ?? []).filter((p) => scan?.[p.id]?.isProject);
  const others = (received ?? []).filter((p) => scan && !scan[p.id]?.isProject);
  const receivedList = filter(projects);
  const otherList = filter(others);
  const uploadList = filter(uploads);

  const liveMessage =
    received === null ? 'Carregando os PDFs do chat.'
    : scan === null ? `Procurando projetos entre ${received.length} PDFs do chat.`
    : analysis?.status === 'loading' ? 'Lendo o projeto e contando as luminárias.'
    : analysis?.status === 'error' ? `Não foi possível ler este projeto. ${analysis.error ?? ''}`
    : analysis?.status === 'done' && analysis.result ? `Contagem pronta: ${analysis.result.total} itens em ${analysis.result.lines.length} códigos.`
    : `${projects.length} projetos encontrados no chat.`;

  return (
    <div
      className="relative flex h-full overflow-hidden bg-card"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={onDrop}
    >
      {/* Always mounted: screen readers only announce changes inside a live
          region that already exists. */}
      <p className="sr-only" aria-live="polite">{liveMessage}</p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { addFile(e.target.files?.[0]); e.target.value = ''; }}
      />

      {/* Coluna 1 — Projetos */}
      <div className={cn('w-full flex-shrink-0 flex-col border-border bg-card md:flex md:w-[30%] md:min-w-[320px] md:max-w-[480px] md:border-r', selectedId ? 'hidden' : 'flex')}>
        <div className="flex h-[60px] flex-shrink-0 items-center justify-between px-4">
          <h2 className="text-[22px] font-bold text-foreground">Projetos</h2>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Novo projeto"
            aria-label="Novo projeto"
            className="flex h-10 w-10 items-center justify-center rounded-full text-icon transition-colors hover:bg-accent"
          >
            <FilePlus2 className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-shrink-0 px-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-icon" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar projeto ou cliente"
              aria-label="Buscar projeto ou cliente"
              className="h-10 w-full rounded-full border-0 bg-secondary pl-12 pr-4 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
            />
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto">
          {uploadList.length > 0 && (
            <ListGroup title="Enviados agora">
              {uploadList.map((p) => (
                <ProjectRow key={p.id} entry={p} analysis={analyses[p.id]} active={p.id === selectedId} onSelect={() => analyze(p)} />
              ))}
            </ListGroup>
          )}

          <ListGroup title="Recebidos no chat">
            {received === null || scan === null ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {received === null ? 'Carregando…' : `Procurando projetos entre ${received.length} PDFs do chat…`}
              </div>
            ) : scanFailed ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Não foi possível identificar os projetos agora. Os PDFs do chat estão em Outros PDFs, logo abaixo, e você pode abrir qualquer um para contar.
              </p>
            ) : receivedList.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                {query
                  ? 'Nenhum projeto com esse nome ou cliente.'
                  : 'Nenhum projeto luminotécnico nos PDFs do chat. Quando um cliente mandar um, ele aparece aqui.'}
              </p>
            ) : (
              receivedList.map((p) => (
                <ProjectRow key={p.id} entry={p} analysis={analyses[p.id]} scan={scan[p.id]} active={p.id === selectedId} onSelect={() => analyze(p)} />
              ))
            )}
          </ListGroup>

          {otherList.length > 0 && (
            <section className="pb-2">
              <button
                type="button"
                onClick={() => setShowOthers((v) => !v)}
                aria-expanded={showOthers}
                className="flex w-full items-center justify-between px-4 pb-1 pt-4 text-left text-[13px] text-muted-foreground hover:text-foreground"
              >
                <span>{scanFailed ? `Outros PDFs do chat (${otherList.length})` : `Outros PDFs do chat (${otherList.length}): boletos, notas e documentos`}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', showOthers && 'rotate-180')} aria-hidden="true" />
              </button>
              {showOthers && otherList.map((p) => (
                <ProjectRow key={p.id} entry={p} analysis={analyses[p.id]} active={p.id === selectedId} onSelect={() => analyze(p)} muted />
              ))}
            </section>
          )}
        </div>
      </div>

      {/* Coluna 2 — Projeto aberto */}
      {selected || selectedId === 'rejected' ? (
        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex h-[60px] flex-shrink-0 items-center gap-3 border-b border-border bg-muted px-4">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              title="Voltar para a lista"
              aria-label="Voltar para a lista"
              className="-ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-icon transition-colors hover:bg-accent md:hidden"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="hidden h-10 w-10 sm:flex flex-shrink-0 items-center justify-center rounded-full bg-avatar text-avatar-foreground">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base text-foreground">{selected?.name ?? 'Arquivo recusado'}</p>
              {selected && <p className="truncate text-[13px] text-muted-foreground">{selected.origin} · {formatDate(selected.date)}</p>}
            </div>
            {analysis?.status === 'done' && analysis.result && analysis.result.lines.length > 0 && (
              <>
                <HeaderAction label="Copiar resumo" onClick={() => copyProjectSummary(analysis.result!)} icon={Copy} className="hidden sm:flex" />
                <HeaderAction label="Baixar planilha" onClick={() => downloadProjectSpreadsheet(analysis.result!)} icon={FileSpreadsheet} className="hidden sm:flex" />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    title="Mais ações"
                    aria-label="Mais ações"
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-icon transition-colors hover:bg-accent sm:hidden"
                  >
                    <MoreVertical className="h-5 w-5" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => copyProjectSummary(analysis.result!)}>
                      <Copy className="mr-2 h-4 w-4" aria-hidden="true" /> Copiar resumo
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => downloadProjectSpreadsheet(analysis.result!)}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" /> Baixar planilha
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {selected?.phone && (
              <Link
                to={`/chat?contact=${encodeURIComponent(selected.phone)}`}
                title="Abrir conversa"
                aria-label="Abrir conversa"
                className="flex h-10 w-10 items-center justify-center rounded-full text-icon transition-colors hover:bg-accent"
              >
                <MessageSquare className="h-5 w-5" aria-hidden="true" />
              </Link>
            )}
            {selected?.pdfUrl && (
              <HeaderAction
                label={showPdf ? 'Esconder PDF' : 'Mostrar PDF'}
                onClick={() => setShowPdf((v) => !v)}
                icon={showPdf ? PanelRightClose : PanelRightOpen}
                className="hidden xl:flex"
              />
            )}
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="custom-scrollbar min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5">
              <div className="mx-auto max-w-[720px]">
                {!analysis || analysis.status === 'loading' ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Lendo o projeto e contando as luminárias…
                  </div>
                ) : analysis.status === 'error' ? (
                  <div className="rounded-lg bg-card px-6 py-10 text-center">
                    <p className="text-[15px] text-foreground">Não foi possível ler este projeto</p>
                    <p className="mt-1 text-sm text-muted-foreground">{analysis.error}</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {selected && (
                        <button
                          type="button"
                          onClick={() => analyze(selected)}
                          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          <RotateCw className="h-4 w-4" aria-hidden="true" /> Tentar de novo
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className={cn(
                          'rounded-full px-5 py-2 text-sm font-medium transition-colors',
                          selected ? 'border border-input bg-card text-foreground hover:bg-accent' : 'bg-primary text-primary-foreground hover:opacity-90',
                        )}
                      >
                        Enviar outro PDF
                      </button>
                    </div>
                  </div>
                ) : analysis.result ? (
                  <LightingProjectResultView result={analysis.result} />
                ) : null}
              </div>
            </div>

            {showPdf && selected?.pdfUrl && (
              <div className="hidden w-[42%] max-w-[640px] flex-shrink-0 border-l border-border xl:block">
                <PdfSheetPreview url={selected.pdfUrl} name={selected.name} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="chat-wall hidden min-w-0 flex-1 md:block">
          <div className="custom-scrollbar absolute inset-0 flex overflow-y-auto">
            <div className="m-auto flex w-full max-w-[480px] flex-col items-center gap-5 px-6 py-10 text-center text-foreground">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-subtle text-primary-subtle-foreground">
                <Lightbulb className="h-7 w-7" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-balance text-[28px] font-bold leading-tight">Conte as luminárias de um projeto</h1>
                <p className="text-[15px] text-muted-foreground">
                  Escolha um PDF recebido no chat ou envie um projeto exportado do CAD. Você vê quantas peças de cada código ele pede e onde a planta não bate com o quadro resumo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Upload className="h-4 w-4" aria-hidden="true" /> Enviar PDF do projeto
              </button>
              <p className="text-xs text-muted-foreground">Ou arraste o arquivo para esta tela.</p>
            </div>
          </div>
        </div>
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-card/85">
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-primary px-12 py-10 text-primary">
            <Upload className="h-8 w-8" aria-hidden="true" />
            <p className="text-base font-medium">Solte o PDF para contar as luminárias</p>
          </div>
        </div>
      )}
    </div>
  );
};

const ListGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h3 className="px-4 pb-1 pt-3 text-[13px] font-medium text-primary">{title}</h3>
    {children}
  </section>
);

const ProjectRow: React.FC<{
  entry: ProjectEntry;
  analysis?: Analysis;
  scan?: ProjectScanEntry;
  active: boolean;
  muted?: boolean;
  onSelect: () => void;
}> = ({ entry, analysis, scan, active, muted, onSelect }) => {
  const done = analysis?.status === 'done' && analysis.result?.lines.length ? analysis.result : null;
  const total = done ? done.total : scan?.isProject ? scan.total : null;
  const divergent = done ? done.lines.some((l) => l.divergent) : scan?.divergent ?? false;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active || undefined}
      className={cn('flex w-full items-center gap-3 pl-3 pr-4 text-left transition-colors', active ? 'bg-secondary' : 'hover:bg-accent', muted && !active && 'opacity-70')}
    >
      <span className="flex h-[49px] w-[49px] flex-shrink-0 items-center justify-center rounded-full bg-avatar text-avatar-foreground">
        <FileText className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 border-b border-border py-3">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[17px] leading-[21px] text-foreground">{entry.name}</span>
          <span className="flex-shrink-0 text-xs text-muted-foreground tabular-nums">{formatDate(entry.date)}</span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-muted-foreground">{entry.origin}</span>
          {analysis?.status === 'loading' && (
            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-muted-foreground" aria-label="Lendo o projeto" role="img" />
          )}
          {total !== null && (
            <span
              className={cn(
                'flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                divergent ? 'bg-warning-subtle text-warning' : 'bg-primary-subtle text-primary-subtle-foreground',
              )}
              title={divergent ? 'Planta e quadro resumo não batem' : undefined}
            >
              {divergent && <AlertTriangle className="mr-1 inline h-3 w-3 -translate-y-px" aria-hidden="true" />}
              {total} {total === 1 ? 'item' : 'itens'}
              {divergent && <span className="sr-only">, planta e quadro resumo não batem</span>}
            </span>
          )}
        </span>
      </span>
    </button>
  );
};

const HeaderAction: React.FC<{ label: string; onClick: () => void; icon: React.ComponentType<{ className?: string }>; className?: string }> = ({ label, onClick, icon: Icon, className }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-icon transition-colors hover:bg-accent', className)}
  >
    <Icon className="h-5 w-5" aria-hidden="true" />
  </button>
);

function formatDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default LightingProjects;
