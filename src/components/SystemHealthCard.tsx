import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  MessageSquare,
  Bot,
  Mic,
  Clock,
  User,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  summary: {
    ok: number;
    total: number;
    percentage: number;
  };
  message: string;
}

const componentIcons: Record<string, React.ReactNode> = {
  identity: <User className="w-4 h-4" />,
  whatsapp: <MessageSquare className="w-4 h-4" />,
  agent_prompt: <Bot className="w-4 h-4" />,
  elevenlabs: <Mic className="w-4 h-4" />,
  business_hours: <Clock className="w-4 h-4" />,
  lovable_ai: <Sparkles className="w-4 h-4" />,
  pipeline: <Layers className="w-4 h-4" />,
  profile: <User className="w-4 h-4" />,
  nina_settings: <Bot className="w-4 h-4" />,
};

const componentLabels: Record<string, string> = {
  identity: 'Identidade',
  whatsapp: 'WhatsApp',
  agent_prompt: 'Agente IA',
  elevenlabs: 'ElevenLabs',
  business_hours: 'Horário',
  lovable_ai: 'Lovable AI',
  pipeline: 'Pipeline',
  profile: 'Perfil',
  nina_settings: 'Configurações',
};

const statusConfig = {
  ok:      { icon: CheckCircle,   bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', gradient: 'from-emerald-50 to-white border-emerald-200' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   gradient: 'from-amber-50 to-white border-amber-200'     },
  error:   { icon: XCircle,       bg: 'bg-red-50 border-red-200',         text: 'text-red-700',     gradient: 'from-red-50 to-white border-red-200'         },
};

export const SystemHealthCard: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-setup');
      if (error) throw error;
      setHealthData(data);
    } catch (error) {
      console.error('Error fetching health:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Verificando sistema...</span>
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  const cfg = statusConfig[healthData.overallStatus];
  const StatusIcon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border bg-gradient-to-br p-6 transition-all duration-300', cfg.gradient)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <StatusIcon className={cn('w-4 h-4', cfg.text)} />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Status do Sistema</h3>
            <p className="text-xs text-muted-foreground">{healthData.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('px-3 py-1 rounded-full text-xs font-medium border', cfg.bg, cfg.text)}>
            {healthData.summary.percentage}% OK
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('w-4 h-4', loading ? 'animate-spin' : '')} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-border rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${healthData.summary.percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            healthData.overallStatus === 'ok'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : healthData.overallStatus === 'warning'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
              : 'bg-gradient-to-r from-red-500 to-rose-400',
          )}
        />
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-2 gap-2 mt-2"
        >
          {healthData.results.map((result, index) => {
            const resCfg = statusConfig[result.status];
            return (
              <motion.div
                key={result.component}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn('flex items-center gap-2 p-2 rounded-lg border', resCfg.bg)}
              >
                <div className={cn('flex-shrink-0', resCfg.text)}>
                  {componentIcons[result.component] || <CheckCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-medium truncate', resCfg.text)}>
                    {componentLabels[result.component] || result.component}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{result.message}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
};
