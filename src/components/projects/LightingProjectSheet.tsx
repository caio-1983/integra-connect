import React, { useEffect, useState } from 'react';
import { Copy, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { analyzeMessageProject, type LightingProjectResult } from '@/services/lightingProjectService';
import { LightingProjectResultView, copyProjectSummary, downloadProjectCsv } from './LightingProjectResultView';

interface LightingProjectSheetProps {
  messageId: string | null;
  fileLabel?: string;
  onOpenChange: (open: boolean) => void;
}

/** Counts the luminaires of a PDF received in the chat, without leaving it. */
export const LightingProjectSheet: React.FC<LightingProjectSheetProps> = ({ messageId, fileLabel, onOpenChange }) => {
  const [result, setResult] = useState<LightingProjectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!messageId) return;
    let cancelled = false;
    setResult(null);
    setError(null);
    analyzeMessageProject(messageId)
      .then((r) => { if (!cancelled) setResult(r); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao ler o projeto.'); });
    return () => { cancelled = true; };
  }, [messageId]);

  return (
    <Sheet open={!!messageId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-background border-border overflow-y-auto custom-scrollbar">
        <SheetHeader>
          <SheetTitle>Luminárias do projeto</SheetTitle>
          <SheetDescription className="truncate">{fileLabel || 'Projeto em PDF'}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-3">
          {error ? (
            <div className="rounded-lg bg-card px-6 py-8 text-center">
              <p className="text-[15px] text-foreground">Não foi possível ler este projeto</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : result ? (
            <>
              {result.lines.length > 0 && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => copyProjectSummary(result)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                    <Copy className="h-4 w-4" aria-hidden="true" /> Copiar resumo
                  </button>
                  <button type="button" onClick={() => downloadProjectCsv(result)} className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                    <FileSpreadsheet className="h-4 w-4 text-icon" aria-hidden="true" /> Baixar planilha
                  </button>
                </div>
              )}
              <LightingProjectResultView result={result} />
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Lendo o projeto e contando as luminárias…
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
