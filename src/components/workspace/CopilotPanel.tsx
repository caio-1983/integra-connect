import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { UIConversation } from '@/types';
import { cn } from '@/lib/utils';
import { useAgentSession } from '@/ai/hooks/useAgentSession';

interface CopilotPanelProps {
  conversation: UIConversation;
  sdrName: string;
}

const CopilotPanel: React.FC<CopilotPanelProps> = ({ conversation, sdrName }) => {
  const { copilot, refreshSummary } = useAgentSession(conversation);
  const [refreshing, setRefreshing] = React.useState(false);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);

  React.useEffect(() => setSummaryError(null), [conversation.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setSummaryError(null);
    try {
      await refreshSummary();
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'A Lu não conseguiu resumir a conversa.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 px-4">
      <div className="flex items-center gap-2.5">
        <Sparkles className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <h3 className="text-[13px] font-semibold text-foreground flex-1">Resumo da {sdrName}</h3>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-8 px-3 rounded-full text-xs font-semibold border border-input bg-card text-primary hover:bg-accent flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          {refreshing ? 'Resumindo…' : copilot?.summary ? 'Atualizar' : 'Gerar resumo'}
        </button>
      </div>

      {summaryError && <p className="text-xs text-destructive">{summaryError}</p>}

      {copilot?.summary ? (
        <dl className="flex flex-col gap-3 text-[13px] leading-relaxed">
          {[
            ['Motivo', copilot.summary.motivo],
            ['Contexto', copilot.summary.contexto],
            ['Pendências', copilot.summary.pendencias.join('; ')],
            ['Última ação', copilot.summary.ultimaAcao],
            ['Próximo passo', copilot.summary.proximoPasso],
          ].filter(([, value]) => value).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
              <dd className="text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">A Lu lê a conversa inteira e resume para quem vai continuar o atendimento.</p>
      )}
    </div>
  );
};

export { CopilotPanel };
