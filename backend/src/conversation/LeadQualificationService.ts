import { callModel } from '../runtime/ModelGateway.js';
import { conversationRepository } from '../persistence/ConversationRepository.js';
import type { IncomingMessage } from '../types/index.js';
import { logger } from '../logger/Logger.js';

/**
 * Lead qualification (BANT-style, four criteria × 25%). Lives inside
 * `contacts.client_memory.qualification`; the frontend's `LeadQualification`
 * (src/types/index.ts) has the same shape. Lu only suggests: a criterion the
 * attendant set (`source: 'human'`) is never overwritten here.
 */
export const QUALIFICATION_KEYS = ['need', 'budget', 'timeline', 'decider'] as const;
export type QualificationKey = typeof QUALIFICATION_KEYS[number];

export interface QualificationField {
  value: string;
  source: 'lu' | 'human';
  updated_at: string;
}

export type LeadQualification = Partial<Record<QualificationKey, QualificationField>>;

const SPEAKER: Record<IncomingMessage['fromType'], string> = {
  user: 'Cliente',
  nina: 'Lu (IA)',
  human: 'Atendente',
};

const MAX_CHARS_PER_MESSAGE = 1000;
const UNAVAILABLE_MESSAGE = 'A Lu está sem acesso à IA no momento — avise o administrador.';
const INVALID_REPLY_MESSAGE = 'A Lu não conseguiu qualificar o lead. Tente de novo.';

const SYSTEM_PROMPT = [
  'Você é a Lu, atendente virtual da Lumina (iluminação LED). Sua tarefa agora NÃO é responder o cliente:',
  'é qualificar o lead para o atendente humano, a partir da conversa.',
  'Use apenas o que o cliente disse — nunca invente. Se um critério não aparece na conversa, devolva null.',
  'Responda SOMENTE com um JSON válido, sem texto fora dele, no formato:',
  '{"need": string|null, "budget": string|null, "timeline": string|null, "decider": string|null}',
  '- need: o que o cliente precisa (ambiente, tipo de obra, se já tem projeto luminotécnico). 1 frase curta.',
  '- budget: faixa de valor ou indicação de orçamento que o cliente deu.',
  '- timeline: para quando ele precisa / quando pretende fechar.',
  '- decider: quem decide a compra (o próprio cliente, sócio, arquiteto, eletricista...).',
].join('\n');

function buildTranscript(messages: IncomingMessage[]): string {
  return messages
    .map((m) => {
      const text = m.content.length > MAX_CHARS_PER_MESSAGE ? `${m.content.slice(0, MAX_CHARS_PER_MESSAGE)}…` : m.content;
      return `${SPEAKER[m.fromType] ?? 'Desconhecido'}: ${text}`;
    })
    .join('\n');
}

function extractJson(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in model reply');
  return JSON.parse(raw.slice(start, end + 1));
}

export function qualificationScore(q: LeadQualification): number {
  return QUALIFICATION_KEYS.filter((k) => q[k]?.value?.trim()).length * 25;
}

/** Asks Lu for the four criteria and merges them into the contact's memory. Returns the updated `client_memory`. */
export async function qualifyLead(conversationId: string): Promise<Record<string, unknown>> {
  const [{ contactName, messages }, contact] = await Promise.all([
    conversationRepository.getSummaryTranscript(conversationId),
    conversationRepository.getContactMemoryByConversation(conversationId),
  ]);
  if (!contact) throw new Error('Conversa sem contato.');
  if (messages.length === 0) throw new Error('Conversa sem mensagens de texto para qualificar.');

  let response: Awaited<ReturnType<typeof callModel>>;
  try {
    response = await callModel('atendimento', {
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Cliente: ${contactName ?? 'não identificado'}\n\nConversa (mais antiga → mais recente):\n${buildTranscript(messages)}`,
        },
      ],
    });
  } catch (err) {
    logger.error({ err, conversationId }, '[qualification] model call failed');
    throw new Error(UNAVAILABLE_MESSAGE);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJson(response.content) as Record<string, unknown>;
  } catch (err) {
    logger.warn({ err, conversationId, reply: response.content.slice(0, 500) }, '[qualification] unparseable model reply');
    throw new Error(INVALID_REPLY_MESSAGE);
  }

  const memory = { ...(contact.memory ?? {}) } as Record<string, any>;
  const current: LeadQualification = { ...(memory.qualification ?? {}) };
  const now = new Date().toISOString();
  for (const key of QUALIFICATION_KEYS) {
    if (current[key]?.source === 'human') continue;
    const value = typeof parsed[key] === 'string' ? (parsed[key] as string).trim() : '';
    if (value) current[key] = { value, source: 'lu', updated_at: now };
  }

  memory.qualification = current;
  memory.last_updated = now;
  memory.lead_profile = { ...(memory.lead_profile ?? {}), qualification_score: qualificationScore(current) };
  memory.sales_intelligence = {
    ...(memory.sales_intelligence ?? {}),
    budget_indication: current.budget?.value || 'unknown',
    decision_timeline: current.timeline?.value || 'unknown',
  };

  await conversationRepository.updateContactMemory(contact.contactId, memory);
  return memory;
}
