import React, { useState } from 'react';
import { TrendingUp, CircleDollarSign, User, Plus, ExternalLink, ArrowRight } from 'lucide-react';
import { Deal } from '@/types';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { CreateDealModal } from '@/components/CreateDealModal';

interface DealSummaryProps {
  deals: Deal[];
  contactId?: string;
  contactName?: string;
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
  new:          'bg-slate-100 text-slate-700 border-slate-300',
  qualification: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  presentation: 'bg-violet-50 text-violet-700 border-violet-200',
  negotiation:  'bg-amber-50 text-amber-700 border-amber-200',
  won:          'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost:         'bg-red-50 text-red-700 border-red-200',
};

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export const DealSummary: React.FC<DealSummaryProps> = ({ deals, contactId, contactName }) => {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const activeDeals = deals.filter(d => d.stage !== 'lost' && d.stage !== 'won');
  const mainDeal = activeDeals[0] ?? deals[0];

  if (!mainDeal) {
    return (
      <>
        <div className="px-4">
          <div className="rounded-xl border border-dashed border-border p-3 text-center">
            <TrendingUp className="w-5 h-5 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground mb-2">Nenhum negócio vinculado</p>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Negócio
            </button>
          </div>
        </div>

        <CreateDealModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onDealCreated={() => setCreateOpen(false)}
        />
      </>
    );
  }

  const stage = mainDeal.stageId ?? mainDeal.stage ?? 'new';

  return (
    <>
      <div className="px-4 space-y-2">
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          {/* Deal title */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-foreground leading-snug flex-1">
              {mainDeal.title}
            </p>
            <button
              onClick={() => navigate('/pipeline')}
              className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
              title="Ver no Kanban"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stage badge */}
          <span className={cn('inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border', stageColor[stage] ?? stageColor['new'])}>
            {stageLabel[stage] ?? stage}
          </span>

          {/* Value */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleDollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold text-foreground">{formatCurrency(mainDeal.value)}</span>
          </div>

          {/* Owner */}
          {mainDeal.ownerName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span>{mainDeal.ownerName}</span>
            </div>
          )}
        </div>

        {/* More deals */}
        {deals.length > 1 && (
          <button
            onClick={() => navigate('/pipeline')}
            className="w-full text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
          >
            +{deals.length - 1} negócio{deals.length - 1 > 1 ? 's' : ''}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}

        {/* Create deal */}
        <button
          onClick={() => setCreateOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1 border border-dashed border-border rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" />
          Criar Negócio
        </button>
      </div>

      <CreateDealModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onDealCreated={() => setCreateOpen(false)}
      />
    </>
  );
};
