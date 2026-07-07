-- Usuários criados diretamente no Supabase Auth (ex.: o admin inicial de cada
-- instância, antes de existir o fluxo de convite via create-team-account) só
-- ganham linhas em profiles/user_roles pelo trigger handle_new_user — nunca em
-- team_members. Por isso não aparecem na página Usuários/Equipe.

-- 1. Backfill: cria a linha em team_members para quem já existe e está faltando.
WITH ranked_roles AS (
  SELECT user_id, role,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY (role = 'admin') DESC) AS rn
  FROM public.user_roles
)
INSERT INTO public.team_members (name, email, role, status, user_id, weight)
SELECT
  COALESCE(p.full_name, split_part(u.email, '@', 1)),
  u.email,
  CASE WHEN rr.role = 'admin' THEN 'admin' ELSE 'agent' END::public.member_role,
  'active'::public.member_status,
  u.id,
  1
FROM auth.users u
JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN ranked_roles rr ON rr.user_id = u.id AND rr.rn = 1
WHERE u.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = u.id)
ON CONFLICT (email) DO NOTHING;

-- 2. Daqui pra frente, todo novo usuário do Supabase Auth também ganha uma
-- linha em team_members automaticamente, para que isso não se repita a cada
-- nova instância/cliente.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');

  -- Give first user admin role, others get user role
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'user';
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
$$;
