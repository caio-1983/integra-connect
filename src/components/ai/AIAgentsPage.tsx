import React from 'react';
import { PageContainer, PageHeader } from '@/components/layout';
import { AgentCard } from './AgentCard';
import type { AgentId } from '@/ai/types';

const AGENT_ORDER: AgentId[] = ['atendimento', 'recepcao', 'suporte', 'comercial', 'financeiro'];

const AIAgentsPage: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader
        title="Agentes"
        description="Um único agente de IA que atende o cliente de forma autônoma e assiste o operador como Copilot."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENT_ORDER.map((agentId) => (
          <AgentCard key={agentId} agentId={agentId} />
        ))}
      </div>
    </PageContainer>
  );
};

export default AIAgentsPage;
