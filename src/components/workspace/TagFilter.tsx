import React, { useMemo, useState } from 'react';
import { Tag, ChevronDown, X, Check, Loader2, Search } from 'lucide-react';
import { TagDefinition, UIConversation } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TagFilterProps {
  /** Catalog of tags (label + color). Keys in use without a definition still show, by key. */
  definitions: TagDefinition[];
  /** Conversations the counts are taken from — already narrowed to the selected number. */
  conversations: UIConversation[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
  /** Brings every tagged conversation into the list; runs each time the menu opens. */
  onLoad?: () => Promise<void>;
  className?: string;
}

/** Above this many tags the menu gets a search field. */
const SEARCH_THRESHOLD = 8;

export function tagLabel(key: string, definitions: TagDefinition[]): string {
  return definitions.find(d => d.key === key)?.label ?? key.replace(/_/g, ' ');
}

const Dot: React.FC<{ color?: string }> = ({ color }) => (
  <span
    aria-hidden="true"
    className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-inset ring-black/10 dark:ring-white/15"
    style={{ backgroundColor: color ?? 'hsl(var(--muted-foreground))' }}
  />
);

/**
 * "Tags" pill next to the number filter. Lists the tags attendants have put on
 * conversations, with how many carry each; picking one leaves only those in the
 * queue — archived ones included, like WhatsApp Business labels.
 */
const TagFilter: React.FC<TagFilterProps> = ({
  definitions, conversations, selected, onSelect, onLoad, className,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');

  const load = async () => {
    if (!onLoad) { setLoaded(true); return; }
    setLoading(true);
    setFailed(false);
    try {
      await onLoad();
      setLoaded(true);
    } catch (err) {
      console.error('[TagFilter] Error loading tagged conversations:', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery('');
      load();
    }
  };

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of conversations) {
      for (const tag of new Set(c.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        count,
        label: tagLabel(key, definitions),
        color: definitions.find(d => d.key === key)?.color,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }));
  }, [conversations, definitions]);

  const q = query.trim().toLowerCase();
  const visible = q ? tags.filter(t => t.label.toLowerCase().includes(q)) : tags;

  const active = selected ? {
    label: tagLabel(selected, definitions),
    color: definitions.find(d => d.key === selected)?.color,
  } : null;

  const choose = (key: string) => {
    onSelect(key === selected ? null : key);
    setOpen(false);
  };

  // First open: nothing to list until every tagged conversation is in.
  const waitingFirstLoad = !loaded && (loading || !failed);

  return (
    <div className={cn('relative min-w-0', className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={active ? `Filtrando pela tag ${active.label}. Trocar tag` : 'Filtrar por tag'}
            className={cn(
              'w-full h-8 pl-10 rounded-full text-[13px] text-left truncate outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0',
              active
                ? 'pr-9 bg-primary-subtle text-primary-subtle-foreground font-medium border border-transparent'
                : 'pr-8 bg-card text-foreground border border-input hover:bg-accent',
            )}
          >
            {active ? active.label : 'Tags'}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-1.5">
          {tags.length > SEARCH_THRESHOLD && (
            <div className="relative mb-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-icon pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                aria-label="Buscar tag"
                placeholder="Buscar tag"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-8 pl-9 pr-3 bg-secondary rounded-full text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          )}

          {waitingFirstLoad ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Buscando conversas com tag
            </div>
          ) : failed && !loaded ? (
            <div className="px-3 py-3 text-sm">
              <p className="text-foreground">Não foi possível carregar as tags.</p>
              <button type="button" onClick={load} className="mt-1 text-primary font-medium hover:underline">
                Tentar de novo
              </button>
            </div>
          ) : tags.length === 0 ? (
            <div className="px-3 py-3 text-sm">
              <p className="text-foreground">Nenhuma conversa tem tag.</p>
              <p className="mt-0.5 text-muted-foreground">Adicione tags pelos Detalhes da conversa.</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto custom-scrollbar" role="group" aria-label="Tags">
              {visible.map(tag => (
                <button
                  key={tag.key}
                  type="button"
                  aria-pressed={tag.key === selected}
                  onClick={() => choose(tag.key)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left hover:bg-accent focus-visible:bg-accent outline-none"
                >
                  <Dot color={tag.color} />
                  <span className={cn('flex-1 truncate', tag.key === selected ? 'font-semibold text-foreground' : 'text-foreground')}>
                    {tag.label}
                  </span>
                  {tag.key === selected
                    ? <Check className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                    : <span className="text-xs text-muted-foreground tabular-nums">{tag.count}</span>}
                </button>
              ))}
              {visible.length === 0 && (
                <p className="px-3 py-3 text-sm text-muted-foreground">Nenhuma tag com esse nome.</p>
              )}
            </div>
          )}

          {/* A refresh after the first load keeps the list on screen. */}
          {loaded && loading && (
            <div className="flex items-center gap-2 px-3 pt-1.5 pb-1 text-xs text-muted-foreground border-t border-border mt-1">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Atualizando
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Icon sits over the pill like the number filter's phone icon. */}
      <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
        {active ? <Dot color={active.color} /> : <Tag className="h-3.5 w-3.5 text-icon" aria-hidden="true" />}
      </span>
      {active ? (
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label="Limpar filtro de tag"
          title="Limpar filtro de tag"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-primary-subtle-foreground hover:bg-black/5 dark:hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : (
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-icon pointer-events-none" aria-hidden="true" />
      )}
    </div>
  );
};

export { TagFilter };
