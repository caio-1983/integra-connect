-- Lembretes: véspera e "no dia" que liberam hoje passam a valer.
--
-- Antes, um lembrete cujo momento já tinha passado na criação nascia
-- 'skipped'. Como véspera e "no dia" liberam às 00:00, um agendamento criado
-- hoje para amanhã perdia a véspera, e um criado hoje para hoje perdia o
-- "hoje". O usuário esperava ver os dois (2026-10-01).
--
-- Regra nova, a mesma que a 20261001110000 já usava no preenchimento inicial:
--   day_before / same_day  pulado só se liberou antes de hoje (fuso da operação)
--   custom                 pulado se o horário exato já passou
--
-- Efeito: quem cria o agendamento recebe o aviso no próximo minuto. O
-- despacho continua pulando o que já começou, foi cancelado ou concluído.

CREATE OR REPLACE FUNCTION public.appointment_reminder_initial_status(
  p_kind text, p_remind_at timestamptz, p_tz text
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_kind = 'custom' THEN
      CASE WHEN p_remind_at <= now() THEN 'skipped' ELSE 'pending' END
    ELSE
      CASE WHEN p_remind_at < (date_trunc('day', now() AT TIME ZONE p_tz) AT TIME ZONE p_tz)
           THEN 'skipped' ELSE 'pending' END
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.appointment_reminder_initial_status(text, timestamptz, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.appointment_reminders_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text := public.app_timezone();
BEGIN
  INSERT INTO public.appointment_reminders (appointment_id, kind, remind_at, status)
  SELECT NEW.id, k.kind, x.at, public.appointment_reminder_initial_status(k.kind, x.at, v_tz)
    FROM (VALUES ('day_before'), ('same_day')) AS k(kind)
   CROSS JOIN LATERAL (
     SELECT public.appointment_reminder_at(NEW.date, NEW.time, k.kind, NULL, v_tz) AS at
   ) x
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.appointment_reminders_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text := public.app_timezone();
  v_moved boolean := NEW.date IS DISTINCT FROM OLD.date OR NEW.time IS DISTINCT FROM OLD.time;
BEGIN
  IF v_moved THEN
    UPDATE public.appointment_reminders r
       SET remind_at = x.at,
           status    = public.appointment_reminder_initial_status(r.kind, x.at, v_tz),
           sent_at   = NULL
      FROM (
        SELECT r2.id,
               public.appointment_reminder_at(NEW.date, NEW.time, r2.kind, r2.minutes_before, v_tz) AS at
          FROM public.appointment_reminders r2
         WHERE r2.appointment_id = NEW.id
      ) x
     WHERE r.id = x.id;
  END IF;

  IF v_moved
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('cancelled', 'completed')) THEN
    UPDATE public.notifications
       SET read_at = now()
     WHERE entity_id = NEW.id
       AND type = 'appointment_reminder'
       AND read_at IS NULL;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_appointment_reminders(
  p_appointment_id uuid,
  p_day_before     boolean,
  p_same_day       boolean,
  p_custom_minutes integer[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz      text := public.app_timezone();
  v_app     public.appointments%ROWTYPE;
  v_minutes integer[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_app FROM public.appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(array_agg(DISTINCT m ORDER BY m), '{}')
    INTO v_minutes
    FROM unnest(coalesce(p_custom_minutes, '{}'::integer[])) AS m
   WHERE m BETWEEN 1 AND 43200;

  IF cardinality(v_minutes) > 10 THEN
    RAISE EXCEPTION 'No máximo 10 lembretes personalizados' USING ERRCODE = 'check_violation';
  END IF;

  DELETE FROM public.appointment_reminders r
   WHERE r.appointment_id = p_appointment_id
     AND (   (r.kind = 'day_before' AND NOT coalesce(p_day_before, false))
          OR (r.kind = 'same_day'   AND NOT coalesce(p_same_day, false))
          OR (r.kind = 'custom'     AND NOT (r.minutes_before = ANY (v_minutes))));

  INSERT INTO public.appointment_reminders (appointment_id, kind, minutes_before, remind_at, status)
  SELECT p_appointment_id, k.kind, k.minutes, x.at,
         public.appointment_reminder_initial_status(k.kind, x.at, v_tz)
    FROM (
          SELECT 'day_before'::text AS kind, NULL::integer AS minutes WHERE coalesce(p_day_before, false)
          UNION ALL
          SELECT 'same_day', NULL WHERE coalesce(p_same_day, false)
          UNION ALL
          SELECT 'custom', m FROM unnest(v_minutes) AS m
         ) k
   CROSS JOIN LATERAL (
     SELECT public.appointment_reminder_at(v_app.date, v_app.time, k.kind, k.minutes, v_tz) AS at
   ) x
  ON CONFLICT DO NOTHING;
END;
$$;

-- Recupera o que a regra antiga pulou hoje: véspera ou "no dia" que liberou
-- hoje, de agendamento ainda marcado e que ainda não começou.
UPDATE public.appointment_reminders r
   SET status = 'pending', sent_at = NULL
  FROM public.appointments a
 WHERE a.id = r.appointment_id
   AND r.status = 'skipped'
   AND r.kind IN ('day_before', 'same_day')
   AND public.appointment_reminder_initial_status(r.kind, r.remind_at, public.app_timezone()) = 'pending'
   AND coalesce(a.status, 'scheduled') = 'scheduled'
   AND ((a.date + a.time) AT TIME ZONE public.app_timezone()) > now();
