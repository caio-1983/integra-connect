import React from 'react';
import { CloudOff, Loader2, TriangleAlert, type LucideIcon } from 'lucide-react';

/** Shared pieces of the Resultados tabs, so every report reads the same way. */

export const ReportLoading: React.FC = () => (
  <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-muted-foreground">
    <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" /> Calculando…
  </div>
);

/** A failed report is "unknown", not zero — say so instead of drawing empty numbers. */
export const ReportError: React.FC = () => (
  <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
    <CloudOff className="w-8 h-8 text-icon/40" aria-hidden="true" />
    <p className="text-[15px] text-foreground">Não foi possível carregar este relatório</p>
    <p className="text-sm text-muted-foreground">Os números não estão zerados, só não chegaram. Troque o período ou recarregue a página.</p>
  </div>
);

export const ReportEmpty: React.FC<{ icon: LucideIcon; title: string; text: string }> = ({ icon: Icon, title, text }) => (
  <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
    <Icon className="w-8 h-8 text-icon/40" aria-hidden="true" />
    <p className="text-[15px] text-foreground">{title}</p>
    <p className="text-sm text-muted-foreground max-w-md">{text}</p>
  </div>
);

/** Something the numbers above can't show on their own (unmapped leads, a live queue). */
export const ReportNotice: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-lg bg-card border border-border flex items-start gap-4 px-6 py-4">
    <span className="w-10 h-10 rounded-full bg-warning-subtle text-warning flex items-center justify-center flex-shrink-0" aria-hidden="true">
      <TriangleAlert className="w-5 h-5" />
    </span>
    <p className="text-sm text-muted-foreground pt-0.5">{children}</p>
  </div>
);

/** pt-BR percentage with one decimal: 7,5%. */
export const pct = (n: number) => `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

// Table styling: WhatsApp-list rows (hairline dividers, 15px body), no all-caps header.
export const th = 'py-2.5 pr-4 text-xs font-normal text-muted-foreground';
export const td = 'py-3 pr-4 text-[15px] tabular-nums';
export const tableWrap = 'overflow-x-auto px-6 pb-3';
