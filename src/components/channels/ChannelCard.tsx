import React, { useState } from 'react';
import { Loader2, Settings as SettingsIcon } from 'lucide-react';
import type { ChannelType } from '@/types';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { useChannelProvider } from '@/hooks/useChannelProvider';
import { Button } from '@/components/Button';
import { ChannelConfigSheet } from './ChannelConfigSheet';
import { toast } from 'sonner';

interface ChannelCardProps {
  channel: ChannelType;
}

function formatSyncTime(iso?: string | null): string {
  if (!iso) return 'Nunca sincronizado';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export const ChannelCard: React.FC<ChannelCardProps> = ({ channel }) => {
  const { status, connect, disconnect } = useChannelProvider(channel);
  const [busy, setBusy] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const cfg = CHANNEL_CONFIG[channel];
  const Icon = cfg.icon;

  const handleConnect = async () => {
    setBusy(true);
    try {
      await connect();
      toast.success(`${cfg.label} conectado`);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnect();
      toast.success(`${cfg.label} desconectado`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${cfg.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">{cfg.label}</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
          status.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {status.connected ? 'Conectado' : 'Aguardando'}
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Conta conectada</span>
          <span className="text-foreground font-medium truncate max-w-[60%]">{status.accountName || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Última sincronização</span>
          <span className="text-foreground font-medium">{formatSyncTime(status.lastSyncAt)}</span>
        </div>
      </div>

      {channel === 'whatsapp' && (
        <p className="text-[10px] text-muted-foreground">
          Credenciais técnicas ficam em Configurações → APIs. Aqui você gerencia apenas as regras operacionais deste canal.
        </p>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1">
        {status.connected ? (
          <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Desconectar'}
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={handleConnect} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reconectar'}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setConfigOpen(true)}>
          <SettingsIcon className="w-3.5 h-3.5 mr-1" />
          Configurações
        </Button>
      </div>

      <ChannelConfigSheet channel={channel} open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
};
