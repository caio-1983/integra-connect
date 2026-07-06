import type {
  AgentContext, AgentId, ConversationSummary, CopilotState, ExtractedInfo,
  IntentClassification, SentimentClassification, SuggestedDeal, SuggestedReply, SuggestedTask,
} from '@/ai/types';
import { classifyIntent, classifySentiment, extractEntities } from './nlpHeuristics';
import { buildContext, type EnrichedContext } from './ContextBuilder';
import { getAgent } from './agent-factory';
import { getMemoryProvider } from '@/ai/memory';
import { publishAIEvent } from './aiEventBus';
import { SUGGESTED_REPLY_TEMPLATES, PROXIMO_PASSO_HINTS } from '@/ai/prompts/copilot.prompts';

const STORAGE_KEY = 'ic_copilot_state_v1';

function readAll(): Record<string, CopilotState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state: CopilotState): void {
  if (typeof window === 'undefined') return;
  try {
    const all = readAll();
    all[state.conversationId] = state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable — mock persistence is best-effort.
  }
}

export function getCopilotState(conversationId: string): CopilotState | undefined {
  return readAll()[conversationId];
}

function buildSummary(enriched: EnrichedContext, intent: IntentClassification): ConversationSummary {
  const personName = enriched.crm.person?.name ?? enriched.agentContext.contactName;
  const lastHistory = enriched.timelineEntries[0]?.content;
  const openDeals = enriched.crm.deals.filter((d) => !d.wonAt && !d.lostAt);

  return {
    motivo: `Cliente entrou em contato sobre ${intent.intent.toLowerCase()}.`,
    contexto: `${personName} conversando via ${enriched.agentContext.channel}.${lastHistory ? ` Último registro: ${lastHistory}` : ' Sem histórico anterior registrado.'}`,
    pendencias: openDeals.map((d) => `Negócio em aberto: ${d.title}`),
    ultimaAcao: 'IA analisou a última mensagem do cliente e classificou a intenção.',
    proximoPasso: PROXIMO_PASSO_HINTS[intent.intent],
    updatedAt: new Date().toISOString(),
  };
}

function buildSuggestedReplies(intent: IntentClassification): SuggestedReply[] {
  return SUGGESTED_REPLY_TEMPLATES[intent.intent].map((text, i) => ({ id: `sr-${intent.intent}-${i}`, text }));
}

function buildSuggestedTasks(intent: IntentClassification): SuggestedTask[] {
  return [{ id: `task-${intent.intent}`, title: `Fazer follow-up sobre ${intent.intent.toLowerCase()}`, dueHint: 'Amanhã' }];
}

function buildSuggestedDeal(intent: IntentClassification, enriched: EnrichedContext): SuggestedDeal | undefined {
  const hasOpenDeal = enriched.crm.deals.some((d) => !d.wonAt && !d.lostAt);
  if (hasOpenDeal || (intent.intent !== 'Orçamento' && intent.intent !== 'Comercial')) return undefined;

  const personName = enriched.crm.person?.name ?? enriched.agentContext.contactName;
  return { id: `deal-${enriched.agentContext.conversationId}`, title: `Oportunidade — ${personName}`, estimatedValue: 4970, stageHint: 'Qualificação' };
}

/** Recomputes the full Copilot panel state for a conversation — summary, intent, sentiment, suggestions, extraction. */
export async function refreshCopilotState(context: AgentContext, agentId: AgentId = 'atendimento'): Promise<CopilotState> {
  const agent = getAgent(agentId);
  const enriched = await buildContext(context, agent.config);

  const lastText = context.latestCustomerMessage?.content
    ?? context.messages[context.messages.length - 1]?.content
    ?? '';

  const intent: IntentClassification = classifyIntent(lastText);
  const sentiment: SentimentClassification = classifySentiment(lastText);
  const extractedInfo: ExtractedInfo = extractEntities(lastText);

  if (Object.keys(extractedInfo).length > 0) {
    getMemoryProvider().remember({
      scope: { conversationId: context.conversationId, personId: context.contactId },
      kind: 'customer',
      content: JSON.stringify(extractedInfo),
      metadata: { ...extractedInfo },
    });
  }

  const summary = buildSummary(enriched, intent);
  const at = new Date().toISOString();
  publishAIEvent({ type: 'SummaryUpdated', conversationId: context.conversationId, summary, at });
  publishAIEvent({ type: 'IntentDetected', conversationId: context.conversationId, intent, at });
  publishAIEvent({ type: 'SentimentDetected', conversationId: context.conversationId, sentiment, at });

  const state: CopilotState = {
    conversationId: context.conversationId,
    summary,
    intent,
    sentiment,
    suggestedReplies: buildSuggestedReplies(intent),
    suggestedTasks: buildSuggestedTasks(intent),
    suggestedDeal: buildSuggestedDeal(intent, enriched),
    extractedInfo,
    updatedAt: at,
  };

  saveState(state);
  return state;
}
