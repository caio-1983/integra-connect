-- Raio-x dos atendentes (Resultados › Atendimento).
--
-- One row per attendant with what management asked to see side by side:
-- sales and revenue (the base for commission, which is calculated outside the
-- system for now), conversion of the contacts they received, losses and why,
-- which ads their sales came from, and response speed.
--
-- Who a deal belongs to: its owner (deals.owner_id). A deal without an owner
-- goes to the responsible of the WhatsApp number its first conversation came
-- in on (whatsapp_instance_responsibles) — each attendant works one number.
-- Whatever is left is the "Sem responsável" row (member_id NULL), so nothing
-- disappears from the totals.
--
-- Only managers and admins ("gerência e diretoria") may run it. SECURITY
-- DEFINER on purpose: it compares every attendant, so it must not depend on
-- per-number grants, and it refuses anyone else before reading anything.
--
-- Periods are half-open [p_from, p_to), like every report function.
--   leads       deals created in the period (contacts received)
--   leads_won   of those, how many are already won (conversion, cohort)
--   won_count   deals won in the period (by won_at) — the sales count
--   revenue     value of those sales — the commission base
--   lost_count  deals lost in the period
--   open_now    open deals right now, whatever their age
--   via_number  of `leads`, how many were assigned through the number

CREATE OR REPLACE FUNCTION public.report_attendant_xray(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (
  member_id UUID,
  attendant_name TEXT,
  leads BIGINT,
  leads_won BIGINT,
  won_count BIGINT,
  revenue NUMERIC,
  lost_count BIGINT,
  open_now BIGINT,
  via_number BIGINT,
  loss_reasons JSONB,
  sales_by_ad JSONB,
  messages_sent BIGINT,
  avg_first_response_seconds NUMERIC,
  awaiting_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_manager_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente gerência e diretoria veem o raio-x dos atendentes'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH owned AS (
    SELECT d.contact_id, d.value, d.created_at, d.won_at, d.lost_at, d.lost_reason_code,
           COALESCE(d.owner_id, resp_tm.id) AS member,
           (d.owner_id IS NULL AND resp_tm.id IS NOT NULL) AS by_number
    FROM public.deals d
    LEFT JOIN LATERAL (
      SELECT c.metadata ->> 'instance' AS inst
      FROM public.conversations c
      WHERE d.owner_id IS NULL AND c.contact_id = d.contact_id
      ORDER BY c.created_at
      LIMIT 1
    ) conv ON true
    LEFT JOIN public.whatsapp_instance_responsibles r ON r.instance_name = conv.inst
    LEFT JOIN public.team_members resp_tm ON resp_tm.user_id = r.user_id
  ),
  deal_stats AS (
    SELECT o.member,
      COUNT(*) FILTER (WHERE o.created_at >= p_from AND o.created_at < p_to) AS leads,
      COUNT(*) FILTER (WHERE o.created_at >= p_from AND o.created_at < p_to AND o.won_at IS NOT NULL) AS leads_won,
      COUNT(*) FILTER (WHERE o.won_at >= p_from AND o.won_at < p_to) AS won_count,
      COALESCE(SUM(o.value) FILTER (WHERE o.won_at >= p_from AND o.won_at < p_to), 0) AS revenue,
      COUNT(*) FILTER (WHERE o.lost_at >= p_from AND o.lost_at < p_to) AS lost_count,
      COUNT(*) FILTER (WHERE o.won_at IS NULL AND o.lost_at IS NULL) AS open_now,
      COUNT(*) FILTER (WHERE o.by_number AND o.created_at >= p_from AND o.created_at < p_to) AS via_number
    FROM owned o
    GROUP BY o.member
  ),
  loss AS (
    SELECT x.member, jsonb_agg(jsonb_build_object('label', x.label, 'count', x.n) ORDER BY x.n DESC) AS reasons
    FROM (
      SELECT o.member, COALESCE(lr.label, 'Não informado') AS label, COUNT(*) AS n
      FROM owned o
      LEFT JOIN public.loss_reasons lr ON lr.key = o.lost_reason_code
      WHERE o.lost_at >= p_from AND o.lost_at < p_to
      GROUP BY 1, 2
    ) x
    GROUP BY x.member
  ),
  ads AS (
    -- `ad` NULL = the sale came without a Meta ad.
    SELECT x.member, jsonb_agg(jsonb_build_object('ad', x.ad, 'count', x.n, 'revenue', x.v) ORDER BY x.v DESC, x.n DESC) AS by_ad
    FROM (
      SELECT o.member,
             CASE WHEN lar.source_raw ->> 'ad_id' IS NOT NULL
                  THEN COALESCE(lar.catalog_ad_name, 'Anúncio sem nome') END AS ad,
             COUNT(*) AS n,
             COALESCE(SUM(o.value), 0) AS v
      FROM owned o
      LEFT JOIN public.lead_attribution_resolved lar ON lar.contact_id = o.contact_id
      WHERE o.won_at >= p_from AND o.won_at < p_to
      GROUP BY 1, 2
    ) x
    GROUP BY x.member
  ),
  sent AS (
    SELECT m.sent_by AS uid, COUNT(*) AS n
    FROM public.messages m
    WHERE m.sent_by IS NOT NULL
      AND m.from_type = 'human'
      AND m.sent_at >= p_from AND m.sent_at < p_to
    GROUP BY m.sent_by
  ),
  responded AS (
    SELECT s.first_human_responder AS uid, AVG(s.first_response_seconds) AS secs
    FROM public.conversation_response_stats s
    WHERE s.first_human_responder IS NOT NULL
      AND s.first_response_seconds IS NOT NULL
      AND s.first_inbound_at >= p_from AND s.first_inbound_at < p_to
    GROUP BY s.first_human_responder
  ),
  -- Live queue, not period-filtered: a thread hanging since before the period
  -- is exactly the one to chase.
  waiting AS (
    SELECT s.assigned_user_id AS uid, COUNT(*) AS n
    FROM public.conversation_response_stats s
    WHERE s.awaiting_response AND s.assigned_user_id IS NOT NULL
    GROUP BY s.assigned_user_id
  ),
  people AS (
    SELECT tm.id AS member FROM public.team_members tm
    WHERE NOT tm.hidden AND tm.status <> 'disabled'
    UNION
    SELECT ds.member FROM deal_stats ds
    WHERE ds.leads > 0 OR ds.won_count > 0 OR ds.lost_count > 0
  )
  SELECT
    p.member,
    COALESCE(tm.name, 'Sem responsável')::TEXT,
    COALESCE(ds.leads, 0)::BIGINT,
    COALESCE(ds.leads_won, 0)::BIGINT,
    COALESCE(ds.won_count, 0)::BIGINT,
    COALESCE(ds.revenue, 0)::NUMERIC,
    COALESCE(ds.lost_count, 0)::BIGINT,
    COALESCE(ds.open_now, 0)::BIGINT,
    COALESCE(ds.via_number, 0)::BIGINT,
    COALESCE(l.reasons, '[]'::JSONB),
    COALESCE(a.by_ad, '[]'::JSONB),
    COALESCE(se.n, 0)::BIGINT,
    rp.secs::NUMERIC,
    COALESCE(w.n, 0)::BIGINT
  FROM people p
  LEFT JOIN public.team_members tm ON tm.id = p.member
  LEFT JOIN deal_stats ds ON ds.member IS NOT DISTINCT FROM p.member
  LEFT JOIN loss l        ON l.member IS NOT DISTINCT FROM p.member
  LEFT JOIN ads a         ON a.member IS NOT DISTINCT FROM p.member
  LEFT JOIN sent se       ON se.uid = tm.user_id
  LEFT JOIN responded rp  ON rp.uid = tm.user_id
  LEFT JOIN waiting w     ON w.uid = tm.user_id
  -- The hidden maintenance account never shows, even if it owns deals.
  WHERE tm.id IS NULL OR NOT tm.hidden
  ORDER BY 6 DESC, 5 DESC, 3 DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.report_attendant_xray(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_attendant_xray(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
