-- Meta ad catalog: turns the bare ad id a click-to-WhatsApp lead carries into
-- the campaign / ad set / ad names the team actually recognises.
--
-- The ad id arrives on the first message (contact_attribution.source_raw.ad_id)
-- but it is an 18-digit number nobody can read, and the message never says which
-- campaign it belongs to. The backend looks each new id up in the Marketing API
-- (System User token with ads_read, env META_ADS_TOKEN) and caches the names
-- here. Only ids that really reached us are looked up — that also covers ads
-- that were paused or deleted since, which a "list the account's ads" sync would
-- miss.
--
-- The view then exposes the names and lets a `meta_campaign_name` mapping match
-- the catalog's campaign name: one rule per Meta campaign re-attributes every
-- ad in it, past and future, instead of one rule per ad id.

CREATE TABLE public.meta_ad_catalog (
  ad_id         TEXT PRIMARY KEY,
  ad_name       TEXT,
  ad_status     TEXT,
  adset_id      TEXT,
  adset_name    TEXT,
  campaign_id   TEXT,
  campaign_name TEXT,
  ad_account_id TEXT,
  -- Set when Graph could not resolve the id (ad from an account the token cannot
  -- see, or purged). Kept as a row so the lookup is not retried on every message;
  -- the sync script retries these explicitly.
  lookup_error  TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meta_ad_catalog_campaign ON public.meta_ad_catalog(lower(campaign_name));

ALTER TABLE public.meta_ad_catalog ENABLE ROW LEVEL SECURITY;

-- Read-only for the app; only the backend (service role, bypasses RLS) writes.
CREATE POLICY "Authenticated users can select meta ad catalog" ON public.meta_ad_catalog
  FOR SELECT USING (auth.role() = 'authenticated');

-- Same columns, same order as 20260810100100 (CREATE OR REPLACE can only append),
-- plus the catalog names at the end.
CREATE OR REPLACE VIEW public.lead_attribution_resolved
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
  COALESCE(
    a.source_raw ->> 'ad_id',
    a.source_raw ->> 'meta_campaign_name',
    a.source_raw ->> 'utm_campaign',
    a.source_raw ->> 'ref',
    a.source_raw ->> 'instance'
  ) AS raw_campaign_signal,
  cat.ad_name       AS catalog_ad_name,
  cat.adset_name    AS catalog_adset_name,
  cat.campaign_name AS catalog_campaign_name
FROM public.contact_attribution a
LEFT JOIN public.meta_ad_catalog cat ON cat.ad_id = a.source_raw ->> 'ad_id'
LEFT JOIN LATERAL (
  SELECT cm.campaign_id
  FROM public.campaign_mappings cm
  JOIN public.campaigns c ON c.id = cm.campaign_id AND c.is_active
  WHERE lower(cm.match_value) = lower(
    CASE cm.match_type
      WHEN 'meta_ad_id'         THEN a.source_raw ->> 'ad_id'
      -- A typed campaign name (manual origin) wins over the catalog's.
      WHEN 'meta_campaign_name' THEN COALESCE(a.source_raw ->> 'meta_campaign_name', cat.campaign_name)
      WHEN 'utm_campaign'       THEN a.source_raw ->> 'utm_campaign'
      WHEN 'ref_token'          THEN a.source_raw ->> 'ref'
      WHEN 'whatsapp_instance'  THEN a.source_raw ->> 'instance'
    END
  )
  ORDER BY cm.priority DESC, cm.created_at
  LIMIT 1
) m ON true
LEFT JOIN public.campaigns cp ON cp.id = m.campaign_id;
