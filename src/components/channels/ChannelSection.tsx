import React from 'react';
import type { ChannelType } from '@/types';
import { SectionBlock } from '@/components/layout';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { useChannelProvider } from '@/hooks/useChannelProvider';
import { ChannelCard } from './ChannelCard';

interface ChannelSectionProps {
  channel: ChannelType;
}

/** One labeled block per non-WhatsApp channel in Gestão de Canais — mirrors
 *  WhatsAppSection's header pattern so every channel reads the same way. */
export const ChannelSection: React.FC<ChannelSectionProps> = ({ channel }) => {
  const { status } = useChannelProvider(channel);
  const cfg = CHANNEL_CONFIG[channel];

  const description = status.connected
    ? `Conectado${status.accountName ? ` — ${status.accountName}` : ''}`
    : 'Aguardando conexão';

  return (
    <SectionBlock title={cfg.label} icon={cfg.icon} description={description}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChannelCard channel={channel} />
      </div>
    </SectionBlock>
  );
};
