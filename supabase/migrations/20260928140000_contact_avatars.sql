-- Contact profile pictures, copied from WhatsApp into our own storage.
-- WhatsApp's pps.whatsapp.net links expire after a few days, so the backend
-- downloads the image and serves it from this public bucket instead.
-- profile_picture_checked_at throttles re-fetching (every 7 days) and also marks
-- contacts that hide their photo, so they aren't asked again on every message.

alter table public.contacts
  add column if not exists profile_picture_checked_at timestamptz;

insert into storage.buckets (id, name, public)
values ('contact-avatars', 'contact-avatars', true)
on conflict (id) do nothing;
