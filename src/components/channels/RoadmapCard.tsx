import React from 'react';
import { Mail, MessageSquareText, Users } from 'lucide-react';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { CHANNEL_CONFIG, COMING_SOON_CHANNELS } from '@/lib/channelConfig';

const LATER = [
  { icon: Mail, label: 'E-mail' },
  { icon: MessageSquareText, label: 'SMS' },
  { icon: Users, label: 'Microsoft Teams' },
];

/**
 * Channels that exist in the provider registry but have no real integration
 * yet, plus the roadmap. One quiet list instead of a dead card per channel —
 * nothing here is clickable.
 */
export const RoadmapCard: React.FC = () => {
  const items = [
    ...COMING_SOON_CHANNELS.map((c) => ({ icon: CHANNEL_CONFIG[c].icon, label: CHANNEL_CONFIG[c].label })),
    ...LATER,
  ];
  return (
    <Panel title="Em breve" description="Canais que ainda não têm integração. Não precisam de configuração.">
      <ul className="px-6 pb-5 pt-1 flex flex-wrap gap-2">
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2 px-3 h-8 rounded-full bg-secondary text-sm text-muted-foreground">
            <Icon className="w-4 h-4 text-icon" aria-hidden="true" /> {label}
          </li>
        ))}
      </ul>
    </Panel>
  );
};
