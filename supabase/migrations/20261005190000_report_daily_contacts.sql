-- ---------------------------------------------------------------------------
-- People who reached out, per day
-- ---------------------------------------------------------------------------

-- Replaces the browser-side count of `messages` behind the "por dia" chart:
-- supabase-js caps a select at 1000 rows, so the chart stopped a few days into
-- any busy window. Counts distinct contacts with at least one inbound message
-- that day (Brasília calendar), so someone writing to two company numbers
-- counts once and team echoes (`fromMe`) never count.
CREATE OR REPLACE FUNCTION public.report_daily_contacts(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (day DATE, contacts BIGINT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    (m.sent_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS day,
    COUNT(DISTINCT c.contact_id)::BIGINT AS contacts
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.from_type = 'user'
    AND m.sent_at >= p_from
    AND m.sent_at < p_to
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.report_daily_contacts(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
