/** Mirrors src/ai/types/copilot.ts on the frontend — kept as a separate backend copy on purpose (see plan). */
export type IntentType =
  | 'Orçamento'
  | 'Comercial'
  | 'Financeiro'
  | 'Suporte'
  | 'Agendamento'
  | 'Reclamação'
  | 'Cancelamento'
  | 'Pós-venda';

export interface IntentClassification {
  intent: IntentType;
  confidence: number;
}

export type SentimentType = 'Positivo' | 'Neutro' | 'Negativo' | 'Crítico';

export interface SentimentClassification {
  sentiment: SentimentType;
}

export interface ExtractedInfo {
  nome?: string;
  empresa?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  produto?: string;
  valores?: string[];
  datas?: string[];
}
