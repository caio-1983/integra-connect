import type { ChannelBusinessHours } from '@/types';

export function defaultBusinessHours(activeOnWeekends = false): ChannelBusinessHours {
  const weekday = { start: '08:00', end: '18:00', active: true };
  const weekend = { start: '08:00', end: '18:00', active: activeOnWeekends };
  return {
    enabled: true,
    timezone: 'America/Sao_Paulo',
    schedule: {
      mon: weekday,
      tue: weekday,
      wed: weekday,
      thu: weekday,
      fri: weekday,
      sat: weekend,
      sun: weekend,
    },
  };
}
