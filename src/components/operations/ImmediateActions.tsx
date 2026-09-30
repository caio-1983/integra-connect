import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, MessageSquare, AlertCircle, Calendar, Zap, ChevronRight, CloudOff, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActionItem {
  id: string;
  type: 'conversation' | 'appointment' | 'authorization' | 'integration' | 'overdue';
  label: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  href?: string;
  meta?: string;
}

interface ImmediateActionsProps {
  items: ActionItem[];
  loading?: boolean;
  /** A consulta falhou — não afirmar "tudo em dia" quando não sabemos. */
  error?: boolean;
}

// The count reads like WhatsApp's unread badge; urgent ones turn red.
const badgeTone = {
  high:   'bg-danger text-white',
  medium: 'bg-primary text-primary-foreground',
  low:    'bg-secondary text-secondary-foreground',
};

const typeIcon: Record<ActionItem['type'], React.ElementType> = {
  conversation:  MessageSquare,
  appointment:   Calendar,
  authorization: AlertCircle,
  integration:   Zap,
  overdue:       Clock,
};

const Notice: React.FC<{ icon: React.ElementType; title: string; text: string; tone?: string }> = ({ icon: Icon, title, text, tone }) => (
  <div className="flex items-center gap-4 px-6 py-4">
    <span className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', tone ?? 'bg-secondary text-icon')} aria-hidden="true">
      <Icon className="w-5 h-5" />
    </span>
    <div className="min-w-0">
      <p className="text-[15px] text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  </div>
);

const ImmediateActions: React.FC<ImmediateActionsProps> = ({ items, loading = false, error = false }) => {
  if (loading) {
    return (
      <div className="px-6 py-3 space-y-4 animate-pulse" aria-busy="true">
        {[1, 2].map(i => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 bg-secondary rounded" />
              <div className="h-2.5 w-64 bg-secondary/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <Notice icon={CloudOff} title="Não foi possível verificar as pendências" text="A consulta ao banco falhou. Clique em Atualizar para tentar de novo." />;
  }

  if (items.length === 0) {
    return (
      <Notice
        icon={CheckCircle2}
        tone="bg-success-subtle text-success"
        title="Tudo em dia"
        text="Nenhuma conversa esperando a equipe e nenhum agendamento vencido."
      />
    );
  }

  return (
    <ul className="pb-2">
      {items.map((item) => {
        const ItemIcon = typeIcon[item.type];
        const content = (
          <>
            <span
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                item.urgency === 'high' ? 'bg-danger-subtle text-danger' : 'bg-secondary text-icon',
              )}
              aria-hidden="true"
            >
              <ItemIcon className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0 py-3 border-b border-border group-last/li:border-b-0 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[17px] leading-[21px] text-foreground sm:truncate">{item.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">{item.description}</p>
              </div>
              {item.meta && (
                <span className={cn('min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold tabular-nums flex items-center justify-center flex-shrink-0', badgeTone[item.urgency])}>
                  <span className="sr-only">{item.urgency === 'high' ? 'Urgente: ' : ''}</span>{item.meta}
                </span>
              )}
              {item.href && <ChevronRight className="w-5 h-5 text-icon flex-shrink-0" aria-hidden="true" />}
            </div>
          </>
        );

        return (
          <li key={item.id} className="group/li">
            {item.href ? (
              <Link to={item.href} className="flex items-center gap-4 px-6 hover:bg-accent transition-colors focus-visible:ring-inset focus-visible:ring-offset-0">
                {content}
              </Link>
            ) : (
              <div className="flex items-center gap-4 px-6">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export { ImmediateActions };
