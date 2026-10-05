-- Marca de contato "salvo" pela equipe.
-- Contatos nascem automaticamente na 1ª mensagem (webhook) só com número +
-- pushName; saved_at nulo = ainda não revisado/salvo por um atendente.
alter table public.contacts
  add column if not exists saved_at timestamptz,
  add column if not exists saved_by uuid references auth.users(id) on delete set null;

create index if not exists contacts_unsaved_idx
  on public.contacts (last_activity desc)
  where saved_at is null;
