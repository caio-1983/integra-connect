import { callModel } from '../runtime/ModelGateway.js';
import { conversationRepository } from '../persistence/ConversationRepository.js';
import type { IncomingMessage } from '../types/index.js';
import { logger } from '../logger/Logger.js';

export type InsightMode = 'default' | 'shorter' | 'alternative';

/** Same shape as the frontend's `ConversationInsight` (src/ai/types/insight.ts). */
export interface ConversationInsight {
  /** Draft reply for the attendant — never sent automatically. Empty when there is nothing to answer. */
  reply: string;
  /** One line on what the customer asked, shown inside the timeline. */
  annotation: string;
  /** What the customer needs, in their situation — the basis for recommending the right product. */
  need: Record<string, string>;
  /** Order facts stated in the conversation (produto, quantidade, cep, pagamento…). */
  fields: Record<string, string>;
  /** What is still unknown to recommend the right product or close the quote. */
  missing: string[];
  nextSteps: string[];
  basedOnMessageId: string;
  /** True while the last message is the customer's — the reply is only relevant then. */
  awaitingReply: boolean;
  updatedAt: string;
}

const SPEAKER: Record<IncomingMessage['fromType'], string> = {
  user: 'Cliente',
  nina: 'Lu (IA)',
  human: 'Atendente',
};

const MAX_CHARS_PER_MESSAGE = 1000;

// Shown to the attendant — provider errors stay in the server log only.
const UNAVAILABLE_MESSAGE = 'A Lu está sem acesso à IA no momento — avise o administrador.';
const INVALID_REPLY_MESSAGE = 'A Lu não conseguiu ler a conversa. Tente de novo.';

const NEED_KEYS = ['ambiente', 'uso', 'instalacao', 'medidas', 'tomDeLuz', 'orcamento'] as const;
const FIELD_KEYS = ['produto', 'quantidade', 'cep', 'pagamento'] as const;

const SYSTEM_PROMPT = [
  'Você é a Lu, consultora de iluminação da Lumina (loja de iluminação LED).',
  'Você NÃO fala com o cliente: você ajuda o atendente humano, que decide o que enviar.',
  'Quase sempre o cliente não sabe qual é o melhor produto para a realidade dele.',
  'Por isso seu foco é entender a NECESSIDADE (ambiente, uso, tipo de instalação, medidas/pé-direito, tom de luz, orçamento)',
  'antes de falar em preço. Se o cliente citou um produto, verifique se ele serve para o uso descrito.',
  'Use apenas o que está na conversa — nunca invente preços, prazos, estoque, frete ou características de produto.',
  'Quando a resposta precisar de um dado que você não tem (preço, frete, prazo), escreva um marcador entre colchetes, ex.: [VALOR DO FRETE].',
  'Escreva em português do Brasil, tom cordial e direto, como no WhatsApp. Sem emojis em excesso.',
  'Responda SOMENTE com um JSON válido, sem texto fora dele, no formato:',
  '{"reply": string, "annotation": string, "need": {"ambiente"?: string, "uso"?: string, "instalacao"?: string, "medidas"?: string, "tomDeLuz"?: string, "orcamento"?: string},',
  ' "fields": {"produto"?: string, "quantidade"?: string, "cep"?: string, "pagamento"?: string}, "missing": string[], "nextSteps": string[]}',
  '- reply: a próxima mensagem que o atendente pode enviar. Responda o que o cliente perguntou;',
  '  se faltar informação para indicar o produto certo, faça no máximo 2 perguntas de descoberta. "" se não houver o que responder.',
  '- annotation: 1 linha curta com o que o cliente quer (ex.: "Spot Kian · 40 un · CEP 28660-000 · quer frete e desconto à vista").',
  '- need / fields: só o que o cliente disse; omita a chave se não souber.',
  '- missing: o que ainda falta saber para recomendar ou fechar o orçamento (itens curtos, máx. 4).',
  '- nextSteps: ações do atendente, curtas e no infinitivo (máx. 4).',
].join('\n');

const MODE_INSTRUCTION: Record<InsightMode, string> = {
  default: '',
  shorter: '\n\nO atendente pediu uma versão MAIS CURTA da resposta: no máximo 2 frases.',
  alternative: '\n\nO atendente pediu OUTRA VERSÃO da resposta, com abordagem diferente da anterior.',
};

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
  if (start === -1 || end <= start) throw new Error('no JSON object in model reply');
  return JSON.parse(raw.slice(start, end + 1));
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function pick(value: unknown, keys: readonly string[]): Record<string, string> {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const out: Record<string, string> = {};
  for (const key of keys) {
    const text = asText(source[key]);
    if (text) out[key] = text;
  }
  return out;
}

function list(value: unknown, max: number): string[] {
  return Array.isArray(value) ? value.map(asText).filter(Boolean).slice(0, max) : [];
}

/**
 * Reads the latest messages and returns Lu's copilot view of the conversation.
 * `default` reuses the cached insight while no new message arrived, so every
 * attendant opening the conversation shares one model call.
 */
export async function getConversationInsight(conversationId: string, mode: InsightMode = 'default'): Promise<ConversationInsight | null> {
  const input = await conversationRepository.getInsightInput(conversationId);
  if (!input.lastMessageId || input.messages.length === 0) return null;
  const awaitingReply = input.lastFromType === 'user';

  if (mode === 'default') {
    const cached = await conversationRepository.getCachedInsight(conversationId);
    if (cached && cached.lastMessageId === input.lastMessageId) {
      return { ...(cached.payload as ConversationInsight), awaitingReply };
    }
    // Nobody is waiting on an answer (the team spoke last): keep showing what Lu
    // already read instead of paying for a new call — it regenerates on the next inbound.
    if (!awaitingReply) {
      return cached ? { ...(cached.payload as ConversationInsight), reply: '', awaitingReply } : null;
    }
  }

  let response: Awaited<ReturnType<typeof callModel>>;
  try {
    response = await callModel('atendimento', {
      temperature: mode === 'alternative' ? 0.7 : 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + MODE_INSTRUCTION[mode] },
        {
          role: 'user',
          content: `Cliente: ${input.contactName ?? 'não identificado'}\n\nConversa (mais antiga → mais recente):\n${buildTranscript(input.messages)}`,
        },
      ],
    });
  } catch (err) {
    logger.error({ err, conversationId }, '[insight] model call failed');
    throw new Error(UNAVAILABLE_MESSAGE);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJson(response.content) as Record<string, unknown>;
  } catch (err) {
    logger.warn({ err, conversationId, reply: response.content.slice(0, 500) }, '[insight] unparseable model reply');
    throw new Error(INVALID_REPLY_MESSAGE);
  }

  const insight: ConversationInsight = {
    reply: asText(parsed.reply),
    annotation: asText(parsed.annotation),
    need: pick(parsed.need, NEED_KEYS),
    fields: pick(parsed.fields, FIELD_KEYS),
    missing: list(parsed.missing, 4),
    nextSteps: list(parsed.nextSteps, 4),
    basedOnMessageId: input.lastMessageId,
    awaitingReply,
    updatedAt: new Date().toISOString(),
  };

  await conversationRepository.saveInsight(conversationId, input.lastMessageId, insight);
  return insight;
}
