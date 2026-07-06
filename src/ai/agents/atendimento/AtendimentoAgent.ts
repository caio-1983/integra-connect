import type { AgentConfig, AgentContext, AgentExecutionResult, AgentId } from '@/ai/types';
import { BaseAgent } from '../BaseAgent';
import { MOCK_AGENT_CONFIGS } from '@/lib/mockAIData';
import { buildContext } from '@/ai/services/ContextBuilder';
import { buildPrompt } from '@/ai/services/PromptBuilder';
import { chat } from '@/ai/services/modelGateway';
import { classifyIntent, classifySentiment, extractEntities } from '@/ai/services/nlpHeuristics';
import { evaluate } from '@/ai/services/HandoffService';
import { getMemoryProvider } from '@/ai/memory';
import { ATENDIMENTO_PROMPT } from '@/ai/prompts/atendimento.prompts';

const DEFAULT_CONFIG = MOCK_AGENT_CONFIGS.find((c) => c.id === 'atendimento')!;

/** The only functional agent this sprint — talks to the customer autonomously and stays on as Copilot after handoff. */
class AtendimentoAgent extends BaseAgent {
  readonly id: AgentId = 'atendimento';
  readonly config: AgentConfig = DEFAULT_CONFIG;

  async execute(context: AgentContext): Promise<AgentExecutionResult> {
    const customerText = context.latestCustomerMessage?.content ?? '';
    const intent = classifyIntent(customerText);
    const sentiment = classifySentiment(customerText);

    const enriched = await buildContext(context, this.config);
    const request = buildPrompt(enriched, ATENDIMENTO_PROMPT);
    const response = await chat(this.config.modelId, request);

    const extracted = extractEntities(customerText);
    if (Object.keys(extracted).length > 0) {
      getMemoryProvider().remember({
        scope: { conversationId: context.conversationId, personId: context.contactId },
        kind: 'customer',
        content: JSON.stringify(extracted),
        metadata: { ...extracted },
      });
    }

    const confidence = intent.confidence;
    const handoff = evaluate(context, intent, sentiment, confidence);

    return {
      reply: { content: response.content, intent, sentiment, confidence },
      handoff,
    };
  }
}

export function createAtendimentoAgent(): AtendimentoAgent {
  return new AtendimentoAgent();
}
