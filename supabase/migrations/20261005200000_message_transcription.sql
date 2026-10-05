-- Transcription of customer voice notes (backend TranscriptionService).
-- Status: pending | done | failed | skipped. Null = never queued (e.g. team audio).
alter table public.messages
  add column if not exists transcription text,
  add column if not exists transcription_status text
    check (transcription_status in ('pending', 'done', 'failed', 'skipped')),
  add column if not exists transcribed_at timestamptz;

-- Backfill/retry scan: customer audio still waiting for a transcript.
create index if not exists messages_audio_transcription_pending_idx
  on public.messages (sent_at)
  where type = 'audio' and from_type = 'user' and transcription_status is distinct from 'done';
