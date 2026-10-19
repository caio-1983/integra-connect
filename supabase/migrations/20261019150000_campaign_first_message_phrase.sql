-- Campaign by pre-filled first message.
--
-- A lead that reaches WhatsApp without an ad referral (Instagram profile
-- button, Facebook page button, link in bio, site, QR code, flyer) still
-- usually sends the text its link pre-filled. When each source gets its own
-- phrase ("Olá! Vim pelo Instagram e quero um orçamento"), that phrase
-- identifies the campaign.
--
-- The backend stores the first inbound text of a new 1:1 conversation in
-- `contact_attribution.source_raw.first_message` (source_kind 'unknown' when
-- nothing else arrived). A new rule type, `first_message`, maps a phrase to a
-- campaign; like every other rule it is resolved at read time, so a phrase
-- registered today re-attributes the leads that already sent it.
--
-- Comparison ignores case, surrounding whitespace and repeated spaces, and
-- nothing else: a prefilled text arrives verbatim, and a looser match would
-- pin a hand-typed "Olá, quero um orçamento" on whichever campaign used it.

ALTER TABLE public.campaign_mappings DROP CONSTRAINT campaign_mappings_type_valid;
ALTER TABLE public.campaign_mappings ADD CONSTRAINT campaign_mappings_type_valid CHECK (
  match_type IN ('meta_ad_id', 'meta_campaign_name', 'utm_campaign', 'ref_token', 'whatsapp_instance', 'first_message')
);

-- Same columns, same order as 20260929110000 (CREATE OR REPLACE can only
-- append); only the rule matching changes.
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
