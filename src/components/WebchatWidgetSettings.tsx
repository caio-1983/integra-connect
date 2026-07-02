import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/Button';
import { BusinessHoursEditor } from '@/components/channels';
import { useChannelProvider, useWebchatWidgetConfig } from '@/hooks/useChannelProvider';
import { MOCK_TEAM_EXTENDED } from '@/lib/mockData';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { toast } from 'sonner';

const WebchatWidgetSettings: React.FC = () => {
  const { config, updateConfig } = useWebchatWidgetConfig();
  const { status, updateConfig: updateChannelConfig } = useChannelProvider('webchat');
  const [copied, setCopied] = useState(false);
  const cfg = CHANNEL_CONFIG.webchat;

  const snippet = `<script src="https://cdn.integraconnect.app/widget.js" data-company="${config.companyName}" data-color="${config.primaryColor}" data-position="${config.position}" data-domain="${config.authorizedDomain}"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success('Snippet copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Widget Webchat"
        description="Configure a aparência, o comportamento e a instalação do canal nativo de webchat."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Identidade */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-sm">Identidade</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome da empresa</label>
                <input
                  type="text"
                  value={config.companyName}
                  onChange={(e) => updateConfig({ companyName: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome do atendente</label>
                <input
                  type="text"
                  value={config.agentName}
                  onChange={(e) => updateConfig({ agentName: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cor principal</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                    className="h-9 w-12 rounded-lg border border-border bg-background cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                    className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Posição do widget</label>
                <select
                  value={config.position}
                  onChange={(e) => updateConfig({ position: e.target.value as 'bottom-right' | 'bottom-left' })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="bottom-right">Inferior direita</option>
                  <option value="bottom-left">Inferior esquerda</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Logo (URL)</label>
                <input
                  type="text"
                  value={config.logoUrl ?? ''}
                  onChange={(e) => updateConfig({ logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Avatar do atendente (URL)</label>
                <input
                  type="text"
                  value={config.avatarUrl ?? ''}
                  onChange={(e) => updateConfig({ avatarUrl: e.target.value })}
                  placeholder="https://..."
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
            </div>
          </div>

          {/* Mensagens e comportamento */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-sm">Mensagens e Comportamento</h3>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mensagem inicial</label>
              <textarea
                value={config.greeting}
                onChange={(e) => updateConfig({ greeting: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mensagem fora do horário</label>
              <textarea
                value={config.offlineMessage}
                onChange={(e) => updateConfig({ offlineMessage: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
              <div>
                <p className="text-sm text-foreground font-medium">IA habilitada</p>
                <p className="text-[11px] text-muted-foreground">Nina atende automaticamente pelo widget</p>
              </div>
              <Switch checked={status.aiEnabled} onCheckedChange={(checked) => updateChannelConfig({ aiEnabled: checked })} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Agente padrão</label>
              <select
                value={status.defaultAgentId ?? ''}
                onChange={(e) => updateChannelConfig({ defaultAgentId: e.target.value || null })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">Nenhum (fila geral)</option>
                {MOCK_TEAM_EXTENDED.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Horário de atendimento</p>
              <BusinessHoursEditor
                value={status.businessHours}
                onChange={(businessHours) => updateChannelConfig({ businessHours })}
              />
            </div>
          </div>

          {/* Operação (simulado) */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-sm">Operação</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Domínio autorizado</label>
                <input
                  type="text"
                  value={config.authorizedDomain}
                  onChange={(e) => updateConfig({ authorizedDomain: e.target.value })}
                  placeholder="app.suaempresa.com.br"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status do widget</label>
                <div className={`h-9 flex items-center gap-2 px-3 rounded-lg border text-xs font-medium ${
                  config.widgetStatus === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${config.widgetStatus === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {config.widgetStatus === 'active' ? 'Ativo' : 'Inativo'}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Última sincronização</p>
                <p className="text-sm text-foreground">{status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('pt-BR') : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Versão do widget</p>
                <p className="text-sm text-foreground font-mono">{config.widgetVersion}</p>
              </div>
            </div>
          </div>

          {/* Instalação */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Instalação</h3>
            <p className="text-[11px] text-muted-foreground">
              Cole este snippet antes do fechamento da tag &lt;/body&gt; do seu site. (Prévia do instalador — nenhum widget real é hospedado nesta etapa.)
            </p>
            <div className="flex gap-2">
              <code className="flex-1 h-9 flex items-center rounded-lg border border-border bg-background px-3 text-[11px] text-muted-foreground font-mono overflow-x-auto whitespace-nowrap">
                {snippet}
              </code>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="px-3">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-5 sticky top-6">
            <h3 className="font-semibold text-foreground text-sm mb-4">Pré-visualização</h3>
            <div className="relative h-80 rounded-lg bg-muted/40 border border-border overflow-hidden">
              <div
                className={`absolute bottom-3 ${config.position === 'bottom-right' ? 'right-3' : 'left-3'} w-56 rounded-xl shadow-lg border border-border bg-background overflow-hidden`}
              >
                <div
                  className="px-3 py-2.5 flex items-center gap-2 text-white"
                  style={{ backgroundColor: config.primaryColor }}
                >
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <cfg.icon className="w-4 h-4" />
                  )}
                  <span className="text-xs font-semibold truncate">{config.companyName}</span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-start gap-1.5">
                    {config.avatarUrl ? (
                      <img src={config.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted flex-shrink-0" />
                    )}
                    <div className="bg-muted rounded-lg rounded-tl-sm px-2.5 py-1.5 text-[11px] text-foreground max-w-[85%]">
                      {config.greeting || 'Olá! Como posso ajudar?'}
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground pl-6">{config.agentName} · {CHANNEL_CONFIG.webchat.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default WebchatWidgetSettings;
