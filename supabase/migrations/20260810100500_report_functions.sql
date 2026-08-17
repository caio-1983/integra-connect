-- Reporting aggregates, in SQL.
--
-- Why functions and not client-side sums: supabase-js caps a select at 1000 rows
-- by default, so summing deals in the browser would silently under-report revenue
-- the moment the pipeline grows past that. The entire point of this work is to
-- explain a revenue variation, and a number that is quietly wrong is worse than
-- no number at all.
--
-- All functions are SECURITY INVOKER (the default) and therefore honour RLS.
-- That matters for the attendant report: it reads
-- `conversation_response_stats`, which is instance-gated, so a user only ever
-- sees numbers for the WhatsApp numbers they were granted — consistent with the
-- deliberate removal of the admin/manager bypass in 20260717120000.
--
-- Every range is half-open [p_from, p_to) so consecutive periods never
-- double-count a row on the boundary.
--
-- Attribution convention, used identically in every function below:
--   campaign = COALESCE(deals.campaign_id, lead_attribution_resolved.campaign_id)
-- i.e. an explicit per-deal override wins over the contact's first-touch origin.

-- ---------------------------------------------------------------------------
-- Headline KPIs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.report_revenue_kpis(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (revenue NUMERIC, won_count BIGINT, lost_count BIGINT, new_leads BIGINT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(d.value) FILTER (WHERE d.won_at >= p_from AND d.won_at < p_to), 0)::NUMERIC,
    COUNT(*) FILTER (WHERE d.won_at >= p_from AND d.won_at < p_to)::BIGINT,
    COUNT(*) FILTER (WHERE d.lost_at >= p_from AND d.lost_at < p_to)::BIGINT,
    COUNT(*) FILTER (WHERE d.created_at >= p_from AND d.created_at < p_to)::BIGINT
  FROM public.deals d;
$$;

-- ---------------------------------------------------------------------------
-- Revenue by campaign — the answer to "in which campaign did it drop?"
-- ---------------------------------------------------------------------------

-- Leads are counted by `created_at` and revenue by `won_at`, because a lead that
-- arrived in August can close in September. Both are computed in one pass with
-- FILTER so a campaign appears if EITHER happened in the period.
CREATE OR REPLACE FUNCTION public.report_campaign_performance(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (campaign_id UUID, campaign_name TEXT, leads BIGINT, won BIGINT, revenue NUMERIC)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(d.campaign_id, lar.campaign_id) AS campaign_id,
    COALESCE(ov.name, lar.campaign_name, 'Não mapeado') AS campaign_name,
    COUNT(*) FILTER (WHERE d.created_at >= p_from AND d.created_at < p_to)::BIGINT,
    COUNT(*) FILTER (WHERE d.won_at >= p_from AND d.won_at < p_to)::BIGINT,
    COALESCE(SUM(d.value) FILTER (WHERE d.won_at >= p_from AND d.won_at < p_to), 0)::NUMERIC
  FROM public.deals d
  LEFT JOIN public.lead_attribution_resolved lar ON lar.contact_id = d.contact_id
  LEFT JOIN public.campaigns ov ON ov.id = d.campaign_id
  WHERE (d.created_at >= p_from AND d.created_at < p_to)
     OR (d.won_at   >= p_from AND d.won_at   < p_to)
  GROUP BY 1, 2;
$$;

-- ---------------------------------------------------------------------------
-- Lead origin
-- ---------------------------------------------------------------------------

-- Deals whose contact has no attribution row at all are reported as
-- 'unknown'/'unknown' rather than dropped: a report that hides untracked leads
-- would overstate how well tracking is working.
CREATE OR REPLACE FUNCTION public.report_origin_performance(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (
  source_kind TEXT,
  source_channel TEXT,
  set_manually BOOLEAN,
  leads BIGINT,
  won BIGINT,
  revenue NUMERIC
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(lar.source_kind, 'unknown'),
    COALESCE(lar.source_channel, 'unknown'),
    COALESCE(lar.set_manually, false),
    COUNT(*) FILTER (WHERE d.created_at >= p_from AND d.created_at < p_to)::BIGINT,
    COUNT(*) FILTER (WHERE d.won_at >= p_from AND d.won_at < p_to)::BIGINT,
    COALESCE(SUM(d.value) FILTER (WHERE d.won_at >= p_from AND d.won_at < p_to), 0)::NUMERIC
  FROM public.deals d
  LEFT JOIN public.lead_attribution_resolved lar ON lar.contact_id = d.contact_id
  WHERE (d.created_at >= p_from AND d.created_at < p_to)
     OR (d.won_at   >= p_from AND d.won_at   < p_to)
  GROUP BY 1, 2, 3;
$$;

-- ---------------------------------------------------------------------------
-- Losses
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.report_loss_reasons(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (reason_code TEXT, reason_label TEXT, lost_count BIGINT, value_lost NUMERIC)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(d.lost_reason_code, 'nao_informado'),
    -- Losses recorded before the taxonomy existed have no code; naming that
    -- explicitly is more useful than folding them into 'outro'.
    COALESCE(lr.label, 'Não informado'),
    COUNT(*)::BIGINT,
    COALESCE(SUM(d.value), 0)::NUMERIC
  FROM public.deals d
  LEFT JOIN public.loss_reasons lr ON lr.key = d.lost_reason_code
  WHERE d.lost_at >= p_from AND d.lost_at < p_to
  GROUP BY 1, 2
  ORDER BY 3 DESC;
$$;

-- ---------------------------------------------------------------------------
-- Funnel — how far leads get before stalling
-- ---------------------------------------------------------------------------

-- Counts DISTINCT deals that entered each stage in the period, from the
-- transition history. Distinct matters: a deal pushed back and forth between two
-- stages must not inflate either one.
CREATE OR REPLACE FUNCTION public.report_funnel(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (stage_id UUID, stage_title TEXT, stage_position INTEGER, entered BIGINT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    ps.id,
    ps.title,
    ps.position,
    COUNT(DISTINCT h.deal_id)::BIGINT
  FROM public.pipeline_stages ps
  LEFT JOIN public.deal_stage_history h
         ON h.to_stage_id = ps.id
        AND h.changed_at >= p_from
        AND h.changed_at < p_to
  WHERE ps.is_active
  GROUP BY ps.id, ps.title, ps.position
  ORDER BY ps.position;
$$;

-- ---------------------------------------------------------------------------
-- Attendant performance
-- ---------------------------------------------------------------------------

-- Three independent groupings (messages sent, first-response latency,
-- currently-waiting) unioned on the operator id, so an attendant who only did one
-- of the three still appears. FULL OUTER JOIN would need to chain twice; a UNION
-- of ids plus left joins is easier to read and to verify by hand.
CREATE OR REPLACE FUNCTION public.report_attendant_performance(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (
  user_id UUID,
  attendant_name TEXT,
  messages_sent BIGINT,
  conversations_handled BIGINT,
  avg_first_response_seconds NUMERIC,
  awaiting_count BIGINT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH sent AS (
    SELECT m.sent_by AS uid,
           COUNT(*)::BIGINT AS messages_sent,
           COUNT(DISTINCT m.conversation_id)::BIGINT AS conversations_handled
    FROM public.messages m
    WHERE m.sent_by IS NOT NULL
      AND m.from_type = 'human'
      AND m.sent_at >= p_from AND m.sent_at < p_to
    GROUP BY m.sent_by
  ),
  responded AS (
    SELECT s.first_human_responder AS uid,
           AVG(s.first_response_seconds)::NUMERIC AS avg_first_response_seconds
    FROM public.conversation_response_stats s
    WHERE s.first_human_responder IS NOT NULL
      AND s.first_response_seconds IS NOT NULL
      AND s.first_inbound_at >= p_from AND s.first_inbound_at < p_to
    GROUP BY s.first_human_responder
  ),
  -- Deliberately NOT period-filtered: "waiting on a reply" is a live queue
  -- state, and a conversation that has been hanging since before the period is
  -- exactly the one a manager needs to see.
  waiting AS (
    SELECT s.assigned_user_id AS uid, COUNT(*)::BIGINT AS awaiting_count
    FROM public.conversation_response_stats s
    WHERE s.awaiting_response AND s.assigned_user_id IS NOT NULL
    GROUP BY s.assigned_user_id
  ),
  operators AS (
    SELECT uid FROM sent
    UNION SELECT uid FROM responded
    UNION SELECT uid FROM waiting
  )
  SELECT
    o.uid,
    COALESCE(tm.name, 'Atendente removido'),
    COALESCE(sent.messages_sent, 0),
    COALESCE(sent.conversations_handled, 0),
    responded.avg_first_response_seconds,
    COALESCE(waiting.awaiting_count, 0)
  FROM operators o
  LEFT JOIN sent      ON sent.uid = o.uid
  LEFT JOIN responded ON responded.uid = o.uid
  LEFT JOIN waiting   ON waiting.uid = o.uid
  LEFT JOIN public.team_members tm ON tm.user_id = o.uid
  ORDER BY COALESCE(sent.messages_sent, 0) DESC;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.report_revenue_kpis(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_campaign_performance(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_origin_performance(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_loss_reasons(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_funnel(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_attendant_performance(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
