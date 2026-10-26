-- Endurecimento de segurança (auditoria de 13/10/2026).
--
-- 1. nina_settings volta a ser só de admin (20260522013840 abriu para todo
--    logado, expondo tokens de WhatsApp/ElevenLabs). O front lê só a view
--    nina_settings_public.
-- 2. Gestor não consegue mais rebaixar admin: ninguém além de admin (ou do
--    service_role) muda team_members.user_id/hidden, e INSERT de gestor nasce
--    sem user_id. Antes, apontar uma linha 'agent' para o uid de um admin fazia
--    sync_team_member_role apagar o papel admin dele.
-- 3. Contatos e tudo que pende deles (leads, tarefas, agendamentos, lembretes,
--    atribuição, vendas detectadas) seguem o mesmo controle por número das
--    conversas: só vê quem tem acesso a pelo menos uma conversa do contato.
--    Contato sem conversa nenhuma (criado à mão no CRM) continua visível a
--    todos. Decisão de 13/10: gestor sem acesso a todos os números passa a ver
--    o placar parcial.
-- 4. Escrita em conversations/messages: INSERT de conversa só pelo backend;
--    INSERT de mensagem só como 'human', em conversa acessível e assinada por
--    quem envia; cliente não troca instância/contato de uma conversa nem
--    reescreve mensagens (só marca status/leitura).
-- 5. Respostas rápidas e campanhas: qualquer um cria, só o autor ou
--    admin/gestor edita e apaga (decisão de 13/10, revê 20260926130000 e
--    20261002140000).
-- 6. Filas do pipeline antigo (edge functions removidas) fechadas para o
--    cliente, e funções SECURITY DEFINER sem EXECUTE para anon.

-- ---------------------------------------------------------------------------
-- 1. nina_settings: só admin
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can access all nina_settings" ON public.nina_settings;
DROP POLICY IF EXISTS "Admins can read nina_settings" ON public.nina_settings;
DROP POLICY IF EXISTS "Admins can modify nina_settings" ON public.nina_settings;

CREATE POLICY "Admins can manage nina_settings" ON public.nina_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- 2. team_members: user_id e hidden só mudam por admin ou service_role
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_team_member_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sem usuário final (service_role das edge functions, SQL direto): livre.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NOT NULL OR COALESCE(NEW.hidden, false) THEN
      RAISE EXCEPTION 'Só admin vincula conta ou oculta membro' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.hidden IS DISTINCT FROM OLD.hidden THEN
    RAISE EXCEPTION 'Só admin vincula conta ou oculta membro' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_members_guard_identity ON public.team_members;
CREATE TRIGGER team_members_guard_identity
  BEFORE INSERT OR UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_team_member_identity();

-- ---------------------------------------------------------------------------
-- 3. Contatos e derivados pelo controle por número
-- ---------------------------------------------------------------------------

-- Mesma regra de can_access_conversation (20260926150000), aplicada a qualquer
-- conversa do contato.
CREATE OR REPLACE FUNCTION public.can_access_contact(_contact_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NOT EXISTS (SELECT 1 FROM public.conversations c WHERE c.contact_id = _contact_id)
    OR EXISTS (
      SELECT 1
      FROM public.conversations c
      LEFT JOIN public.whatsapp_private_instances p ON p.instance_name = c.metadata ->> 'instance'
      WHERE c.contact_id = _contact_id
        AND CASE
          WHEN p.instance_name IS NOT NULL THEN p.owner_user_id = _user_id
          ELSE
            public.has_role(_user_id, 'admin'::app_role)
            OR c.metadata ->> 'instance' IS NULL
            OR EXISTS (
              SELECT 1 FROM public.whatsapp_instance_access wia
              WHERE wia.instance_name = c.metadata ->> 'instance' AND wia.user_id = _user_id
            )
        END
    )
$$;

-- contacts
DROP POLICY IF EXISTS "Authenticated users can select contacts" ON public.contacts;
CREATE POLICY "Authenticated users can select contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (public.can_access_contact(id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
CREATE POLICY "Authenticated users can update contacts" ON public.contacts
  FOR UPDATE TO authenticated
  USING (public.can_access_contact(id, auth.uid()))
  WITH CHECK (public.can_access_contact(id, auth.uid()));

-- deals
DROP POLICY IF EXISTS "Authenticated users can select deals" ON public.deals;
CREATE POLICY "Authenticated users can select deals" ON public.deals
  FOR SELECT TO authenticated
  USING (contact_id IS NULL OR public.can_access_contact(contact_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert deals" ON public.deals;
CREATE POLICY "Authenticated users can insert deals" ON public.deals
  FOR INSERT TO authenticated
  WITH CHECK (contact_id IS NULL OR public.can_access_contact(contact_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update deals" ON public.deals;
CREATE POLICY "Authenticated users can update deals" ON public.deals
  FOR UPDATE TO authenticated
  USING (contact_id IS NULL OR public.can_access_contact(contact_id, auth.uid()))
  WITH CHECK (contact_id IS NULL OR public.can_access_contact(contact_id, auth.uid()));

-- deal_activities já filtra por um EXISTS em deals, que agora herda a regra
-- acima (RLS vale dentro da subconsulta da política).

-- deal_sale_detections
DROP POLICY IF EXISTS "Authenticated users can select deal sale detections" ON public.deal_sale_detections;
CREATE POLICY "Authenticated users can select deal sale detections" ON public.deal_sale_detections
  FOR SELECT TO authenticated
  USING (public.can_access_contact(contact_id, auth.uid()));

-- contact_attribution (lead_attribution_resolved é security_invoker e herda)
DROP POLICY IF EXISTS "Authenticated users can select lead attribution" ON public.contact_attribution;
CREATE POLICY "Authenticated users can select lead attribution" ON public.contact_attribution
  FOR SELECT TO authenticated
  USING (public.can_access_contact(contact_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can set lead attribution" ON public.contact_attribution;
CREATE POLICY "Authenticated users can set lead attribution" ON public.contact_attribution
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_contact(contact_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can correct lead attribution" ON public.contact_attribution;
CREATE POLICY "Authenticated users can correct lead attribution" ON public.contact_attribution
  FOR UPDATE TO authenticated
  USING (public.can_access_contact(contact_id, auth.uid()))
  WITH CHECK (public.can_access_contact(contact_id, auth.uid()));

-- tasks (antes FOR ALL para todo logado; DELETE continua permitido)
DROP POLICY IF EXISTS "Authenticated users can access all tasks" ON public.tasks;
CREATE POLICY "Users can access tasks of reachable contacts" ON public.tasks
  FOR ALL TO authenticated
  USING (contact_id IS NULL OR public.can_access_contact(contact_id, auth.uid()))
  WITH CHECK (contact_id IS NULL OR public.can_access_contact(contact_id, auth.uid()));

-- appointments
DROP POLICY IF EXISTS "Authenticated users can select appointments" ON public.appointments;
CREATE POLICY "Authenticated users can select appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (contact_id IS NULL OR public.can_access_contact(contact_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON public.appointments;
CREATE POLICY "Authenticated users can insert appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (contact_id IS NULL OR public.can_access_contact(contact_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;
CREATE POLICY "Authenticated users can update appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (contact_id IS NULL OR public.can_access_contact(contact_id, auth.uid()))
  WITH CHECK (contact_id IS NULL OR public.can_access_contact(contact_id, auth.uid()));

-- appointment_reminders: herda de appointments
DROP POLICY IF EXISTS "Authenticated users can select appointment reminders" ON public.appointment_reminders;
CREATE POLICY "Authenticated users can select appointment reminders" ON public.appointment_reminders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_reminders.appointment_id));

-- ---------------------------------------------------------------------------
-- 4. conversations / messages
-- ---------------------------------------------------------------------------

-- Nenhum código do front cria conversa; o backend usa service_role.
DROP POLICY IF EXISTS "Authenticated users can insert conversations" ON public.conversations;

-- O WITH CHECK do UPDATE chama can_access_conversation(id), que é STABLE e lê
-- a linha antiga; sem esta trava, trocar metadata.instance para null deixava a
-- conversa visível a todos, e trocar contact_id abria o contato de outro número.
CREATE OR REPLACE FUNCTION public.guard_conversation_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
       (NEW.metadata ->> 'instance') IS DISTINCT FROM (OLD.metadata ->> 'instance')
       OR NEW.contact_id IS DISTINCT FROM OLD.contact_id
     ) THEN
    RAISE EXCEPTION 'Instância e contato da conversa não podem ser alterados pelo app' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_guard_scope ON public.conversations;
CREATE TRIGGER conversations_guard_scope
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_conversation_scope();

-- Mensagem pelo cliente: só como atendente, em conversa acessível, assinada
-- por quem envia (o envio real passa pelo backend com service_role).
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
CREATE POLICY "Authenticated users can insert messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_conversation(conversation_id, auth.uid())
    AND from_type = 'human'
    AND (sent_by IS NULL OR sent_by = auth.uid())
  );

-- O app só marca status/leitura; conteúdo, autoria e origem ficam imutáveis
-- para o cliente (forjar "paguei" do cliente alimentava a detecção de vendas).
CREATE OR REPLACE FUNCTION public.guard_message_client_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (to_jsonb(NEW) - 'status' - 'read_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'read_at') THEN
    RAISE EXCEPTION 'O app só pode alterar status e leitura da mensagem' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_guard_client_update ON public.messages;
CREATE TRIGGER messages_guard_client_update
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_message_client_update();

-- ---------------------------------------------------------------------------
-- 5. Respostas rápidas e campanhas: cria aberto, edita só autor ou admin/gestor
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated can insert quick_replies" ON public.quick_replies;
CREATE POLICY "Authenticated can insert quick_replies" ON public.quick_replies
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated can update quick_replies" ON public.quick_replies;
CREATE POLICY "Author or managers can update quick_replies" ON public.quick_replies
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Authenticated can delete quick_replies" ON public.quick_replies;
CREATE POLICY "Author or managers can delete quick_replies" ON public.quick_replies
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

-- Bucket quick-reply-media: o arquivo continua público pela URL (bucket
-- público), mas listar exige login e apagar exige ser o dono ou admin/gestor.
DROP POLICY IF EXISTS "Public read quick-reply-media" ON storage.objects;
CREATE POLICY "Authenticated read quick-reply-media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'quick-reply-media');

DROP POLICY IF EXISTS "Authenticated delete quick-reply-media" ON storage.objects;
CREATE POLICY "Owner or managers delete quick-reply-media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'quick-reply-media'
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  );

ALTER TABLE public.campaigns ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.campaign_mappings ALTER COLUMN created_by SET DEFAULT auth.uid();

-- As políticas "Admins and managers can manage ..." (20260810100100) seguem
-- dando tudo a admin/gestor; as de baixo valem para os demais.
DROP POLICY IF EXISTS "Authenticated users can insert campaigns" ON public.campaigns;
CREATE POLICY "Authenticated users can insert campaigns" ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON public.campaigns;
CREATE POLICY "Authors can update campaigns" ON public.campaigns
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert campaign mappings" ON public.campaign_mappings;
CREATE POLICY "Authenticated users can insert campaign mappings" ON public.campaign_mappings
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update campaign mappings" ON public.campaign_mappings;
CREATE POLICY "Authors can update campaign mappings" ON public.campaign_mappings
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can delete campaign mappings" ON public.campaign_mappings;
CREATE POLICY "Authors can delete campaign mappings" ON public.campaign_mappings
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. Filas legadas e EXECUTE de funções SECURITY DEFINER
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
  f TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['send_queue', 'nina_processing_queue', 'message_grouping_queue', 'message_processing_queue'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated access ' || t, t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;

  FOREACH f IN ARRAY ARRAY[
    'public.claim_message_processing_batch(integer)',
    'public.claim_nina_processing_batch(integer)',
    'public.claim_send_queue_batch(integer)',
    'public.get_or_create_conversation_state(uuid)',
    'public.update_client_memory(uuid, jsonb)',
    'public.update_conversation_state(uuid, text, text, jsonb)'
  ] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated, public', f);
    END IF;
  END LOOP;
END;
$$;

-- Helpers usados nas políticas: só usuários logados (e o backend) chamam.
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_access_conversation(UUID, UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_access_contact(UUID, UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_conversation(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_contact(UUID, UUID) TO authenticated, service_role;
