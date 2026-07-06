import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/Button';
import type { AgentConfig, AgentId } from '@/ai/types';
import { getAgentConfig, updateAgentConfig } from '@/ai/services/agentConfigService';
import { MOCK_AI_MODELS } from '@/lib/mockAIData';
import { TOOL_REGISTRY } from '@/ai/tools/registry';
import { toast } from 'sonner';

interface AgentConfigSheetProps {
  agentId: AgentId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AgentConfigSheet: React.FC<AgentConfigSheetProps> = ({ agentId, open, onOpenChange }) => {
  const [form, setForm] = useState<AgentConfig>(() => getAgentConfig(agentId));
  const executionMode = form.executionMode ?? 'local';

  useEffect(() => {
    if (open) setForm(getAgentConfig(agentId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agentId]);

  const handleSave = () => {
    updateAgentConfig(agentId, form);
    toast.success(`Configurações de ${form.name} salvas`);
    onOpenChange(false);
  };

  const toggleTool = (toolId: string) => {
    setForm((f) => ({
      ...f,
      toolIds: f.toolIds.includes(toolId) ? f.toolIds.filter((t) => t !== toolId) : [...f.toolIds, toolId],
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-background border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configurações — {form.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Identidade</h3>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome exibido</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as AgentConfig['status'] })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="draft">Em preparação</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioridade</label>
                <input
                  type="number"
                  min={1}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 1 })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Execução</h3>
            <select
              value={executionMode}
              onChange={(e) => setForm({ ...form, executionMode: e.target.value as AgentConfig['executionMode'] })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              <option value="local">Local (mock, sem custo)</option>
              <option value="backend">Backend (real, via AI Runtime)</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              {executionMode === 'backend'
                ? 'Requer o AI Runtime (Sprint 010) rodando e configurado em VITE_AI_GATEWAY_URL/VITE_AI_GATEWAY_KEY. O modelo e o provider passam a ser decididos pelo backend.'
                : 'Executa inteiramente no navegador via LocalAIProvider — sem chamadas de rede, sem custo.'}
            </p>
          </section>

          {executionMode === 'local' && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Modelo</h3>
              <select
                value={form.modelId}
                onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                {MOCK_AI_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.provider !== 'local' ? '(em breve)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Apenas o provider Local está implementado nesta sprint — os demais ficam disponíveis para seleção futura.
              </p>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Ferramentas</h3>
            <div className="space-y-1.5">
              {Object.values(TOOL_REGISTRY).map((tool) => (
                <label key={tool.id} className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox checked={form.toolIds.includes(tool.id)} onCheckedChange={() => toggleTool(tool.id)} />
                  {tool.name}
                </label>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
