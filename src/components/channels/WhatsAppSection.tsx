import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { SectionBlock } from '@/components/layout';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { useWhatsappInstances } from '@/hooks/useWhatsappInstances';
import { WhatsAppInstanceCard } from './WhatsAppInstanceCard';
import { EvolutionConnectSheet } from './EvolutionConnectSheet';

const cfg = CHANNEL_CONFIG.whatsapp;

/** The WhatsApp block in Conexões: every real Evolution instance as
 *  its own card, auto-refreshing every 10s, plus a tile to start a new
 *  connection. */
export const WhatsAppSection: React.FC = () => {
  const { instances, loading, lastFetchedAt, refresh } = useWhatsappInstances();
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const connectedCount = instances.filter((instance) => instance.connected).length;

  const description = loading
    ? 'Carregando números…'
    : instances.length === 0
      ? 'Nenhum número conectado ainda'
      : `${connectedCount} de ${instances.length} conectado${connectedCount === 1 ? '' : 's'}`;

  return (
    <SectionBlock title={cfg.label} icon={cfg.icon} description={description}>
      {loading ? (
        <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-center gap-2 text-sm text-muted-foreground h-40">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando instâncias do WhatsApp…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((instance) => (
            <WhatsAppInstanceCard key={instance.name} instance={instance} lastFetchedAt={lastFetchedAt} onChanged={refresh} />
          ))}

          <button
            type="button"
            onClick={() => setNewSheetOpen(true)}
            className="rounded-xl border border-dashed border-border bg-card p-5 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors min-h-[160px]"
          >
            <Plus className="w-5 h-5" />
            Nova conexão
          </button>
        </div>
      )}

      <EvolutionConnectSheet
        open={newSheetOpen}
        onOpenChange={(next) => { setNewSheetOpen(next); if (!next) refresh(); }}
      />
    </SectionBlock>
  );
};
