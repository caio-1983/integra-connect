import React, { useEffect, useState } from 'react';
import { Plus, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/Button';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { useWhatsappInstances } from '@/hooks/useWhatsappInstances';
import { useInstanceAccessGrants } from '@/hooks/useInstanceAccessGrants';
import { useInstanceLabels } from '@/hooks/useInstanceLabels';
import { WhatsAppInstanceCard } from './WhatsAppInstanceCard';
import { EvolutionConnectSheet } from './EvolutionConnectSheet';
import { BackendUnreachable } from './BackendUnreachable';

const EMPTY_GRANTS = new Set<string>();

function checkedAgo(date: Date | undefined, now: number): string {
  if (!date) return '';
  const s = Math.max(1, Math.round((now - date.getTime()) / 1000));
  return s < 60 ? `verificado há ${s} s` : `verificado há ${Math.round(s / 60)} min`;
}

/** The WhatsApp block in Conexões: every real Evolution instance as a row,
 *  auto-refreshing every 10s, plus the action to connect a new number. */
export const WhatsAppSection: React.FC = () => {
  const { instances, loading, lastFetchedAt, error, refresh } = useWhatsappInstances();
  const { grantsByInstance, refresh: refreshGrants } = useInstanceAccessGrants();
  const { labels, refresh: refreshLabels } = useInstanceLabels();
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  const connectedCount = instances.filter((instance) => instance.connected).length;

  const description = loading
    ? 'Carregando números…'
    : error
      ? instances.length > 0
        ? `Sem resposta do servidor · última lista ${checkedAgo(lastFetchedAt, now).replace('verificado ', '')}`
        : 'Sem resposta do servidor.'
      : instances.length === 0
      ? 'Nenhum número conectado ainda.'
      : `${connectedCount} de ${instances.length} conectado${instances.length === 1 ? '' : 's'} · ${checkedAgo(lastFetchedAt, now)}`;

  return (
    <Panel
      title="WhatsApp"
      description={description}
      action={
        <Button size="sm" onClick={() => setNewSheetOpen(true)}>
          <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Conectar número
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" /> Carregando números…
        </div>
      ) : error && instances.length === 0 ? (
        <BackendUnreachable detail={error} onRetry={refresh} />
      ) : instances.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Smartphone className="w-9 h-9 text-icon/40" aria-hidden="true" />
          <p className="text-[15px] text-foreground">Nenhum número conectado</p>
          <p className="text-sm text-muted-foreground">Clique em "Conectar número" e escaneie o QR Code pelo celular.</p>
        </div>
      ) : (
        <ul className="pb-2">
          {instances.map((instance) => (
            <WhatsAppInstanceCard
              key={instance.name}
              instance={instance}
              onChanged={refresh}
              grantedUserIds={grantsByInstance.get(instance.name) ?? EMPTY_GRANTS}
              onGrantsChanged={refreshGrants}
              customLabel={labels[instance.name]}
              onLabelChanged={refreshLabels}
            />
          ))}
        </ul>
      )}

      <EvolutionConnectSheet
        open={newSheetOpen}
        onOpenChange={(next) => { setNewSheetOpen(next); if (!next) refresh(); }}
      />
    </Panel>
  );
};
