import React, { useState, useMemo } from 'react';
import { Search, TrendingUp, ExternalLink, CircleDollarSign } from 'lucide-react';
import { Deal } from '@/types';
import { Button } from '@/components/Button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DealTableProps {
  deals: Deal[];
}

const stageLabel: Record<string, string> = {
  new:          'Novo Lead',
  qualification: 'Qualificação',
  presentation: 'Apresentação',
  negotiation:  'Negociação',
  won:          'Fechado',
  lost:         'Perdido',
};
const stageColor: Record<string, string> = {
  new:          'bg-slate-50 text-slate-700 border-slate-300',
  qualification: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  presentation: 'bg-violet-50 text-violet-700 border-violet-200',
  negotiation:  'bg-amber-50 text-amber-700 border-amber-200',
  won:          'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost:         'bg-red-50 text-red-700 border-red-200',
};
const priorityLabel: Record<string, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta',
};

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export const DealTable: React.FC<DealTableProps> = ({ deals }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('active');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    let list = deals.filter(d =>
      d.title.toLowerCase().includes(term) ||
      d.company.toLowerCase().includes(term) ||
      (d.contactName?.toLowerCase() ?? '').includes(term)
    );
    if (stageFilter === 'active') {
      list = list.filter(d => d.stage !== 'won' && d.stage !== 'lost');
    } else if (stageFilter !== 'all') {
      list = list.filter(d => d.stage === stageFilter);
    }
    return list;
  }, [deals, search, stageFilter]);

  const totalValue = filtered.reduce((s, d) => s + d.value, 0);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título, empresa ou contato"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { value: 'active', label: 'Ativos' },
            { value: 'all', label: 'Todos' },
            { value: 'negotiation', label: 'Negociação' },
            { value: 'won', label: 'Fechados' },
            { value: 'lost', label: 'Perdidos' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setStageFilter(f.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                stageFilter === f.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-card border border-border mb-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span>{filtered.length} negócio{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <CircleDollarSign className="w-4 h-4 text-emerald-500" />
          {formatCurrency(totalValue)}
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => navigate('/pipeline')} className="gap-1.5 text-xs">
            <ExternalLink className="w-3.5 h-3.5" />
            Ver no Kanban
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-base font-medium text-foreground">Nenhum negócio encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Negócio</th>
                  <th className="px-6 py-4">Empresa / Contato</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Estágio</th>
                  <th className="px-6 py-4">Prioridade</th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4">Previsão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(deal => {
                  const stage = deal.stageId ?? deal.stage ?? 'new';
                  return (
                    <tr
                      key={deal.id}
                      className="hover:bg-muted/40 transition-colors group cursor-pointer"
                      onClick={() => navigate('/pipeline')}
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {deal.title}
                        </p>
                        {deal.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {deal.tags.slice(0, 2).map(t => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-foreground">{deal.company}</p>
                        {deal.contactName && (
                          <p className="text-[10px] text-muted-foreground">{deal.contactName}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {formatCurrency(deal.value)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold border', stageColor[stage] ?? stageColor['new'])}>
                          {stageLabel[stage] ?? stage}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                          deal.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                          deal.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        )}>
                          {priorityLabel[deal.priority]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {deal.ownerName ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {deal.dueDate
                          ? new Date(deal.dueDate).toLocaleDateString('pt-BR')
                          : deal.wonAt
                          ? `Fechado ${new Date(deal.wonAt).toLocaleDateString('pt-BR')}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
