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

export interface ConversationSummary {
  motivo: string;
  contexto: string;
  pendencias: string[];
  ultimaAcao: string;
  proximoPasso: string;
  updatedAt: string;
}

export interface SuggestedReply {
  id: string;
  text: string;
}

export interface SuggestedTask {
  id: string;
  title: string;
  dueHint?: string;
}

export interface SuggestedDeal {
  id: string;
  title: string;
  estimatedValue?: number;
  stageHint?: string;
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

export interface CopilotState {
  conversationId: string;
  summary?: ConversationSummary;
  intent?: IntentClassification;
  sentiment?: SentimentClassification;
  suggestedReplies: SuggestedReply[];
  suggestedTasks: SuggestedTask[];
  suggestedDeal?: SuggestedDeal;
  extractedInfo: ExtractedInfo;
  updatedAt: string;
}
