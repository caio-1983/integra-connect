import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Users, Building2, TrendingUp, MessageSquare, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PEOPLE, MOCK_COMPANIES, MOCK_DEALS, MOCK_CONVERSATIONS } from '@/constants';
import { cn } from '@/lib/utils';
import { isModuleEnabled } from '@/lib/platformPhase';

interface SearchResult {
  id: string;
  type: 'person' | 'company' | 'deal' | 'conversation';
  title: string;
  subtitle?: string;
  href: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const typeConfig = {
  person:       { icon: Users,          label: 'Pessoa',      color: 'text-primary',   bg: 'bg-primary/10' },
  company:      { icon: Building2,      label: 'Empresa',     color: 'text-amber-600', bg: 'bg-amber-100'  },
  deal:         { icon: TrendingUp,     label: 'Negócio',     color: 'text-emerald-600', bg: 'bg-emerald-100' },
  conversation: { icon: MessageSquare,  label: 'Conversa',    color: 'text-violet-600',  bg: 'bg-violet-100'  },
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcut: Escape closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') setActiveIndex(i => i + 1);
      if (e.key === 'ArrowUp') setActiveIndex(i => Math.max(0, i - 1));
      if (e.key === 'Enter') {
        const res = results[activeIndex];
        if (res) { navigate(res.href); onClose(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, activeIndex]);

  const results = useMemo((): SearchResult[] => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const out: SearchResult[] = [];

    if (isModuleEnabled('crm')) {
      MOCK_PEOPLE.forEach(p => {
        if (
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.whatsapp.includes(q) ||
          p.phones.some(ph => ph.includes(q)) ||
          (p.company?.toLowerCase() ?? '').includes(q)
        ) {
          out.push({ id: p.id, type: 'person', title: p.name, subtitle: p.company ?? p.email, href: '/crm/people' });
        }
      });

      MOCK_COMPANIES.forEach(c => {
        if (
          c.razaoSocial.toLowerCase().includes(q) ||
          (c.nomeFantasia?.toLowerCase() ?? '').includes(q) ||
          (c.cnpj ?? '').includes(q) ||
          (c.segmento?.toLowerCase() ?? '').includes(q)
        ) {
          out.push({ id: c.id, type: 'company', title: c.nomeFantasia ?? c.razaoSocial, subtitle: c.segmento, href: '/crm/companies' });
        }
      });
    }

    MOCK_DEALS.forEach(d => {
      if (
        d.title.toLowerCase().includes(q) ||
        d.company.toLowerCase().includes(q) ||
        (d.contactName?.toLowerCase() ?? '').includes(q)
      ) {
        out.push({ id: d.id, type: 'deal', title: d.title, subtitle: `${d.company} · ${d.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`, href: '/pipeline' });
      }
    });

    MOCK_CONVERSATIONS.forEach(c => {
      if (
        c.contactName.toLowerCase().includes(q) ||
        c.contactPhone.includes(q) ||
        c.id.includes(q)
      ) {
        out.push({ id: c.id, type: 'conversation', title: c.contactName, subtitle: `Conversa · ${c.contactPhone}`, href: '/chat' });
      }
    });

    return out.slice(0, 12);
  }, [query]);

  // Clamp activeIndex to results length
  const clampedIndex = Math.min(activeIndex, Math.max(0, results.length - 1));

  if (!open) return null;

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    acc[r.type] = acc[r.type] ?? [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-xl mx-4 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            placeholder="Buscar pessoas, empresas, negócios, conversas..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border px-1.5 text-[10px] font-mono text-muted-foreground">Esc</kbd>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Digite ao menos 2 caracteres para pesquisar
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">Nenhum resultado para <span className="font-medium text-foreground">"{query}"</span></p>
            </div>
          ) : (
            <div className="py-2">
              {(Object.entries(grouped) as [string, SearchResult[]][]).map(([type, items]) => {
                const cfg = typeConfig[type as keyof typeof typeConfig];
                const Icon = cfg.icon;
                return (
                  <div key={type}>
                    <p className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {cfg.label}{items.length > 1 ? 's' : ''}
                    </p>
                    {items.map((item, i) => {
                      const globalIdx = results.indexOf(item);
                      const isActive = globalIdx === clampedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { navigate(item.href); onClose(); }}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            isActive ? 'bg-muted' : 'hover:bg-muted/50'
                          )}
                        >
                          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                            <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                            {item.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                            )}
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
            <span><kbd className="font-mono">↑↓</kbd> navegar</span>
            <span><kbd className="font-mono">↵</kbd> abrir</span>
            <span><kbd className="font-mono">Esc</kbd> fechar</span>
          </div>
        )}
      </div>
    </div>
  );
};
