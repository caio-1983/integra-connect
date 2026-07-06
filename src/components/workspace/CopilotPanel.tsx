import React from 'react';
import {
  Bot, Sparkles, RefreshCw, MessageSquareText, CheckSquare,
  TrendingUp, BookOpen, ScanSearch,
} from 'lucide-react';
import { UIConversation } from '@/types';
import { cn } from '@/lib/utils';
import { useAgentSession } from '@/ai/hooks/useAgentSession';
import { getKnowledgeProvider } from '@/ai/services/knowledgeService';
import type { ConversationMode, SentimentType } from '@/ai/types';

interface CopilotPanelProps {
  conversation: UIConversation;
  sdrName: string;
  onInsertToComposer: (text: string) => void;
}

const MODE_CONFIG: Record<ConversationMode, { label: string; color: string }> = {
  autonomous: { label: 'Atendimento Autônomo', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  copilot: { label: 'Copiloto', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  human_only: { label: 'IA inativa nesta conversa', color: 'bg-muted text-muted-foreground border-border' },
  paused: { label: 'IA pausada', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const SENTIMENT_COLOR: Record<SentimentType, string> = {
  'Positivo': 'bg-emerald-500',
  'Neutro': 'bg-slate-400',
  'Negativo': 'bg-amber-500',
  'Crítico': 'bg-red-500',
};

const CopilotPanel: React.FC<CopilotPanelProps> = ({ conversation, sdrName, onInsertToComposer }) => {
  const { copilot, mode, agentDisplayName, refreshSummary } = useAgentSession(conversation);
  const [refreshing, setRefreshing] = React.useState(false);

  const lastCustomerMessage = [...conversation.messages].reverse().find((m) => m.fromType === 'user');
  const knowledgeHits = lastCustomerMessage ? getKnowledgeProvider().search(lastCustomerMessage.content) : [];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSummary();
    } finally {
      setRefreshing(false);
    }
  };

  const modeCfg = MODE_CONFIG[mode];

  return (
    <div className="flex flex-col gap-4 px-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Bot className="w-3 h-3" />
          {agentDisplayName || sdrName}
        </p>
        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', modeCfg.color)}>
          {modeCfg.label}
        </span>
      </div>

      {/* Resumo Inteligente */}
      <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Resumo Inteligente
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-[10px] font-medium text-violet-700 hover:text-violet-900 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
            Atualizar Resumo
          </button>
        </div>
        {copilot?.summary ? (
          <div className="space-y-1.5 text-xs text-foreground">
            <p><span className="font-semibold">Motivo:</span> {copilot.summary.motivo}</p>
            <p><span className="font-semibold">Contexto:</span> {copilot.summary.contexto}</p>
            {copilot.summary.pendencias.length > 0 && (
              <p><span className="font-semibold">Pendências:</span> {copilot.summary.pendencias.join('; ')}</p>
            )}
            <p><span className="font-semibold">Última ação:</span> {copilot.summary.ultimaAcao}</p>
            <p><span className="font-semibold">Próximo passo:</span> {copilot.summary.proximoPasso}</p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Clique em "Atualizar Resumo" para gerar a primeira análise.</p>
        )}
      </div>

      {/* Intenção + Sentimento */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-2.5 rounded-lg bg-muted border border-border">
          <p className="text-[10px] text-muted-foreground mb-1">Intenção</p>
          {copilot?.intent ? (
            <>
              <p className="text-xs font-bold text-foreground">{copilot.intent.intent}</p>
              <p className="text-[10px] text-muted-foreground">{Math.round(copilot.intent.confidence * 100)}% confiança</p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">—</p>
          )}
        </div>
        <div className="p-2.5 rounded-lg bg-muted border border-border">
          <p className="text-[10px] text-muted-foreground mb-1">Sentimento</p>
          {copilot?.sentiment ? (
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span className={cn('w-1.5 h-1.5 rounded-full', SENTIMENT_COLOR[copilot.sentiment.sentiment])} />
              {copilot.sentiment.sentiment}
            </span>
          ) : (
            <p className="text-[11px] text-muted-foreground">—</p>
          )}
        </div>
      </div>

      {/* Respostas Sugeridas */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquareText className="w-3 h-3" />
          Respostas Sugeridas
        </p>
        {copilot?.suggestedReplies.length ? (
          <div className="flex flex-col gap-1.5">
            {copilot.suggestedReplies.slice(0, 3).map((reply) => (
              <button
                key={reply.id}
                type="button"
                onClick={() => onInsertToComposer(reply.text)}
                className="text-left text-[11px] px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors"
              >
                {reply.text}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Nenhuma sugestão disponível ainda.</p>
        )}
      </div>

      {/* Informações Detectadas */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ScanSearch className="w-3 h-3" />
          Informações Detectadas
        </p>
        {copilot?.extractedInfo && Object.keys(copilot.extractedInfo).length > 0 ? (
          <div className="p-2.5 rounded-lg border border-border bg-card space-y-1 text-[11px]">
            {copilot.extractedInfo.nome && <p><span className="text-muted-foreground">Nome:</span> {copilot.extractedInfo.nome}</p>}
            {copilot.extractedInfo.empresa && <p><span className="text-muted-foreground">Empresa:</span> {copilot.extractedInfo.empresa}</p>}
            {copilot.extractedInfo.email && <p><span className="text-muted-foreground">E-mail:</span> {copilot.extractedInfo.email}</p>}
            {copilot.extractedInfo.telefone && <p><span className="text-muted-foreground">Telefone:</span> {copilot.extractedInfo.telefone}</p>}
            {copilot.extractedInfo.cidade && <p><span className="text-muted-foreground">Cidade:</span> {copilot.extractedInfo.cidade}</p>}
            {copilot.extractedInfo.valores?.length ? <p><span className="text-muted-foreground">Valores:</span> {copilot.extractedInfo.valores.join(', ')}</p> : null}
            {copilot.extractedInfo.datas?.length ? <p><span className="text-muted-foreground">Datas:</span> {copilot.extractedInfo.datas.join(', ')}</p> : null}
            <p className="text-[10px] text-muted-foreground/70 pt-1">Nada é salvo automaticamente no CRM.</p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Nenhuma informação detectada ainda.</p>
        )}
      </div>

      {/* Tarefas Sugeridas */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CheckSquare className="w-3 h-3" />
          Tarefas Sugeridas
        </p>
        {copilot?.suggestedTasks.length ? (
          <ul className="space-y-1">
            {copilot.suggestedTasks.map((task) => (
              <li key={task.id} className="text-[11px] text-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                {task.title}{task.dueHint ? ` — ${task.dueHint}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground">Nenhuma tarefa sugerida ainda.</p>
        )}
      </div>

      {/* Negócio Sugerido */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" />
          Negócio Sugerido
        </p>
        {copilot?.suggestedDeal ? (
          <div className="p-2.5 rounded-lg border border-border bg-card text-[11px] space-y-0.5">
            <p className="font-semibold text-foreground">{copilot.suggestedDeal.title}</p>
            {copilot.suggestedDeal.estimatedValue && (
              <p className="text-muted-foreground">Valor estimado: R$ {copilot.suggestedDeal.estimatedValue.toLocaleString('pt-BR')}</p>
            )}
            {copilot.suggestedDeal.stageHint && <p className="text-muted-foreground">Estágio sugerido: {copilot.suggestedDeal.stageHint}</p>}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Nenhum negócio sugerido no momento.</p>
        )}
      </div>

      {/* Base de Conhecimento */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-3 h-3" />
          Base de Conhecimento
        </p>
        {knowledgeHits.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {knowledgeHits.map(({ article }) => (
              <div key={article.id} className="p-2.5 rounded-lg border border-dashed border-border text-[11px]">
                <p className="font-semibold text-foreground">{article.title}</p>
                <p className="text-muted-foreground line-clamp-2">{article.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-dashed border-border text-center">
            <p className="text-[11px] text-muted-foreground">Nenhum artigo relevante encontrado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { CopilotPanel };
