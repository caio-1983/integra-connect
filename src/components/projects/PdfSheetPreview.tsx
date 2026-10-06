import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, Minus, Plus } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

const ZOOMS = [1, 1.5, 2, 3, 4];

/**
 * The project sheet drawn as paper on the app's own surface, instead of the
 * browser's PDF viewer (dark chrome we can't style). Zoom matters: a CAD sheet
 * is A2/A1, unreadable at panel width.
 */
export const PdfSheetPreview: React.FC<{ url: string; name: string }> = ({ url, name }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    setDoc(null);
    setFailed(false);
    setZoom(0);
    (async () => {
      const pdfjs = await import('pdfjs-dist');
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      loaded = await pdfjs.getDocument(url).promise;
      if (cancelled) loaded.destroy();
      else setDoc(loaded);
    })().catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !width || !canvasRef.current) return;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(1);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const cssWidth = width * ZOOMS[zoom];
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * ratio });
      const canvas = canvasRef.current!;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${(viewport.height / ratio).toFixed(0)}px`;
      task = page.render({ canvas, viewport });
      await task.promise;
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, width, zoom]);

  return (
    <div className="flex h-full flex-col bg-muted">
      <div className="flex h-12 flex-shrink-0 items-center gap-1 border-b border-border px-3">
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          Prancha{doc && doc.numPages > 1 ? ` · página 1 de ${doc.numPages}` : ''}
        </p>
        <ToolButton label="Diminuir" disabled={zoom === 0} onClick={() => setZoom((z) => z - 1)} icon={Minus} />
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(ZOOMS[zoom] * 100)}%</span>
        <ToolButton label="Aumentar" disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom((z) => z + 1)} icon={Plus} />
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title="Abrir PDF em outra aba"
          aria-label="Abrir PDF em outra aba"
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-icon transition-colors hover:bg-accent"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-auto p-5">
        <div ref={frameRef} className="w-full">
          {failed ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Não foi possível mostrar a prancha. Abra o PDF em outra aba.</p>
          ) : !doc ? (
            <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando a prancha…
            </div>
          ) : null}
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Prancha de ${name}`}
            onDoubleClick={() => setZoom((z) => (z === ZOOMS.length - 1 ? 0 : z + 1))}
            className={doc && !failed ? 'block rounded-sm bg-white shadow-[0_1px_3px_rgba(11,20,26,0.12),0_0_0_1px_rgba(11,20,26,0.06)]' : 'hidden'}
          />
        </div>
      </div>
    </div>
  );
};

const ToolButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean; icon: React.ComponentType<{ className?: string }> }> = ({ label, onClick, disabled, icon: Icon }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="flex h-9 w-9 items-center justify-center rounded-full text-icon transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
  >
    <Icon className="h-4 w-4" />
  </button>
);
