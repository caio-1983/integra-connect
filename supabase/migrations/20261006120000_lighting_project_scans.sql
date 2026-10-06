-- Whether a chat PDF is a lighting project (backend LightingProjectService).
-- A message's attachment never changes, so each PDF is read once for everyone
-- instead of on every /projetos visit. Failed reads are not stored.
create table if not exists public.lighting_project_scans (
  message_id uuid primary key references public.messages (id) on delete restrict,
  is_project boolean not null,
  total integer not null default 0,
  divergent boolean not null default false,
  scanned_at timestamptz not null default now()
);

-- Backend-only (service role); no client access.
alter table public.lighting_project_scans enable row level security;
