import React, { useState } from 'react';
import { Bot, Settings as SettingsIcon } from 'lucide-react';
import type { AgentId } from '@/ai/types';
import { getAgentConfig } from '@/ai/services/agentConfigService';
import { getToolsByIds } from '@/ai/tools/registry';
import { MOCK_AI_MODELS, MOCK_KNOWLEDGE_ARTICLES } from '@/lib/mockAIData';
import { Button } from '@/components/Button';
import { AgentConfigSheet } from './AgentConfigSheet';

interface AgentCardProps {
  agentId: AgentId;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-emerald-50 text-emerald-700' },
  inactive: { label: 'Inativo', color: 'bg-muted text-muted-foreground' },
  draft: { label: 'Em preparação', color: 'bg-amber-50 text-amber-700' },
};

const AgentCard: React.FC<AgentCardProps> = ({ agentId }) => {
  const [configOpen, setConfigOpen] = useState(false);
  const config = getAgentConfig(agentId);
  const model = MOCK_AI_MODELS.find((m) => m.id === config.modelId);
  const tools = getToolsByIds(config.toolIds);
  const knowledgeCount = MOCK_KNOWLEDGE_ARTICLES.filter((a) => a.agentIds.includes(agentId)).length;
  const status = STATUS_LABEL[config.status];

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{config.name}</h3>
            <p className="text-[11px] text-muted-foreground">Prioridade {config.priority}</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${status.color}`}>{status.label}</div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{config.description}</p>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Modelo</span>
          <span className="text-foreground font-medium">{model?.name ?? config.modelId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ferramentas</span>
          <span className="text-foreground font-medium text-right max-w-[60%] truncate">
            {tools.length > 0 ? tools.map((t) => t.name).join(', ') : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Conhecimento associado</span>
          <span className="text-foreground font-medium">{knowledgeCount} artigo(s)</span>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)} className="mt-auto">
        <SettingsIcon className="w-3.5 h-3.5 mr-1.5" />
        Configurar
      </Button>

      <AgentConfigSheet agentId={agentId} open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
};

export { AgentCard };
