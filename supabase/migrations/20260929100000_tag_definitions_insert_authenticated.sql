-- Attendants create tags from the conversation panel ("Criar nova tag"), but
-- the only write policy on tag_definitions was admin-only, so for them it
-- failed with "Erro ao criar tag". Any signed-in user may now CREATE a tag;
-- editing and deleting stay admin-only (existing "Admins can modify" policy).

drop policy if exists "Authenticated can create tag_definitions" on public.tag_definitions;
create policy "Authenticated can create tag_definitions"
  on public.tag_definitions
  for insert
  to authenticated
  with check (true);
