import React from 'react';
import { TagDefinition } from '@/types';
import { cn } from '@/lib/utils';
import { tagLabel } from './TagFilter';

interface TagChipProps {
  tag: string;
  definitions: TagDefinition[];
  /** How many more tags the conversation has beyond this one — shown as "+N". */
  extra?: number;
  /** Full list for the tooltip when some are hidden. */
  title?: string;
  className?: string;
}

/**
 * A tag on a queue row, in the tag's own color: a tint behind, the same hue
 * pulled toward the text color for the label (readable in light and dark), and
 * the dot the tag filter uses, so a row and the filter read as the same tag.
 * A key with no definition falls back to the neutral chip.
 */
export const TagChip: React.FC<TagChipProps> = ({ tag, definitions, extra = 0, title, className }) => {
  const color = definitions.find(d => d.key === tag)?.color;
  const label = tagLabel(tag, definitions);

  return (
    <span
      title={title ?? label}
      className={cn(
        'px-1.5 h-[18px] text-[11px] font-medium rounded-full flex items-center gap-1 min-w-0',
        !color && 'bg-secondary text-muted-foreground',
        className,
      )}
      style={color ? {
        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
        color: `color-mix(in srgb, ${color} 45%, hsl(var(--foreground)))`,
      } : undefined}
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color ?? 'currentColor' }}
      />
      <span className="truncate">{label}</span>
      {extra > 0 && <span className="flex-shrink-0 opacity-75 tabular-nums">+{extra}</span>}
    </span>
  );
};
