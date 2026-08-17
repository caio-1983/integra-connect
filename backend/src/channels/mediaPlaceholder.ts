import type { InboundMediaKind } from './evolution/types.js';

/**
 * Fallback text for a media message that arrives with no caption, so it is never
 * dropped (the pipeline requires non-empty text) and reads sensibly in the
 * timeline.
 *
 * Shared by every channel's parser: these strings are user-visible, and having
 * WhatsApp say "📷 Imagem" while Instagram said something else would be a
 * consistency bug (Design Principle 4 in PRODUCT.md).
 */
export const MEDIA_PLACEHOLDER: Record<InboundMediaKind, string> = {
  audio: '🎤 Mensagem de voz',
  image: '📷 Imagem',
  video: '🎥 Vídeo',
  document: '📄 Documento',
  sticker: '💟 Figurinha',
};
