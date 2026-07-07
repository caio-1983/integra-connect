-- RBAC de 3 papéis (Etapa 2/2): gestor pode criar/editar/remover contas de
-- atendente e de outro gestor (nunca de admin); admin mantém poder total.
--
-- team_members.role é o campo editado pela UI; user_roles.role (app_role) é
-- quem de fato governa has_role()/RLS. Um trigger mantém os dois em sincronia
-- automaticamente, então nenhum call site (edge function ou update direto do
-- frontend) precisa lembrar de escrever nas duas tabelas.

-- ---------------------------------------------------------------------------
-- 1. handle_new_user(): usa o novo nome do valor do enum ('agent' em vez de
--    'user'). Comportamento de bootstrap (primeiro usuário = admin, resto =
--    agent) continua idêntico — só o literal muda.
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'agent';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');

  -- Give first user admin role, others get agent role
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'agent';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);

  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.team_members (name, email, role, status, user_id, weight)
    VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      CASE WHEN assigned_role = 'admin' THEN 'admin' ELSE 'agent' END::public.member_role,
      'active',
      NEW.id,
      1
    )
    ON CONFLICT (email) DO UPDATE
      SET user_id = EXCLUDED.user_id
      WHERE public.team_members.user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Trigger: qualquer mudança em team_members.role (INSERT ou UPDATE) para
--    uma linha com user_id propaga para user_roles.role — single source of
--    truth para a UI (team_members), propagação automática para o
--    enforcement (user_roles).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_team_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    DELETE FROM public.user_roles
      WHERE user_id = NEW.user_id
        AND role IS DISTINCT FROM NEW.role::text::public.app_role;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, NEW.role::text::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS team_members_sync_role ON public.team_members;
CREATE TRIGGER team_members_sync_role
  AFTER INSERT OR UPDATE OF role, user_id ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_team_member_role();

-- ---------------------------------------------------------------------------
-- 3. team_members RLS: substitui a policy única "admin faz tudo" por
--    policies separadas por comando, com uma faixa extra para gestor restrita
--    a linhas cujo role (atual, e no caso de UPDATE também o novo valor) seja
--    'agent' ou 'manager' — nunca 'admin'.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can modify team_members" ON public.team_members;

CREATE POLICY "Admins can insert team_members" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can insert agent or manager team_members" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND role IN ('agent', 'manager'));

CREATE POLICY "Admins can update team_members" ON public.team_members
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can update agent or manager team_members" ON public.team_members
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role) AND role IN ('agent', 'manager'))
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND role IN ('agent', 'manager'));

CREATE POLICY "Admins can delete team_members" ON public.team_members
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can delete agent or manager team_members" ON public.team_members
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role) AND role IN ('agent', 'manager'));
