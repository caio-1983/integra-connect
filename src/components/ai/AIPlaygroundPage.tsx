import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout';
import { Button } from '@/components/Button';
import { MessageDirection, MessageType } from '@/types';
import type { ClientMemory, UIMessage } from '@/types';
import type { AgentContext, AgentId } from '@/ai/types';
import { getAgent, getAllAgents } from '@/ai/services/agent-factory';
import { MOCK_PLAYGROUND_PRESETS } from '@/lib/mockAIData';

const EMPTY_CLIENT_MEMORY: ClientMemory = {
  last_updated: null,
  lead_profile: {
    interests: [], lead_stage: 'new', objections: [], products_discussed: [],
    communication_style: 'unknown', qualification_score: 0,
  },
  sales_intelligence: {
    pain_points: [], next_best_action: 'qualify', budget_indication: '', decision_timeline: '',
  },
  interaction_summary: {
    response_pattern: '', last_contact_reason: '', total_conversations: 0, preferred_contact_time: '',
  },
  conversation_history: [],
};

function makeMessage(content: string, fromType: UIMessage['fromType']): UIMessage {
  return {
    id: `pg-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    content,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    direction: fromType === 'user' ? MessageDirection.INCOMING : MessageDirection.OUTGOING,
    type: MessageType.TEXT,
    status: 'sent',
    fromType,
    mediaUrl: null,
    whatsappMessageId: null,
  };
}

const AIPlaygroundPage: React.FC = () => {
  const [agentId, setAgentId] = useState<AgentId>('atendimento');
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [meta, setMeta] = useState<Record<string, { intent: string; confidence: number; sentiment: string }>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const agents = getAllAgents();

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const agent = getAgent(agentId);
    if (!agent.canHandle({} as AgentContext)) {
      setInput('');
      setMessages((prev) => [...prev, makeMessage(content, 'user'), makeMessage(`${agent.config.name} ainda não está implementado nesta sprint.`, 'nina')]);
      return;
    }

    const userMessage = makeMessage(content, 'user');
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const context: AgentContext = {
        conversationId: 'playground',
        contactId: 'playground-user',
        contactName: 'Você (Playground)',
        channel: 'webchat',
        messages: nextMessages,
        clientMemory: EMPTY_CLIENT_MEMORY,
        mode: 'autonomous',
        latestCustomerMessage: userMessage,
      };

      const result = await agent.execute(context);
      const aiMessage = makeMessage(result.reply.content, 'nina');
      setMessages((prev) => [...prev, aiMessage]);
      setMeta((prev) => ({
        ...prev,
        [aiMessage.id]: {
          intent: `${result.reply.intent.intent} (${Math.round(result.reply.intent.confidence * 100)}%)`,
          confidence: result.reply.confidence,
          sentiment: result.reply.sentiment.sentiment,
        },
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Testes"
        description="Converse diretamente com um agente usando apenas o LocalAIProvider — valide prompts antes de publicar."
      />

      <div className="rounded-xl border border-border bg-card flex flex-col h-[560px]">
        <div className="p-3 border-b border-border flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Agente</label>
          <select
            value={agentId}
            onChange={(e) => { setAgentId(e.target.value as AgentId); setMessages([]); }}
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.config.name}{a.config.status !== 'active' ? ' (em preparação)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {MOCK_PLAYGROUND_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSend(preset)}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.fromType === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.fromType !== 'user' && <Bot className="w-4 h-4 text-violet-600 mt-1 flex-shrink-0" />}
              <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${m.fromType === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                <p>{m.content}</p>
                {meta[m.id] && (
                  <p className="mt-1 text-[10px] opacity-70">
                    Intenção: {meta[m.id].intent} · Sentimento: {meta[m.id].sentiment}
                  </p>
                )}
              </div>
              {m.fromType === 'user' && <User className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite uma mensagem de teste..."
            className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <Button variant="primary" size="sm" onClick={() => handleSend()} disabled={loading || !input.trim()}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default AIPlaygroundPage;
