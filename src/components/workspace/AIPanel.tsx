import React from 'react';
import { Bot, Zap, Lightbulb, BookOpen } from 'lucide-react';
import { UIConversation } from '@/types';

interface AIPanelProps {
  conversation: UIConversation;
  sdrName: string;
}

const ACTION_LABELS: Record<string, string> = {
  qualify:    'Qualificar contato',
  demo:       'Agendar demonstração',
  follow_up:  'Realizar follow-up',
  close:      'Tentar fechamento',
};

const AIPanel: React.FC<AIPanelProps> = ({ conversation, sdrName }) => {
  const { sales_intelligence, lead_profile } = conversation.clientMemory;

  return (
    <div className="flex flex-col gap-5 px-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Bot className="w-3 h-3" />
        {sdrName} — Inteligência
      </p>

      {/* Next best action */}
      <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap className="w-3 h-3 text-violet-700" />
          <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">Próxima Ação</p>
        </div>
        <p className="text-xs text-foreground">
          {ACTION_LABELS[sales_intelligence.next_best_action] || sales_intelligence.next_best_action}
        </p>
      </div>

      {/* Qualification score */}
      {lead_profile.qualification_score > 0 && (
        <div className="p-2.5 rounded-lg bg-muted border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-muted-foreground">Score de Qualificação</p>
            <span className="text-sm font-bold text-primary">{lead_profile.qualification_score}/10</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-teal-500 transition-all"
              style={{ width: `${(lead_profile.qualification_score / 10) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Pain points */}
      {sales_intelligence.pain_points.length > 0 && (
        <div className="p-2.5 rounded-lg bg-muted border border-border">
          <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3 h-3" />
            Dores Identificadas
          </p>
          <ul className="space-y-1">
            {sales_intelligence.pain_points.map((point, i) => (
              <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Knowledge base — infrastructure */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-3 h-3" />
          Base de Conhecimento
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 normal-case tracking-normal">Em breve</span>
        </p>
        <div className="p-3 rounded-lg border border-dashed border-border text-center">
          <p className="text-[11px] text-muted-foreground">Sugestões de resposta aparecerão aqui.</p>
        </div>
      </div>

      {/* Apply button — infrastructure */}
      <button
        disabled
        className="w-full py-2 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground cursor-not-allowed"
      >
        Aplicar Sugestão — Em breve
      </button>
    </div>
  );
};

export { AIPanel };
