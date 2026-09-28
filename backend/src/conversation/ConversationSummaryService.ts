import { callModel } from '../runtime/ModelGateway.js';
import { conversationRepository } from '../persistence/ConversationRepository.js';
import type { IncomingMessage } from '../types/index.js';

/** Same shape as the frontend's `ConversationSummary` (src/ai/types/copilot.ts). */
export interface ConversationSummary {
  motivo: string;
  contexto: string;
  pendencias: string[];
  ultimaAcao: string;
  proximoPasso: string;
  updatedAt: string;
}

const SPEAKER: Record<IncomingMessage['fromType'], string> = {
  user: 'Cliente',
  nina: 'Lu (IA)',
  human: 'Atendente',
};

const MAX_CHARS_PER_MESSAGE = 1000;

const SYSTEM_PROMPT = [
  'Você é a Lu, atendente virtual da Lumina. Sua tarefa agora NÃO é responder o cliente:',
  'é resumir a conversa para o atendente humano que vai assumir ou continuar o atendimento.',
  'Use apenas o que está na conversa — nunca invente pedidos, valores, prazos ou dados.',
  'Escreva em português do Brasil, frases curtas e objetivas.',
  'Responda SOMENTE com um JSON válido, sem texto fora dele, no formato:',
  '{"motivo": string, "contexto": string, "pendencias": string[], "ultimaAcao": string, "proximoPasso": string}',
  '- motivo: por que o cliente entrou em contato (1 frase).',
  '- contexto: o que já foi conversado e os fatos relevantes (até 3 frases).',
  '- pendencias: o que ficou em aberto ou aguardando alguém ([] se nada).',
  '- ultimaAcao: a última coisa que aconteceu na conversa e quem fez.',
  '- proximoPasso: o que o atendente deve fazer a seguir.',
].join('\n');

function buildTranscript(messages: IncomingMessage[]): string {
  return messages
    .map((m) => {
      const text = m.content.length > MAX_CHARS_PER_MESSAGE ? `${m.content.slice(0, MAX_CHARS_PER_MESSAGE)}…` : m.content;
      return `${SPEAKER[m.fromType] ?? 'Desconhecido'}: ${text}`;
    })
    .join('\n');
}

/** Models sometimes wrap JSON in ``` fences or add a sentence around it — keep only the outermost object. */
function extractJson(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('A Lu não devolveu um resumo válido.');
  return JSON.parse(raw.slice(start, end + 1));
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function summarizeConversation(conversationId: string): Promise<ConversationSummary> {
  const { contactName, messages } = await conversationRepository.getSummaryTranscript(conversationId);
  if (messages.length === 0) throw new Error('Conversa sem mensagens de texto para resumir.');

  const response = await callModel('atendimento', {
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Cliente: ${contactName ?? 'não identificado'}\n\nConversa (mais antiga → mais recente):\n${buildTranscript(messages)}`,
      },
    ],
  });

  const parsed = extractJson(response.content) as Record<string, unknown>;
  return {
    motivo: asText(parsed.motivo),
    contexto: asText(parsed.contexto),
    pendencias: Array.isArray(parsed.pendencias) ? parsed.pendencias.map(asText).filter(Boolean) : [],
    ultimaAcao: asText(parsed.ultimaAcao),
    proximoPasso: asText(parsed.proximoPasso),
    updatedAt: new Date().toISOString(),
  };
}
