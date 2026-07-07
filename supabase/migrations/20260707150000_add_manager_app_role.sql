-- RBAC de 3 papéis (Etapa 1/2): alinha o vocabulário do enum de enforcement
-- (app_role, usado por has_role()/RLS) com o enum já usado como rótulo em
-- team_members.role (member_role: admin/manager/agent). 'user' passa a se
-- chamar 'agent' (mesmo valor, só o nome muda — já era assim que
-- handle_new_user() tratava "não-admin" na prática) e ganha o valor 'manager'.
--
-- Em migration separada da Etapa 2 (RLS/trigger) porque um valor de enum
-- recém-adicionado via ADD VALUE não pode ser referenciado na mesma
-- transação em que foi criado.

ALTER TYPE public.app_role RENAME VALUE 'user' TO 'agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
