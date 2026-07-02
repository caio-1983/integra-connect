import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/Button';
import type { ChannelAccountStatus, ChannelType } from '@/types';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { useChannelProvider } from '@/hooks/useChannelProvider';
import { MOCK_TEAM_EXTENDED } from '@/lib/mockData';
import { BusinessHoursEditor } from './BusinessHoursEditor';
import { toast } from 'sonner';

interface ChannelConfigSheetProps {
  channel: ChannelType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChannelConfigSheet: React.FC<ChannelConfigSheetProps> = ({ channel, open, onOpenChange }) => {
  const { status, capabilities, updateConfig } = useChannelProvider(channel);
  const cfg = CHANNEL_CONFIG[channel];
  const Icon = cfg.icon;
  const [form, setForm] = useState<ChannelAccountStatus>(status);

  useEffect(() => {
    if (open) setForm(status);
    // Re-sync local edit buffer whenever the sheet opens for a (possibly different) channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, channel]);

  const handleSave = () => {
    updateConfig(form);
    toast.success(`Configurações de ${cfg.label} salvas`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-background border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            Configurações — {cfg.label}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* IA e regras gerais */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Regras do Canal</h3>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div>
                <p className="text-sm text-foreground font-medium">IA habilitada</p>
                <p className="text-[11px] text-muted-foreground">Nina responde automaticamente neste canal</p>
              </div>
              <Switch checked={form.aiEnabled} onCheckedChange={(checked) => setForm({ ...form, aiEnabled: checked })} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Agente padrão</label>
              <select
                value={form.defaultAgentId ?? ''}
                onChange={(e) => setForm({ ...form, defaultAgentId: e.target.value || null })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">Nenhum (fila geral)</option>
                {MOCK_TEAM_EXTENDED.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mensagem de saudação</label>
              <textarea
                value={form.greetingMessage ?? ''}
                onChange={(e) => setForm({ ...form, greetingMessage: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tags automáticas</label>
                <input
                  type="text"
                  value={(form.autoTags ?? []).join(', ')}
                  onChange={(e) => setForm({ ...form, autoTags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                  placeholder="ex: whatsapp, prioridade"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">SLA (minutos)</label>
                <input
                  type="number"
                  min={1}
                  value={form.slaMinutes ?? ''}
                  onChange={(e) => setForm({ ...form, slaMinutes: Number(e.target.value) || undefined })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
            </div>
          </section>

          {/* Horário de atendimento */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Horário de Atendimento</h3>
            <BusinessHoursEditor
              value={form.businessHours}
              onChange={(businessHours) => setForm({ ...form, businessHours })}
            />
          </section>

          {/* Mensagens automáticas */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Mensagens Automáticas</h3>
            <p className="text-[11px] text-muted-foreground -mt-1">
              Apenas configuração nesta etapa — nenhuma automação é executada ainda.
            </p>
            {([
              ['welcome', 'Boas-vindas'],
              ['afterHours', 'Fora do expediente'],
              ['transfer', 'Transferência'],
              ['closing', 'Encerramento'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
                <textarea
                  value={form.autoResponses[key] ?? ''}
                  onChange={(e) => setForm({ ...form, autoResponses: { ...form.autoResponses, [key]: e.target.value } })}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                />
              </div>
            ))}
          </section>

          {/* Capacidades (somente leitura) */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Capacidades do Canal</h3>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(capabilities) as Array<[string, boolean]>).filter(([, v]) => v).map(([key]) => (
                <span key={key} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                  {key}
                </span>
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
