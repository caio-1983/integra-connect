import { Facebook, Globe, Instagram, MessageCircle, Send, type LucideIcon } from 'lucide-react';
import type { ChannelType } from '@/types';

/**
 * Single source of truth for how a channel is displayed (icon, label, color).
 * Every surface that shows a channel (queue, conversation header/timeline,
 * CRM timeline, customer workspace, channel management) must read from this
 * map — no component should hardcode a channel's icon/color, and no
 * component should branch on `channel === 'whatsapp'` for display purposes.
 *
 * Adding a channel: add one entry here (and one line in
 * src/providers/registry.ts) — no consuming component needs to change.
 */
export const CHANNEL_CONFIG: Record<ChannelType, { icon: LucideIcon; label: string; color: string; brandHex: string }> = {
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    brandHex: '#25D366',
  },
  instagram: {
    icon: Instagram,
    label: 'Instagram Direct',
    color: 'text-pink-600 bg-pink-50 border-pink-200',
    brandHex: '#E1306C',
  },
  facebook: {
    icon: Facebook,
    label: 'Facebook Messenger',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    brandHex: '#0866FF',
  },
  telegram: {
    icon: Send,
    label: 'Telegram',
    color: 'text-sky-600 bg-sky-50 border-sky-200',
    brandHex: '#26A5E4',
  },
  webchat: {
    icon: Globe,
    label: 'Webchat',
    color: 'text-violet-600 bg-violet-50 border-violet-200',
    brandHex: '#7C3AED',
  },
};

export const CHANNEL_ORDER: ChannelType[] = ['whatsapp', 'instagram', 'facebook', 'telegram', 'webchat'];

/**
 * Channels wired into the provider registry for architecture purposes but
 * with no real backend integration behind them yet (connect/disconnect is a
 * local mock flag — see BaseChannelProvider). Surfaced as "Em construção" and
 * non-interactive in Conexões instead of implying they can actually be used.
 */
export const COMING_SOON_CHANNELS: ChannelType[] = ['instagram', 'facebook', 'telegram', 'webchat'];
