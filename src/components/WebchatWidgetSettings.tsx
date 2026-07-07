import React from 'react';
import { PageContainer, PageHeader } from '@/components/layout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';

const WebchatWidgetSettings: React.FC = () => {
  const cfg = CHANNEL_CONFIG.webchat;

  return (
    <PageContainer>
      <PageHeader
        title="Chat do Site"
        description="Configure a aparência, o comportamento e a instalação do canal nativo de webchat."
      />

      <EmptyState
        icon={cfg.icon}
        title="Em construção"
        description="A configuração do widget de webchat (identidade visual, horário de atendimento, instalação) está sendo reconstruída para a nova arquitetura. Em breve estará disponível aqui."
      />
    </PageContainer>
  );
};

export default WebchatWidgetSettings;
