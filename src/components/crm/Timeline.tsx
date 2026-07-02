import React from 'react';
import {
  MessageSquare,
  FileText,
  ArrowRight,
  CalendarCheck,
  CheckSquare,
  Sparkles,
  ArrowLeftRight,
  AlertCircle,
} from 'lucide-react';
import { TimelineEntry, TimelineEntryType, TimelineSource } from '@/types';
import { cn } from '@/lib/utils';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';

interface TimelineProps {
  entries: TimelineEntry[];
  compact?: boolean;
}

const typeConfig: Record<TimelineEntryType, { icon: React.ElementType; color: string; label: string }> = {
  message:          { icon: MessageSquare,  color: 'text-cyan-600 bg-cyan-50 border-cyan-200',      label: 'Mensagem' },
  note:             { icon: FileText,        color: 'text-violet-600 bg-violet-50 border-violet-200', label: 'Nota' },
  stage_change:     { icon: ArrowRight,      color: 'text-amber-600 bg-amber-50 border-amber-200',    label: 'Estágio' },
  return:           { icon: CalendarCheck,   color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Retorno' },
  task:             { icon: CheckSquare,     color: 'text-blue-600 bg-blue-50 border-blue-200',       label: 'Tarefa' },
  ai_action:        { icon: Sparkles,        color: 'text-primary bg-primary/10 border-primary/20',   label: 'IA' },
  transfer:         { icon: ArrowLeftRight,  color: 'text-slate-600 bg-slate-50 border-slate-200',    label: 'Transferência' },
  important_change: { icon: AlertCircle,     color: 'text-red-600 bg-red-50 border-red-200',          label: 'Alteração' },
};

// Origin of the action — structural prep for AI/Automation sprints (Sprint 008).
// No AI/automation logic runs yet; this only labels who/what created the entry.
const sourceConfig: Record<TimelineSource, { label: string; color: string }> = {
  human:      { label: 'Humano',    color: 'text-foreground bg-muted border-border' },
  ai:         { label: 'IA',        color: 'text-primary bg-primary/10 border-primary/20' },
  automation: { label: 'Automação', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  system:     { label: 'Sistema',   color: 'text-slate-600 bg-slate-50 border-slate-200' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
         d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export const Timeline: React.FC<TimelineProps> = ({ entries, compact = false }) => {
  if (entries.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        Nenhum registro no histórico.
      </div>
    );
  }

  return (
    <div className={cn('relative', compact ? 'space-y-2' : 'space-y-3')}>
      {entries.map((entry, idx) => {
        const cfg = typeConfig[entry.type];
        const Icon = cfg.icon;
        const channelCfg = entry.channel ? CHANNEL_CONFIG[entry.channel] : null;
        const ChannelIcon = channelCfg?.icon;
        const sourceCfg = entry.source ? sourceConfig[entry.source] : null;

        return (
          <div key={entry.id} className="flex gap-2.5">
            {/* Connector line */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="relative">
                <div className={cn('w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0', cfg.color)}>
                  <Icon className="w-3 h-3" />
                </div>
                {channelCfg && ChannelIcon && (
                  <span
                    title={channelCfg.label}
                    className={cn('absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border flex items-center justify-center bg-background', channelCfg.color)}
                  >
                    <ChannelIcon className="w-2 h-2" />
                  </span>
                )}
              </div>
              {idx < entries.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1 min-h-[8px]" />
              )}
            </div>

            {/* Content */}
            <div className={cn('flex-1 min-w-0', compact ? 'pb-2' : 'pb-3')}>
              <p className={cn('text-foreground leading-snug', compact ? 'text-[11px]' : 'text-xs')}>
                {entry.content}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(entry.createdAt)}
                </span>
                {entry.createdByName && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                    <span className="text-[10px] text-muted-foreground">{entry.createdByName}</span>
                  </>
                )}
                {entry.createdByType === 'nina' && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                    <span className="text-[10px] text-primary font-medium">Nina IA</span>
                  </>
                )}
                {sourceCfg && (
                  <span className={cn('px-1 py-px rounded text-[9px] font-medium border', sourceCfg.color)}>
                    {sourceCfg.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
