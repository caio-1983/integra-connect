import type { InstanceSummary, RawFetchedInstance } from './types.js';

/**
 * Normalizes Evolution's raw `fetchInstances` shape into our own contract
 * (Sprint 012 spec: "normalizar no EvolutionConnector — o frontend nunca deve
 * conhecer diferenças entre versões"). Accepts both the flat shape a live
 * v2.3.7 server actually sends and the older `{instance:{...}}` wrapper, so
 * one normalizer works regardless of which the deployed server uses.
 */
export function toInstanceSummary(raw: RawFetchedInstance): InstanceSummary {
  const name = raw.instance?.instanceName ?? raw.name ?? '';
  const owner = raw.instance?.owner ?? raw.ownerJid ?? undefined;
  const profileName = raw.instance?.profileName ?? raw.profileName ?? undefined;
  const profilePicture = raw.instance?.profilePictureUrl ?? raw.profilePicUrl ?? undefined;
  const status = raw.instance?.status ?? raw.connectionStatus ?? 'close';
  return {
    name,
    number: owner ? `+${owner.replace(/@s\.whatsapp\.net$/, '')}` : undefined,
    status,
    connected: status === 'open',
    profileName: profileName ?? undefined,
    profilePicture: profilePicture ?? undefined,
  };
}
