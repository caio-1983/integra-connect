-- Lead origin attribution + the editable campaign mapping.
--
-- The business question this exists to answer: "we ran three campaigns with the
-- same method over three months, the third one's revenue dropped — WHICH
-- campaign?" Today nothing records where a lead came from, so that question has
-- no answer at all.
--
-- KEY DESIGN DECISION — campaign is resolved on READ, not on write.
-- `contact_attribution` stores only the raw signals that actually arrived (ad
-- id, utm_campaign, ref token, WhatsApp instance). Which campaign those signals
-- belong to is decided by `campaign_mappings`, a table of rules the manager
-- edits, and applied by the `lead_attribution_resolved` view. That is what the
-- team meant by "precisa de um mapeamento": they need to define and FIX the
-- mapping after the fact and have the whole history re-attribute itself.
-- Freezing a campaign_id at inbound time would freeze the mistake too.
--
-- Deliberately absent: any budget/spend column. No CPL, CAC or ROI is in scope
-- (explicit product decision) — analysis is by lead volume, conversion rate and
-- attributed revenue.

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------

CREATE TABLE public.campaigns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  -- Free-form on purpose: 'meta_ads', 'google', 'site', 'offline', 'indicacao'.
  -- Not a channel enum — a single campaign can span WhatsApp and Instagram.
  channel    TEXT,
  started_at DATE,
  ended_at   DATE,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  notes      TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_name_unique UNIQUE (name),
  CONSTRAINT campaigns_period_valid CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- campaign_mappings — the editable rules
-- ---------------------------------------------------------------------------

CREATE TABLE public.campaign_mappings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  match_type  TEXT NOT NULL,
  match_value TEXT NOT NULL,
  -- Highest priority wins when a lead carries several matchable signals (e.g.
  -- both an ad id and a ref token). Ad id is the most specific, so mappings on
  -- it should be given the highest number.
  priority    INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT campaign_mappings_type_valid CHECK (
    match_type IN ('meta_ad_id', 'meta_campaign_name', 'utm_campaign', 'ref_token', 'whatsapp_instance')
  ),
  CONSTRAINT campaign_mappings_value_not_blank CHECK (btrim(match_value) <> ''),
  -- One raw value maps to exactly one campaign, so attribution is never
  -- ambiguous. Comparison is case-insensitive (see the view), so the key is too.
  CONSTRAINT campaign_mappings_unique UNIQUE (match_type, match_value)
);

CREATE INDEX idx_campaign_mappings_campaign ON public.campaign_mappings(campaign_id);
CREATE INDEX idx_campaign_mappings_lookup ON public.campaign_mappings(match_type, lower(match_value));

-- ---------------------------------------------------------------------------
-- contact_attribution — first touch, immutable by construction
-- ---------------------------------------------------------------------------

CREATE TABLE public.contact_attribution (
  -- PK on contact_id is what makes first-touch immutable: the writer uses
  -- INSERT ... ON CONFLICT DO NOTHING, so the first signal wins and no later
  -- message can rewrite where this lead originally came from.
  contact_id     UUID PRIMARY KEY REFERENCES public.contacts(id) ON DELETE CASCADE,
  source_channel TEXT NOT NULL,
  source_kind    TEXT NOT NULL,
  -- Raw signals exactly as they arrived. Keys in use:
  --   ad_id, ad_title, ctwa_clid, meta_campaign_name  (Meta click-to-WhatsApp / referral)
  --   utm_source, utm_medium, utm_campaign, ref, landing_path  (site)
  --   instance  (which WhatsApp number received it)
  source_raw     JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- True when an operator typed the origin instead of it being captured — the
  -- only honest way to attribute organic/referral/offline leads, and it must be
  -- distinguishable from a tracked one in reports.
  set_manually   BOOLEAN NOT NULL DEFAULT false,
  set_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contact_attribution_channel_valid CHECK (
    source_channel IN ('whatsapp', 'instagram', 'facebook', 'telegram', 'webchat', 'manual')
  ),
  CONSTRAINT contact_attribution_kind_valid CHECK (
    source_kind IN ('paid_ad', 'website', 'direct_social', 'organic', 'referral', 'offline', 'unknown')
  )
);

CREATE TRIGGER contact_attribution_updated_at
  BEFORE UPDATE ON public.contact_attribution
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_contact_attribution_kind ON public.contact_attribution(source_kind);
CREATE INDEX idx_contact_attribution_first_seen ON public.contact_attribution(first_seen_at);
-- Expression indexes on the two signals the mapping actually joins on most.
CREATE INDEX idx_contact_attribution_ad_id ON public.contact_attribution((source_raw ->> 'ad_id'));
CREATE INDEX idx_contact_attribution_ref ON public.contact_attribution((source_raw ->> 'ref'));

-- ---------------------------------------------------------------------------
-- lead_attribution_resolved — raw signals + the campaign they map to
-- ---------------------------------------------------------------------------

-- `security_invoker` so the view honours the caller's RLS on the underlying
-- tables instead of running as its owner.
CREATE VIEW public.lead_attribution_resolved
WITH (security_invoker = true) AS
SELECT
  a.contact_id,
  a.source_channel,
  a.source_kind,
  a.source_raw,
  a.set_manually,
  a.first_seen_at,
  m.campaign_id,
  cp.name    AS campaign_name,
  cp.channel AS campaign_channel,
  -- The raw value that WOULD identify a campaign, mapped or not. This is what
  -- feeds the "unmapped values" list on the campaigns admin page — the loop
  -- that lets a manager fix attribution instead of just observing it broken.
  COALESCE(
    a.source_raw ->> 'ad_id',
    a.source_raw ->> 'meta_campaign_name',
    a.source_raw ->> 'utm_campaign',
    a.source_raw ->> 'ref',
    a.source_raw ->> 'instance'
  ) AS raw_campaign_signal
FROM public.contact_attribution a
LEFT JOIN LATERAL (
  SELECT cm.campaign_id
  FROM public.campaign_mappings cm
  JOIN public.campaigns c ON c.id = cm.campaign_id AND c.is_active
  WHERE lower(cm.match_value) = lower(
    CASE cm.match_type
      WHEN 'meta_ad_id'         THEN a.source_raw ->> 'ad_id'
      WHEN 'meta_campaign_name' THEN a.source_raw ->> 'meta_campaign_name'
      WHEN 'utm_campaign'       THEN a.source_raw ->> 'utm_campaign'
      WHEN 'ref_token'          THEN a.source_raw ->> 'ref'
      WHEN 'whatsapp_instance'  THEN a.source_raw ->> 'instance'
    END
  )
  ORDER BY cm.priority DESC, cm.created_at
  LIMIT 1
) m ON true
LEFT JOIN public.campaigns cp ON cp.id = m.campaign_id;

COMMENT ON VIEW public.lead_attribution_resolved IS
  'Atribuicao de origem por contato com a campanha resolvida em tempo de leitura via campaign_mappings. Alterar uma regra de mapeamento reatribui todo o historico imediatamente, sem reprocessamento.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_attribution ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated reads: an attendant seeing "came from the September ad"
-- on the conversation is the point. Only admins/managers define campaigns and
-- mappings, matching how connections and instance labels are already governed.
CREATE POLICY "Authenticated users can select campaigns" ON public.campaigns
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can manage campaigns" ON public.campaigns
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can select campaign mappings" ON public.campaign_mappings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can manage campaign mappings" ON public.campaign_mappings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can select lead attribution" ON public.contact_attribution
  FOR SELECT USING (auth.role() = 'authenticated');

-- Attendants correct the origin of the leads they handle, so INSERT/UPDATE is
-- open to any authenticated user. DELETE is granted to nobody: attribution is a
-- historical record, and removing it would silently rewrite past reports.
-- (The backend writes with the service-role key and bypasses RLS entirely.)
CREATE POLICY "Authenticated users can set lead attribution" ON public.contact_attribution
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can correct lead attribution" ON public.contact_attribution
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Realtime — the campaigns admin page reflects edits live across sessions.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'campaigns') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'campaign_mappings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_mappings;
  END IF;
END $$;
