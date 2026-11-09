-- Scoreboard by ad.
--
-- The Campanhas scoreboard groups leads by the Meta ad they clicked instead of
-- by a hand-made campaign, so nobody has to name and map each new ad. Two facts
-- about the ad come from the Marketing API with its name:
--   * ad_created_at — when the ad was created in Ads Manager (Graph
--     `created_time`). The date typed in the ad name is optional and can be wrong.
--   * ad_status (already stored) — kept fresh by a periodic refresh in the
--     backend, so a paused ad leaves the "No ar" filter by itself.
--
-- The view only APPENDS the two catalog columns (CREATE OR REPLACE VIEW can
-- only append); everything else is 20261019150000 verbatim. Campaigns and their
-- rules stay: no-ad origins (pre-filled phrase, [ref:] link, UTM, number) are
-- still named through them.

ALTER TABLE public.meta_ad_catalog ADD COLUMN IF NOT EXISTS ad_created_at TIMESTAMPTZ;

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
  cat.campaign_name AS catalog_campaign_name,
  cat.ad_status     AS catalog_ad_status,
  cat.ad_created_at AS catalog_ad_created_at
FROM public.contact_attribution a
LEFT JOIN public.meta_ad_catalog cat ON cat.ad_id = a.source_raw ->> 'ad_id'
LEFT JOIN LATERAL (
  SELECT cm.campaign_id
  FROM public.campaign_mappings cm
  JOIN public.campaigns c ON c.id = cm.campaign_id AND c.is_active
  WHERE CASE
    WHEN cm.match_type = 'first_message' THEN
      lower(regexp_replace(btrim(cm.match_value), '\s+', ' ', 'g'))
        = lower(regexp_replace(btrim(a.source_raw ->> 'first_message'), '\s+', ' ', 'g'))
    ELSE lower(cm.match_value) = lower(
      CASE cm.match_type
        WHEN 'meta_ad_id'         THEN a.source_raw ->> 'ad_id'
        -- A typed campaign name (manual origin) wins over the catalog's.
        WHEN 'meta_campaign_name' THEN COALESCE(a.source_raw ->> 'meta_campaign_name', cat.campaign_name)
        WHEN 'utm_campaign'       THEN a.source_raw ->> 'utm_campaign'
        WHEN 'ref_token'          THEN a.source_raw ->> 'ref'
        WHEN 'whatsapp_instance'  THEN a.source_raw ->> 'instance'
      END
    )
  END
  ORDER BY cm.priority DESC, cm.created_at
  LIMIT 1
) m ON true
LEFT JOIN public.campaigns cp ON cp.id = m.campaign_id;
