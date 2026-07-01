import React, { useState, useCallback, useEffect } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { cn } from '@/lib/utils';

interface ValidationResult {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface HealthData {
  results: ValidationResult[];
  overallStatus: 'ok' | 'warning' | 'error';
  summary: { ok: number; total: number; percentage: number };
  message: string;
}

const componentLabels: Record<string, string> = {
  identity:      'Identidade',
  whatsapp:      'WhatsApp',
  agent_prompt:  'Agente IA',
  elevenlabs:    'ElevenLabs',
  business_hours:'Horário',
  lovable_ai:    'Lovable AI',
  pipeline:      'Pipeline',
  profile:       'Perfil',
  nina_settings: 'Configurações',
};

const statusConfig = {
  ok:      { icon: CheckCircle,    bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Operacional' },
  warning: { icon: AlertTriangle,  bg: 'bg-amber-500/10  border-amber-500/20',   text: 'text-amber-400',   label: 'Atenção'     },
  error:   { icon: XCircle,        bg: 'bg-red-500/10    border-red-500/20',      text: 'text-red-400',     label: 'Falha'       },
};

const AlertsPanel: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-setup');
      if (error) throw error;
      setHealth(data);
    } catch {
      /* silent — empty state handles it */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex items-center gap-3 animate-pulse">
        <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
        <span className="text-sm text-muted-foreground">Verificando sistema...</span>
      </div>
    );
  }

  if (!health) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Verificação indisponível"
        description="Não foi possível obter o status do sistema. Tente atualizar a página."
      />
    );
  }

  const issues = health.results.filter(r => r.status !== 'ok');
  const overallCfg = statusConfig[health.overallStatus];
  const OverallIcon = overallCfg.icon;

  return (
    <div className={cn('rounded-xl border bg-slate-900/50 overflow-hidden', overallCfg.bg)}>
      {/* Summary row */}
      <div className="flex items-center justify-between px-5 py-4 gap-4">
        <div className="flex items-center gap-3">
          <OverallIcon className={cn('w-5 h-5 flex-shrink-0', overallCfg.text)} />
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">{health.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {health.summary.ok}/{health.summary.total} componentes operacionais
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', overallCfg.bg, overallCfg.text)}>
            {health.summary.percentage}% OK
          </span>
          <button
            onClick={fetchHealth}
            className="p-1.5 rounded-lg hover:bg-slate-700/60 transition-colors text-slate-400 hover:text-foreground"
            aria-label="Atualizar status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-px mx-5">
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden -mt-px">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              health.overallStatus === 'ok'      ? 'bg-emerald-500' :
              health.overallStatus === 'warning' ? 'bg-amber-500'   : 'bg-red-500',
            )}
            style={{ width: `${health.summary.percentage}%` }}
          />
        </div>
      </div>

      {/* Issues list */}
      {issues.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{expanded ? 'Ocultar detalhes' : `Ver ${issues.length} problema${issues.length > 1 ? 's' : ''} detectado${issues.length > 1 ? 's' : ''}`}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-5 pb-5">
              {issues.map((result) => {
                const cfg = statusConfig[result.status];
                const IssueIcon = cfg.icon;
                return (
                  <div
                    key={result.component}
                    className={cn('flex items-start gap-3 p-3 rounded-lg border', cfg.bg)}
                  >
                    <IssueIcon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', cfg.text)} />
                    <div className="min-w-0">
                      <p className={cn('text-xs font-semibold', cfg.text)}>
                        {componentLabels[result.component] || result.component}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {result.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {issues.length === 0 && (
        <p className="px-5 pb-4 text-xs text-emerald-400/70">
          Todos os componentes estão operacionais.
        </p>
      )}
    </div>
  );
};

export { AlertsPanel };
