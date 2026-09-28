import type { IntentType } from '@/ai/types';

/** Reply suggestions offered to the human operator — a distinct voice/purpose from the AI's own autonomous replies (see LocalAIProvider). */
export const SUGGESTED_REPLY_TEMPLATES: Record<IntentType, string[]> = {
  'Orçamento': [
    'Segue a tabela de valores atualizada — qualquer dúvida, estou à disposição.',
    'Posso te enviar uma proposta personalizada com base no que conversamos?',
  ],
  'Comercial': [
    'Podemos avançar com a proposta comercial. Quer que eu prepare o contrato?',
    'Vamos agendar uma call rápida para fechar os últimos detalhes?',
  ],
  'Financeiro': [
    'Já verifiquei sua situação financeira, está tudo em dia por aqui.',
    'Vou encaminhar sua solicitação para o time financeiro e te retorno em breve.',
  ],
  'Suporte': [
    'Consegui identificar o problema, já estou resolvendo.',
    'Pode me enviar mais detalhes (prints, horário do erro) para eu investigar?',
  ],
  'Agendamento': [
    'Ficou confirmado o horário! Vou te enviar o convite por e-mail.',
    'Tenho esses horários disponíveis, qual prefere?',
  ],
  'Reclamação': [
    'Peço desculpas pelo ocorrido — já estou tratando com prioridade.',
    'Entendo sua insatisfação, vamos resolver isso agora mesmo.',
  ],
  'Cancelamento': [
    'Antes de confirmar o cancelamento, posso te oferecer uma condição especial?',
    'Vou processar sua solicitação de cancelamento conforme nossa política.',
  ],
  'Pós-venda': [
    'Que bom que está gostando! Qualquer coisa, estou por aqui.',
    'Fico à disposição para o que precisar.',
  ],
};
