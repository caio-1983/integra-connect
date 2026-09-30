import React from 'react';
import { PageContainer, PageHeader } from '@/components/layout';
import { MetaSection, RoadmapCard, WhatsAppSection } from '@/components/channels';

const ChannelManagement: React.FC = () => {
  return (
    <PageContainer>
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-3">
        <PageHeader
          title="Conexões"
          description="Os números e contas que trazem mensagens para o atendimento."
          className="mb-3"
        />

        <WhatsAppSection />

        {/* Instagram e Facebook compartilham uma única conta/token por página na
            Graph API, então são administrados juntos. */}
        <MetaSection />

        {/* Telegram e Webchat ainda não têm integração — ficam listados aqui,
            sem cards de ação que não fazem nada. */}
        <RoadmapCard />
      </div>
    </PageContainer>
  );
};

export default ChannelManagement;
