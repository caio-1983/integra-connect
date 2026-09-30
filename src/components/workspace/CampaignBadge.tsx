import React from 'react';
import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeadCampaign } from '@/services/attributionService';

/**
 * Origin badge: the campaign a lead came from. Computed from attribution, so it
 * is styled apart from the editable tags. An unmapped Meta campaign shows muted,
 * signalling it still needs a rule in Campanhas.
 */
export const CampaignBadge: React.FC<{ campaign: LeadCampaign; className?: string }> = ({ campaign, className }) => (
  <span
    className={cn(
      'px-1.5 h-[18px] text-[11px] rounded-full font-medium flex items-center gap-1 min-w-0',
      campaign.mapped
        ? 'bg-info-subtle text-info'
        : 'border border-dashed border-input text-muted-foreground',
      className,
    )}
    title={campaign.mapped ? `Origem: ${campaign.name}` : `Origem (campanha da Meta, sem mapeamento): ${campaign.name}`}
  >
    <Megaphone className="w-2.5 h-2.5 flex-shrink-0" />
    <span className="truncate">{campaign.name}</span>
  </span>
);
