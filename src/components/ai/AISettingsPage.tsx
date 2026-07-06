import React, { useState } from 'react';
import { PageContainer, PageHeader } from '@/components/layout';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/Button';
import { getAIConfig, updateAIConfig, type AIConfig } from '@/ai/services/aiConfigService';
import { getAllAgents } from '@/ai/services/agent-factory';
import { getAllAIProviderIds } from '@/ai/services/ai-provider-factory';
import { toast } from 'sonner';

const PROVIDER_LABEL: Record<string, string> = {
  local: 'Local (mock)',
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini',
  ollama: 'Ollama',
};

const AISettingsPage: React.FC = () => {
  const [form, setForm] = useState<AIConfig>(() => getAIConfig());
  const agents = getAllAgents();
  const providerIds = getAllAIProviderIds();

  const handleSave = () => {
    updateAIConfig(form);
    toast.success('Configurações de IA salvas');
  };

  return (
    <PageContainer>
      <PageHeader
        title="Configurações"
        description="Regras gerais de comportamento da IA no Workspace."
      />

      <div className="max-w-xl rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
          <div>
            <p className="text-sm text-foreground font-medium">Atendimento autônomo habilitado</p>
            <p className="text-[11px] text-muted-foreground">Novas conversas iniciam pela IA quando ativado.</p>
          </div>
          <Switch checked={form.autonomousEnabled} onCheckedChange={(checked) => setForm({ ...form, autonomousEnabled: checked })} />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Agente padrão</label>
          <select
            value={form.defaultAgentId}
            onChange={(e) => setForm({ ...form, defaultAgentId: e.target.value as AIConfig['defaultAgentId'] })}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.config.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Provedor de IA ativo</label>
          <select
            value={form.activeProviderId}
            onChange={(e) => setForm({ ...form, activeProviderId: e.target.value as AIConfig['activeProviderId'] })}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            {providerIds.map((id) => (
              <option key={id} value={id}>{PROVIDER_LABEL[id] ?? id}{id !== 'local' ? ' (em breve)' : ''}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Apenas o provedor Local está implementado nesta sprint — os demais aparecem como estrutura preparada.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted-foreground">Confiança mínima antes de transferir</label>
            <span className="text-xs font-bold text-foreground">{Math.round(form.confidenceThreshold * 100)}%</span>
          </div>
          <Slider
            value={[form.confidenceThreshold * 100]}
            onValueChange={([v]) => setForm({ ...form, confidenceThreshold: v / 100 })}
            min={0}
            max={100}
            step={5}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Máximo de tentativas sem sucesso</label>
          <input
            type="number"
            min={1}
            value={form.maxFailedAttempts}
            onChange={(e) => setForm({ ...form, maxFailedAttempts: Number(e.target.value) || 1 })}
            className="h-9 w-32 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default AISettingsPage;
