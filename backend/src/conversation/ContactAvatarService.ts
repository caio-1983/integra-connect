import { logger } from '../logger/Logger.js';
import { conversationRepository } from '../persistence/ConversationRepository.js';
import { getEvolutionClient } from '../channels/evolution/evolutionClientInstance.js';

/** How long a fetched (or confirmed-missing) picture is trusted before re-checking. */
export const AVATAR_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Contacts with a refresh in flight — a burst of messages triggers one fetch, not one each. */
const inFlight = new Set<string>();

/**
 * Keeps `contacts.profile_picture_url` filled with a copy of the WhatsApp
 * profile picture. WhatsApp's own links (pps.whatsapp.net) expire in days, so
 * the image is downloaded and re-served from our `contact-avatars` bucket.
 */
export const contactAvatarService = {
  isStale(checkedAt: string | null): boolean {
    return !checkedAt || Date.now() - new Date(checkedAt).getTime() > AVATAR_TTL_MS;
  },

  /** Fetches, copies and stores the picture. Throws on failure — callers on
   * the message path should use refreshInBackground instead. */
  async refresh(contactId: string, instance: string, phone: string): Promise<'updated' | 'none'> {
    const url = await getEvolutionClient().fetchProfilePictureUrl(instance, phone);
    if (!url) {
      await conversationRepository.setContactAvatar(contactId, null);
      return 'none';
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download da foto falhou: ${res.status}`);
    const image = Buffer.from(await res.arrayBuffer());
    const publicUrl = await conversationRepository.uploadContactAvatar(contactId, image, res.headers.get('content-type') ?? 'image/jpeg');
    await conversationRepository.setContactAvatar(contactId, publicUrl);
    return 'updated';
  },

  /** Fire-and-forget refresh for the inbound path: never throws, never delays the message. */
  refreshInBackground(contactId: string, instance: string, phone: string): void {
    if (inFlight.has(contactId)) return;
    inFlight.add(contactId);
    this.refresh(contactId, instance, phone)
      .catch((error) => logger.warn({ err: String(error), contactId }, '[avatar] failed to refresh contact picture'))
      .finally(() => inFlight.delete(contactId));
  },
};
