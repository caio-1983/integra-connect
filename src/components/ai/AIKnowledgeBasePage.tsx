import React from 'react';
import { BookOpen } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';

const AIKnowledgeBasePage: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader
        title="Base de Conhecimento"
        description="Fontes de conhecimento consultadas pelos agentes de IA."
      />
      <EmptyState
        icon={BookOpen}
        title="Em breve"
        description="Biblioteca de artigos, upload de documentos e busca semântica (RAG) chegam em uma próxima sprint. A base já é consultada internamente pelo agente de Atendimento via FAQ mock."
      />
    </PageContainer>
  );
};

export default AIKnowledgeBasePage;
