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

-- How a project shows on /projetos: a friendlier name and "excluir" (hidden
-- from the list). Display only: the message and its PDF are never touched.
create table if not exists public.lighting_project_labels (
  message_id uuid primary key references public.messages (id) on delete restrict,
  display_name text check (display_name is null or length(display_name) between 1 and 200),
  hidden_at timestamptz,
  updated_by uuid references auth.users (id) default auth.uid(),
  updated_at timestamptz not null default now()
);

alter table public.lighting_project_labels enable row level security;

create policy lighting_project_labels_select on public.lighting_project_labels
  for select to authenticated using (true);
create policy lighting_project_labels_insert on public.lighting_project_labels
  for insert to authenticated with check (true);
create policy lighting_project_labels_update on public.lighting_project_labels
  for update to authenticated using (true) with check (true);
