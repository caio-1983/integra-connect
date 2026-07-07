import React from 'react';
import { PageContainer, PageHeader } from '@/components/layout';
import { ChannelSection, RoadmapCard, WhatsAppSection } from '@/components/channels';
import { CHANNEL_ORDER } from '@/lib/channelConfig';

const ChannelManagement: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader
        title="Conexões"
        description="Administre todas as conexões de canal do Workspace em um único lugar."
      />

      <WhatsAppSection />

      {CHANNEL_ORDER.filter((channel) => channel !== 'whatsapp').map((channel) => (
        <ChannelSection key={channel} channel={channel} />
      ))}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <RoadmapCard />
      </div>
    </PageContainer>
  );
};

export default ChannelManagement;
