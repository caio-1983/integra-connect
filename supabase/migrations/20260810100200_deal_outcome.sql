-- Structured loss reasons, campaign override, and stage-transition history.
--
-- Answers "o que esta deixando de converter?" — which needs two things that do
-- not exist today:
--
-- 1. A loss TAXONOMY. `deals.lost_reason` is free text typed into a textarea, so
--    losses cannot be counted or ranked. The free text stays as the detail;
--    `lost_reason_code` is what reports group by.
--
-- 2. STAGE HISTORY. `moveDealStage`, `markDealWon`, `markDealLost` and the AI
--    mover all do a bare UPDATE, so there is no record of a deal's path. Without
--    it there is no funnel, no conversion-per-stage and no cycle time. This also
--    closes a live data-loss bug: moveDealStage NULLs out `lost_reason` when a
--    lost deal is reopened, destroying the only record of why it was lost.
--    Recording via trigger (not from the client) also captures the AI's moves in
--    supabase/functions/analyze-conversation.
--
-- The approved spec docs/integra-connect/specs/06-comercial.md already requires
-- this ("Mudancas de etapa devem ficar registradas no historico"); it was never
-- implemented.

-- ---------------------------------------------------------------------------
-- loss_reasons — the taxonomy
-- ---------------------------------------------------------------------------

CREATE TABLE public.loss_reasons (
  key        TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.loss_reasons (key, label, position) VALUES
  ('preco',                 'Preço acima do esperado',      10),
  ('sem_resposta',          'Parou de responder',           20),
  ('fora_de_perfil',        'Fora do perfil de cliente',    30),
  ('escolheu_concorrente',  'Escolheu um concorrente',      40),
  ('sem_orcamento',         'Sem orçamento no momento',     50),
  ('timing',               'Momento inadequado',            60),
  ('duplicado',             'Contato duplicado',            70),
  ('outro',                 'Outro motivo',                 99);

-- ---------------------------------------------------------------------------
-- deals — loss code + campaign override
-- ---------------------------------------------------------------------------

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS lost_reason_code TEXT REFERENCES public.loss_reasons(key),
  -- Optional override of the contact's first-touch attribution, for when the
  -- salesperson knows this specific deal came from a different campaign.
  -- Reports read COALESCE(deals.campaign_id, resolved.campaign_id).
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_lost_reason_code ON public.deals(lost_reason_code);
CREATE INDEX IF NOT EXISTS idx_deals_campaign ON public.deals(campaign_id);
-- Revenue reporting always slices on the outcome timestamps, never on the
-- stage title (which getSystemStageIds matches by literal 'ganho'/'perdido').
CREATE INDEX IF NOT EXISTS idx_deals_won_at ON public.deals(won_at) WHERE won_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_lost_at ON public.deals(lost_at) WHERE lost_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- deal_stage_history
-- ---------------------------------------------------------------------------

CREATE TABLE public.deal_stage_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id          UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_stage_id    UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id      UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  -- Snapshotted so a later edit to the deal cannot rewrite what was true at the
  -- moment of the transition.
  value_at_change  NUMERIC,
  lost_reason_code TEXT,
  changed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_stage_history_deal ON public.deal_stage_history(deal_id, changed_at);
CREATE INDEX idx_deal_stage_history_to_stage ON public.deal_stage_history(to_stage_id, changed_at);

-- SECURITY DEFINER is required, not optional: the trigger inserts into a
-- RLS-enabled table that grants INSERT to nobody. Without it, every stage change
-- made by a normal user would fail the policy check and roll back the UPDATE.
CREATE OR REPLACE FUNCTION public.record_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.deal_stage_history (deal_id, from_stage_id, to_stage_id, value_at_change, lost_reason_code, changed_by)
  VALUES (NEW.id, OLD.stage_id, NEW.stage_id, NEW.value, NEW.lost_reason_code, auth.uid());
  RETURN NEW;
END;
$$;

CREATE TRIGGER deals_record_stage_change
  AFTER UPDATE ON public.deals
  FOR EACH ROW
  WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id)
  EXECUTE FUNCTION public.record_deal_stage_change();

-- Seeds the history with each deal's current stage so a deal that never moves
-- again still appears in the funnel. `changed_at` uses the deal's own timestamps
-- rather than now(), so existing deals don't all pile onto the migration date.
INSERT INTO public.deal_stage_history (deal_id, from_stage_id, to_stage_id, value_at_change, lost_reason_code, changed_at)
SELECT d.id, NULL, d.stage_id, d.value, NULL, COALESCE(d.won_at, d.lost_at, d.created_at, now())
FROM public.deals d
WHERE d.stage_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select loss reasons" ON public.loss_reasons
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can manage loss reasons" ON public.loss_reasons
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

-- Read-only to everyone; written exclusively by the trigger above. No INSERT,
-- UPDATE or DELETE policy exists by design — an audit trail nobody can edit.
CREATE POLICY "Authenticated users can select deal stage history" ON public.deal_stage_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Pre-existing bug: activities are unreachable on inbound leads
-- ---------------------------------------------------------------------------

-- `deal_activities` RLS (20260707140000) requires `deals.user_id = auth.uid()`,
-- but a lead created from a first inbound message is written by the backend with
-- `user_id: null` (ConversationRepository.createLeadForContact) — the gateway has
-- no per-user identity to attribute it to. Net effect today: nobody can read or
-- write activities on exactly the leads that matter most, the ones that came in
-- by themselves.
--
-- A system-created lead is unowned, i.e. shared, so the fix is to treat
-- `user_id IS NULL` as visible to any authenticated user rather than to invent a
-- fake owner. This widens nothing that was previously restricted to a person:
-- those rows were reachable by no one at all.
DROP POLICY IF EXISTS "Users can select activities of their deals" ON public.deal_activities;
CREATE POLICY "Users can select activities of their deals" ON public.deal_activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals
    WHERE deals.id = deal_activities.deal_id
      AND (deals.user_id = auth.uid() OR deals.user_id IS NULL)
  ));

DROP POLICY IF EXISTS "Users can insert activities of their deals" ON public.deal_activities;
CREATE POLICY "Users can insert activities of their deals" ON public.deal_activities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deals
    WHERE deals.id = deal_activities.deal_id
      AND (deals.user_id = auth.uid() OR deals.user_id IS NULL)
  ));

DROP POLICY IF EXISTS "Users can update activities of their deals" ON public.deal_activities;
CREATE POLICY "Users can update activities of their deals" ON public.deal_activities FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.deals
    WHERE deals.id = deal_activities.deal_id
      AND (deals.user_id = auth.uid() OR deals.user_id IS NULL)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deals
    WHERE deals.id = deal_activities.deal_id
      AND (deals.user_id = auth.uid() OR deals.user_id IS NULL)
  ));
