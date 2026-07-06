import type {
  AIChatRequest, AIChatResponse, AICompletionRequest, AICompletionResponse,
  AIEmbeddingsRequest, AIEmbeddingsResponse, AIProviderId, IntentType,
} from '@/ai/types';
import { BaseAIProvider } from './BaseAIProvider';
import { classifyIntent } from '@/ai/services/nlpHeuristics';

/**
 * The only fully implemented provider this sprint — runs entirely client
 * side, deterministic, no network call. Stands in for a real LLM until
 * OpenAI/Claude/Gemini/Ollama are wired up (see the sibling stub classes).
 */
const REPLY_TEMPLATES: Record<IntentType, string[]> = {
  'Orçamento': [
    'Claro! Posso te passar os valores certinho — me confirma quantos atendentes você precisa para eu indicar o plano ideal?',
    'Nosso Plano Profissional atende bem esse perfil. Quer que eu te envie a tabela completa de valores?',
  ],
  'Comercial': [
    'Ótimo interesse! Posso agendar uma demonstração para te mostrar tudo funcionando na prática.',
    'Podemos avançar com a proposta. Você prefere começar pelo plano mensal ou anual?',
  ],
  'Financeiro': [
    'Entendo, vou verificar essa questão financeira para você. Só um momento.',
    'Sobre cobranças e faturas, vou te transferir para alguém do time financeiro garantir que isso seja resolvido certinho.',
  ],
  'Suporte': [
    'Sinto muito pelo transtorno! Pode me contar um pouco mais sobre o que está acontecendo?',
    'Vou te ajudar com isso agora mesmo. Já tentou atualizar a página / reiniciar o app?',
  ],
  'Agendamento': [
    'Consigo te encaixar amanhã às 14h ou sexta às 10h. Qual fica melhor?',
    'Vou verificar a agenda e já te confirmo um horário.',
  ],
  'Reclamação': [
    'Sinto muito pela experiência. Pode me detalhar o que houve para eu resolver da melhor forma?',
    'Entendo sua frustração e quero resolver isso o quanto antes.',
  ],
  'Cancelamento': [
    'Antes de seguir com o cancelamento, posso entender o motivo? Talvez eu consiga ajudar de outra forma.',
    'Vou registrar seu pedido de cancelamento e te conectar com o time responsável.',
  ],
  'Pós-venda': [
    'Fico feliz em ajudar! Qualquer dúvida, estou por aqui.',
    'Obrigada pelo retorno! Se precisar de mais alguma coisa, é só chamar.',
  ],
};

function lastUserContent(req: AIChatRequest): string {
  const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
  return lastUser?.content ?? '';
}

function hashToVector(input: string, dimensions = 16): number[] {
  const vector: number[] = new Array(dimensions).fill(0);
  for (let i = 0; i < input.length; i++) {
    const idx = i % dimensions;
    vector[idx] = (vector[idx] + input.charCodeAt(i)) % 997;
  }
  return vector.map((v) => Number((v / 997).toFixed(4)));
}

class LocalAIProvider extends BaseAIProvider {
  readonly id: AIProviderId = 'local';

  async chat(req: AIChatRequest): Promise<AIChatResponse> {
    const content = lastUserContent(req);
    const { intent } = classifyIntent(content);
    const templates = REPLY_TEMPLATES[intent];
    const text = templates[req.messages.length % templates.length];
    return { content: text, tokensUsed: text.length, latencyMs: 350 };
  }

  async embeddings(req: AIEmbeddingsRequest): Promise<AIEmbeddingsResponse> {
    const vector = hashToVector(req.input);
    return { vector, dimensions: vector.length };
  }

  async completion(req: AICompletionRequest): Promise<AICompletionResponse> {
    return { text: `[local-mock] ${req.prompt.slice(0, 160)}` };
  }
}

export function createLocalAIProvider(): LocalAIProvider {
  return new LocalAIProvider();
}
