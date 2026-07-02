import React from 'react';
import { MapPin, Tag, Globe } from 'lucide-react';
import { Person } from '@/types';

interface ContactSummaryProps {
  person: Person;
}

export const ContactSummary: React.FC<ContactSummaryProps> = ({ person }) => {
  return (
    <div className="px-4 space-y-2">
      {(person.city || person.state) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{[person.city, person.state].filter(Boolean).join(' — ')}</span>
        </div>
      )}
      {person.origin && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Origem: <span className="text-foreground">{person.origin}</span></span>
        </div>
      )}
      {person.tags.length > 0 && (
        <div className="flex items-start gap-1.5">
          <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {person.tags.map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
