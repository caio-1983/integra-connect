import React from 'react';
import { Wrench } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';

const AIToolsPage: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader
        title="Ferramentas"
        description="Ferramentas que os agentes de IA podem acionar durante o atendimento."
      />
      <EmptyState
        icon={Wrench}
        title="Em breve"
        description="Gestão visual de ferramentas (CRM, Agenda, Financeiro, Conhecimento, Automação) chega em uma próxima sprint. Elas já existem como mock e estão associadas ao agente de Atendimento em Agentes."
      />
    </PageContainer>
  );
};

export default AIToolsPage;
