/**
 * One-off: transcribes customer audio since a date (default 2026-10-01).
 * In the container: node dist/scripts/transcribeBackfill.js [YYYY-MM-DD]
 */
import 'dotenv/config';
import { conversationRepository } from '../persistence/ConversationRepository.js';
import { transcriptionService } from '../transcription/TranscriptionService.js';

const since = process.argv[2] ?? '2026-10-01';
const ids = await conversationRepository.listUntranscribedCustomerAudio(`${since}T00:00:00-03:00`);
console.log(`[backfill] ${ids.length} customer audio messages since ${since}`);

let done = 0;
await Promise.all(ids.map(async (id) => {
  await transcriptionService.transcribe(id);
  if (++done % 25 === 0 || done === ids.length) console.log(`[backfill] ${done}/${ids.length}`);
}));
process.exit(0);
