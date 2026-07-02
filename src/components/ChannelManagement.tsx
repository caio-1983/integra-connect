import React from 'react';
import { PageContainer, PageHeader } from '@/components/layout';
import { ChannelCard, RoadmapCard } from '@/components/channels';
import { CHANNEL_ORDER } from '@/lib/channelConfig';

const ChannelManagement: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader
        title="Gestão de Canais"
        description="Administre todas as conexões de canal do Workspace em um único lugar."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHANNEL_ORDER.map((channel) => (
          <ChannelCard key={channel} channel={channel} />
        ))}
        <RoadmapCard />
      </div>
    </PageContainer>
  );
};

export default ChannelManagement;
