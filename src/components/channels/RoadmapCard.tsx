import React from 'react';
import { Mail, MessageCircle as SmsIcon, Users } from 'lucide-react';

const UPCOMING = [
  { icon: Mail, label: 'E-mail' },
  { icon: SmsIcon, label: 'SMS' },
  { icon: Users, label: 'Microsoft Teams' },
];

/**
 * Non-interactive roadmap card — reinforces that the channel architecture
 * (registry + BaseChannelProvider) is designed to grow. No actions here.
 */
export const RoadmapCard: React.FC = () => {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-foreground text-sm">Em desenvolvimento</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Próximos conectores do roadmap</p>
      </div>
      <div className="space-y-2">
        {UPCOMING.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <div className="w-7 h-7 rounded-lg border border-border bg-background flex items-center justify-center">
              <Icon className="w-3.5 h-3.5" />
            </div>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};
