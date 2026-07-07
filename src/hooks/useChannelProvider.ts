import { useCallback, useMemo, useState } from 'react';
import type { ChannelAccountStatus, ChannelInboundEvent, ChannelType, WebchatWidgetConfig } from '@/types';
import { createChannelProvider } from '@/services/provider-factory';
import { getWebchatWidgetConfig, updateWebchatWidgetConfig } from '@/services/channel-service';

/**
 * Thin React wrapper around a channel's provider. Owns channel
 * *configuration* (status, connect/disconnect, capabilities) for the admin
 * surfaces (Conexões, Chat do Site). The live conversation queue
 * is a separate concern handled by useConversations.ts.
 */
export function useChannelProvider(channel: ChannelType) {
  const provider = useMemo(() => createChannelProvider(channel), [channel]);
  const [status, setStatus] = useState<ChannelAccountStatus>(() => provider.getStatus());

  const refresh = useCallback(() => setStatus(provider.getStatus()), [provider]);

  const connect = useCallback(async () => {
    await provider.connect();
    refresh();
  }, [provider, refresh]);

  const disconnect = useCallback(async () => {
    await provider.disconnect();
    refresh();
  }, [provider, refresh]);

  const updateConfig = useCallback(
    (partial: Partial<ChannelAccountStatus>) => {
      provider.updateConfig(partial);
      refresh();
    },
    [provider, refresh]
  );

  const simulateInbound = useCallback(
    (overrides?: Partial<ChannelInboundEvent>) => provider.receiveMessage(overrides),
    [provider]
  );

  return {
    provider,
    status,
    capabilities: provider.capabilities,
    connect,
    disconnect,
    updateConfig,
    refresh,
    simulateInbound,
  };
}

const DEFAULT_WEBCHAT_WIDGET_CONFIG: WebchatWidgetConfig = {
  primaryColor: '#0ea5e9',
  agentName: 'Nina',
  companyName: 'Integra Connect',
  greeting: 'Olá! Como posso ajudar você hoje?',
  offlineMessage: 'Estamos fora do horário de atendimento. Deixe sua mensagem que responderemos em breve.',
  avatarUrl: undefined,
  logoUrl: undefined,
  position: 'bottom-right',
  authorizedDomain: 'app.integraconnect.com.br',
  widgetStatus: 'active',
  widgetVersion: 'v1.4.2',
};

/** Backs the "Chat do Site" settings page — separate from the generic
 *  ChannelAccountStatus since it holds webchat-specific widget fields. */
export function useWebchatWidgetConfig() {
  const [config, setConfig] = useState<WebchatWidgetConfig>(() =>
    getWebchatWidgetConfig(DEFAULT_WEBCHAT_WIDGET_CONFIG)
  );

  const updateConfig = useCallback((partial: Partial<WebchatWidgetConfig>) => {
    setConfig((prev) => updateWebchatWidgetConfig(partial, prev));
  }, []);

  return { config, updateConfig };
}
