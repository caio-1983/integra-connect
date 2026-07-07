-- Lock down destructive access to core business data (contacts, conversations,
-- messages, deals, deal_activities, conversation_states, appointments):
--   1. RLS policies no longer grant DELETE — only SELECT/INSERT/UPDATE.
--   2. Cascading foreign keys become RESTRICT so deleting a parent row can
--      never silently wipe its children — defense in depth beyond RLS,
--      since service-role connections bypass RLS but not FK constraints.
--   3. DELETE is also revoked at the grant level for authenticated/anon,
--      independent of RLS policy state.
-- Nothing in the current app deletes rows from these tables; this only closes
-- an unused, unnecessarily dangerous capability.

-- ---------------------------------------------------------------------------
-- 1. RLS: split "FOR ALL" into SELECT/INSERT/UPDATE only (drop DELETE)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can access all contacts" ON public.contacts;
CREATE POLICY "Authenticated users can select contacts" ON public.contacts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert contacts" ON public.contacts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update contacts" ON public.contacts FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access all conversations" ON public.conversations;
CREATE POLICY "Authenticated users can select conversations" ON public.conversations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert conversations" ON public.conversations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update conversations" ON public.conversations FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access all messages" ON public.messages;
CREATE POLICY "Authenticated users can select messages" ON public.messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update messages" ON public.messages FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access all deals" ON public.deals;
CREATE POLICY "Authenticated users can select deals" ON public.deals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert deals" ON public.deals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update deals" ON public.deals FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can access all appointments" ON public.appointments;
CREATE POLICY "Authenticated users can select appointments" ON public.appointments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert appointments" ON public.appointments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update appointments" ON public.appointments FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can access states of their conversations" ON public.conversation_states;
CREATE POLICY "Users can select states of their conversations" ON public.conversation_states FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = conversation_states.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can insert states of their conversations" ON public.conversation_states FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = conversation_states.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can update states of their conversations" ON public.conversation_states FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = conversation_states.conversation_id AND conversations.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = conversation_states.conversation_id AND conversations.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can access activities of their deals" ON public.deal_activities;
CREATE POLICY "Users can select activities of their deals" ON public.deal_activities FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_activities.deal_id AND deals.user_id = auth.uid()));
CREATE POLICY "Users can insert activities of their deals" ON public.deal_activities FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_activities.deal_id AND deals.user_id = auth.uid()));
CREATE POLICY "Users can update activities of their deals" ON public.deal_activities FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_activities.deal_id AND deals.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_activities.deal_id AND deals.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. Foreign keys: CASCADE -> RESTRICT (appointments.contact_id already uses
--    the non-destructive SET NULL and is left unchanged).
-- ---------------------------------------------------------------------------

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_contact_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE RESTRICT;

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE RESTRICT;

ALTER TABLE public.conversation_states DROP CONSTRAINT IF EXISTS conversation_states_conversation_id_fkey;
ALTER TABLE public.conversation_states ADD CONSTRAINT conversation_states_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE RESTRICT;

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_contact_id_fkey;
ALTER TABLE public.deals ADD CONSTRAINT deals_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE RESTRICT;

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_user_id_fkey;
ALTER TABLE public.deals ADD CONSTRAINT deals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.deal_activities DROP CONSTRAINT IF EXISTS deal_activities_deal_id_fkey;
ALTER TABLE public.deal_activities ADD CONSTRAINT deal_activities_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE RESTRICT;

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_user_id_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 3. Belt-and-suspenders: revoke DELETE at the grant level too, independent
--    of RLS policy state. service_role is intentionally left untouched
--    (trusted backend-only credential, never exposed to the app/browser).
-- ---------------------------------------------------------------------------

REVOKE DELETE ON public.contacts, public.conversations, public.messages,
  public.conversation_states, public.deals, public.deal_activities,
  public.appointments FROM authenticated, anon;
