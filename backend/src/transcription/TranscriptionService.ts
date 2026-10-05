import OpenAI, { toFile } from 'openai';
import { configService } from '../config/ConfigService.js';
import { logger } from '../logger/Logger.js';
import { conversationRepository } from '../persistence/ConversationRepository.js';

/** WhatsApp voice notes are ~16 kbit/s opus (~2 KB/s): 2 MB ≈ 15 min. Longer
 *  files are skipped — the cost guard, since duration is not stored. */
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_CONCURRENT = 3;

// Vocabulary hint: improves product names and jargon in the transcript.
const PROMPT = 'Atendimento da Lumina LED Store pelo WhatsApp. Termos comuns: fita LED, perfil de alumínio, driver, fonte, lâmpada, plafon, spot, trilho, arandela, 12V, 24V, 3000K, 4000K, 6500K, Pix, orçamento, frete.';

let client: OpenAI | undefined;
function getClient(): OpenAI {
  client ??= new OpenAI({ apiKey: configService.require('OPENAI_API_KEY') });
  return client;
}

/** Kill switch: customer audio is only transcribed when AUDIO_TRANSCRIBE=true. */
export function audioTranscribeEnabled(): boolean {
  return (configService.get('AUDIO_TRANSCRIBE') ?? '').toLowerCase() === 'true';
}

let running = 0;
const waiting: Array<() => void> = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

async function transcribeOnce(mediaUrl: string, mediaType: string | null): Promise<string | 'too_long'> {
  const res = await fetch(mediaUrl);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_BYTES) return 'too_long';

  const result = await getClient().audio.transcriptions.create({
    file: await toFile(buffer, 'audio.ogg', { type: mediaType ?? 'audio/ogg' }),
    model: configService.get('TRANSCRIBE_MODEL') || 'gpt-4o-mini-transcribe',
    language: 'pt',
    prompt: PROMPT,
  });
  return result.text.trim();
}

/** Transcribes one stored customer audio message and saves the result on the
 *  row (realtime carries it to the inbox). Never throws. */
async function transcribe(messageId: string): Promise<void> {
  await withSlot(async () => {
    const audio = await conversationRepository.getAudioForTranscription(messageId);
    if (!audio || audio.status === 'done') return;
    if (!audio.mediaUrl) {
      await conversationRepository.setTranscription(messageId, 'skipped');
      return;
    }
    await conversationRepository.setTranscription(messageId, 'pending');

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await transcribeOnce(audio.mediaUrl, audio.mediaType);
        if (text === 'too_long') {
          await conversationRepository.setTranscription(messageId, 'skipped');
        } else {
          await conversationRepository.setTranscription(messageId, 'done', text);
        }
        return;
      } catch (err) {
        logger.warn({ err: (err as Error).message, messageId, attempt }, '[transcription] failed');
      }
    }
    await conversationRepository.setTranscription(messageId, 'failed');
  }).catch((err) => logger.error({ err: (err as Error).message, messageId }, '[transcription] unexpected error'));
}

export const transcriptionService = {
  transcribe,
  /** Fire-and-forget: the webhook path must not wait on OpenAI. */
  transcribeInBackground(messageId: string): void {
    void transcribe(messageId);
  },
};
