import React from 'react';
import type { ChannelBusinessHours } from '@/types';
import { Switch } from '@/components/ui/switch';

interface BusinessHoursEditorProps {
  value: ChannelBusinessHours;
  onChange: (next: ChannelBusinessHours) => void;
}

const DAY_LABELS: Record<keyof ChannelBusinessHours['schedule'], string> = {
  mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb', sun: 'Dom',
};

const DAY_ORDER = Object.keys(DAY_LABELS) as Array<keyof ChannelBusinessHours['schedule']>;

export const BusinessHoursEditor: React.FC<BusinessHoursEditorProps> = ({ value, onChange }) => {
  const updateDay = (day: keyof ChannelBusinessHours['schedule'], partial: Partial<ChannelBusinessHours['schedule'][typeof day]>) => {
    onChange({
      ...value,
      schedule: {
        ...value.schedule,
        [day]: { ...value.schedule[day], ...partial },
      },
    });
  };

  return (
    <div className="space-y-1.5">
      {DAY_ORDER.map((day) => {
        const dayConfig = value.schedule[day];
        return (
          <div key={day} className="flex items-center gap-2.5">
            <Switch
              checked={dayConfig.active}
              onCheckedChange={(checked) => updateDay(day, { active: checked })}
            />
            <span className="text-xs font-medium text-foreground w-8">{DAY_LABELS[day]}</span>
            <input
              type="time"
              value={dayConfig.start}
              disabled={!dayConfig.active}
              onChange={(e) => updateDay(day, { start: e.target.value })}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground disabled:opacity-40"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <input
              type="time"
              value={dayConfig.end}
              disabled={!dayConfig.active}
              onChange={(e) => updateDay(day, { end: e.target.value })}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground disabled:opacity-40"
            />
          </div>
        );
      })}
    </div>
  );
};
