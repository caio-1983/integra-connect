import type { UIMessage } from '@/types';
import type { IntentClassification, IntentType, SentimentClassification, SentimentType, ExtractedInfo } from '@/ai/types';

/**
 * Deterministic, keyword/regex-based classification — the single source
 * shared by `LocalAIProvider` (to pick a plausible canned reply) and
 * `AtendimentoAgent`/`copilotService` (to drive intent/sentiment/extraction
 * shown in the Copilot panel). No randomness, so the same input always
 * produces the same output — this is the seam a real NLU/LLM call replaces.
 */

const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  'Orçamento': ['orçamento', 'orcamento', 'preço', 'preco', 'quanto custa', 'valor do plano', 'mensalidade', 'quanto sai'],
  'Comercial': ['contratar', 'proposta', 'demonstração', 'demonstracao', 'demo', 'fechar negócio', 'fechar negocio', 'assinar'],
  'Financeiro': ['fatura', 'boleto', 'pagamento', 'cobrança', 'cobranca', 'nota fiscal', 'reembolso', 'financeiro'],
  'Suporte': ['não funciona', 'nao funciona', 'erro', 'problema técnico', 'ajuda', 'dúvida', 'duvida', 'suporte', 'bug'],
  'Agendamento': ['agendar', 'agenda', 'reunião', 'reuniao', 'horário', 'horario', 'marcar'],
  'Reclamação': ['reclamação', 'reclamacao', 'reclamar', 'insatisfeito', 'péssimo', 'pessimo', 'horrível', 'horrivel', 'absurdo'],
  'Cancelamento': ['cancelar', 'cancelamento', 'encerrar contrato', 'não quero mais', 'nao quero mais'],
  'Pós-venda': ['obrigado', 'feedback', 'avaliação', 'avaliacao', 'como usar', 'tutorial'],
};

const POSITIVE_WORDS = ['ótimo', 'otimo', 'obrigado', 'excelente', 'adorei', 'perfeito', 'maravilhoso', 'gostei', 'top'];
const NEGATIVE_WORDS = ['péssimo', 'pessimo', 'horrível', 'horrivel', 'absurdo', 'insatisfeito', 'ruim', 'problema', 'reclamação', 'reclamacao', 'decepcionado', 'frustrado'];
const CRITICAL_WORDS = ['processo', 'advogado', 'procon', 'revoltado', 'inaceitável', 'inaceitavel', 'nunca mais', 'urgente', 'cancelar agora'];

export function classifyIntent(text: string): IntentClassification {
  const lower = text.toLowerCase();
  let bestIntent: IntentType = 'Suporte';
  let bestScore = 0;

  (Object.entries(INTENT_KEYWORDS) as [IntentType, string[]][]).forEach(([intent, keywords]) => {
    const matches = keywords.filter((kw) => lower.includes(kw)).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestIntent = intent;
    }
  });

  const confidence = bestScore === 0 ? 0.35 : Math.min(0.95, 0.5 + bestScore * 0.15);
  return { intent: bestIntent, confidence: Number(confidence.toFixed(2)) };
}

export function classifySentiment(text: string): SentimentClassification {
  const lower = text.toLowerCase();
  const hasCritical = CRITICAL_WORDS.some((w) => lower.includes(w));
  const negativeCount = NEGATIVE_WORDS.filter((w) => lower.includes(w)).length;
  const positiveCount = POSITIVE_WORDS.filter((w) => lower.includes(w)).length;
  const shouting = /!{2,}/.test(text) || (text === text.toUpperCase() && /[A-Z]{4,}/.test(text));

  let sentiment: SentimentType = 'Neutro';
  if (hasCritical || (negativeCount >= 2 && shouting)) {
    sentiment = 'Crítico';
  } else if (negativeCount > 0) {
    sentiment = 'Negativo';
  } else if (positiveCount > 0) {
    sentiment = 'Positivo';
  }

  return { sentiment };
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(?:\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}/;
const CURRENCY_RE = /R\$\s?[\d.,]+/g;
const DATE_RE = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g;
const NAME_HINT_RE = /(?:meu nome é|me chamo)\s+([A-ZÀ-Ú][\wà-ú]+(?:\s+[A-ZÀ-Ú][\wà-ú]+)*)/i;
const COMPANY_HINT_RE = /(?:da empresa|na empresa|sou da)\s+([A-ZÀ-Ú][\wà-ú.]+(?:\s+[A-ZÀ-Ú][\wà-ú.]+)*)/i;
const CITY_HINT_RE = /(?:moro em|sou de|aqui em)\s+([A-ZÀ-Ú][\wà-ú]+(?:\s+[A-ZÀ-Ú][\wà-ú]+)*)/i;

export function extractEntities(text: string): ExtractedInfo {
  const info: ExtractedInfo = {};

  const email = text.match(EMAIL_RE)?.[0];
  if (email) info.email = email;

  const phone = text.match(PHONE_RE)?.[0];
  if (phone && phone.replace(/\D/g, '').length >= 8) info.telefone = phone;

  const valores = text.match(CURRENCY_RE);
  if (valores?.length) info.valores = valores;

  const datas = text.match(DATE_RE);
  if (datas?.length) info.datas = datas;

  const nome = text.match(NAME_HINT_RE)?.[1];
  if (nome) info.nome = nome;

  const empresa = text.match(COMPANY_HINT_RE)?.[1];
  if (empresa) info.empresa = empresa;

  const cidade = text.match(CITY_HINT_RE)?.[1];
  if (cidade) info.cidade = cidade;

  return info;
}

/** How many AI replies already happened in this thread — a proxy for "tried and failed N times". */
export function countConsecutiveAgentReplies(messages: UIMessage[]): number {
  return messages.filter((m) => m.fromType === 'nina').length;
}

export function customerRequestedHuman(text: string): boolean {
  return /falar com (um )?(atendente|humano|pessoa|gerente|supervisor)/i.test(text);
}
