import React from 'react';
import { PageContainer, PageHeader } from '@/components/layout';
import { ChannelSection, MetaSection, RoadmapCard, WhatsAppSection } from '@/components/channels';
import { CHANNEL_ORDER } from '@/lib/channelConfig';

const ChannelManagement: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader
        title="Conexões"
        description="Administre todas as conexões de canal do Workspace em um único lugar."
      />

      <WhatsAppSection />

      {/* Instagram e Facebook compartilham uma única conta/token por página na
          Graph API, então são administrados juntos em vez de um ChannelSection
          genérico cada. */}
      <MetaSection />

      {CHANNEL_ORDER
        .filter((channel) => channel !== 'whatsapp' && channel !== 'instagram' && channel !== 'facebook')
        .map((channel) => (
          <ChannelSection key={channel} channel={channel} />
        ))}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <RoadmapCard />
      </div>
    </PageContainer>
  );
};

export default ChannelManagement;
