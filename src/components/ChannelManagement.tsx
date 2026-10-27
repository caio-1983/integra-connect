import React from 'react';
import { PageContainer, PageHeader } from '@/components/layout';
import { MetaSection, RoadmapCard, WhatsAppSection } from '@/components/channels';

const ChannelManagement: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  // Inside the Configurações tabs the shell already provides page chrome.
  const Shell = embedded ? React.Fragment : PageContainer;

  return (
    <Shell>
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-3">
        {!embedded && (
          <PageHeader
            title="Conexões"
            description="Os números e contas que trazem mensagens para o atendimento."
            className="mb-3"
          />
        )}

        <WhatsAppSection />

        {/* Instagram e Facebook compartilham uma única conta/token por página na
            Graph API, então são administrados juntos. */}
        <MetaSection />

        {/* Telegram e Webchat ainda não têm integração — ficam listados aqui,
            sem cards de ação que não fazem nada. */}
        <RoadmapCard />
      </div>
    </Shell>
  );
};

export default ChannelManagement;
