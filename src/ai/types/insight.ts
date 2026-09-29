/** Same shape as the backend's `ConversationInsight` (backend/src/conversation/ConversationInsightService.ts). */
export interface ConversationInsight {
  /** Draft reply for the attendant — never sent automatically. */
  reply: string;
  /** One line on what the customer asked, shown inside the timeline. */
  annotation: string;
  /** What the customer needs (ambiente, uso, instalacao, medidas, tomDeLuz, orcamento). */
  need: Record<string, string>;
  /** Order facts stated in the conversation (produto, quantidade, cep, pagamento). */
  fields: Record<string, string>;
  missing: string[];
  nextSteps: string[];
  basedOnMessageId: string;
  awaitingReply: boolean;
  updatedAt: string;
}

export type InsightMode = 'default' | 'shorter' | 'alternative';
