-- Lembretes de agendamento (pedido da direção, 2026-10-01).
--
-- Quem criou o agendamento (appointments.user_id, o "Responsável" da Agenda)
-- é lembrado dentro do sistema: sino na sidebar, aviso ao entrar, toast e
-- notificação do Windows enquanto o Integra estiver aberto.
--
--   day_before  véspera: libera às 00:00 do dia anterior e aparece quando a
--               pessoa entra no sistema nesse dia.
--   same_day    no dia: libera às 00:00 do dia do compromisso, mesma regra.
--   custom      X minutos antes do horário, com hora exata. Se a pessoa não
--               estiver no sistema, aparece quando ela entrar.
--
-- Todo agendamento nasce com day_before + same_day (trigger no INSERT), venha
-- da Agenda, do bloco de retorno da conversa ou da Lu. A pessoa desliga os
-- padrões ou acrescenta outros pela RPC set_appointment_reminders.
--
-- Lembrete cujo momento já passou quando o agendamento é criado ou remarcado
-- nasce 'skipped' e nunca dispara (criar hoje para hoje não avisa "hoje").
--
-- O pg_cron chama dispatch_due_appointment_reminders() a cada minuto. Ele
-- transforma lembrete vencido em linha de public.notifications, que o front
-- recebe por realtime. Nada passa pelo backend.
--
-- Escrita em paralelo com 20261001120000_conversation_pins, que foi aplicada
-- antes. Por isso esta entrou com `supabase db push --include-all`. As duas
-- não dependem uma da outra, então a ordem não importa.

-- ---------------------------------------------------------------------------
-- Fuso da operação. date/time dos agendamentos são locais e sem fuso (ver
-- src/lib/localDate.ts). Fuso inválido em nina_settings não pode derrubar o
-- cron, então só vale nome conhecido pelo Postgres.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_timezone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT s.timezone
       FROM public.nina_settings s
      WHERE EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = s.timezone)
      ORDER BY s.created_at
      LIMIT 1),
    'America/Sao_Paulo'
  );
$$;

CREATE OR REPLACE FUNCTION public.appointment_reminder_at(
  p_date date, p_time time, p_kind text, p_minutes integer, p_tz text
)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE p_kind
    WHEN 'day_before' THEN ((p_date - 1)::timestamp) AT TIME ZONE p_tz
    WHEN 'same_day'   THEN (p_date::timestamp) AT TIME ZONE p_tz
    ELSE ((p_date + p_time) AT TIME ZONE p_tz) - make_interval(mins => p_minutes)
  END;
$$;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

-- Lembrete é dado derivado do agendamento, por isso CASCADE (o DELETE de
-- appointments continua travado para o app desde 20260707140000).
CREATE TABLE public.appointment_reminders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('day_before', 'same_day', 'custom')),
  minutes_before INTEGER CHECK (minutes_before BETWEEN 1 AND 43200),
  remind_at      TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped')),
  sent_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT appointment_reminders_minutes_only_custom
    CHECK ((kind = 'custom') = (minutes_before IS NOT NULL))
);

CREATE UNIQUE INDEX appointment_reminders_one_default
  ON public.appointment_reminders (appointment_id, kind) WHERE kind <> 'custom';
CREATE UNIQUE INDEX appointment_reminders_one_custom
  ON public.appointment_reminders (appointment_id, minutes_before) WHERE kind = 'custom';
CREATE INDEX appointment_reminders_due
  ON public.appointment_reminders (remind_at) WHERE status = 'pending';

ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_reminders FROM anon, authenticated;
GRANT SELECT ON public.appointment_reminders TO authenticated;

-- Mesmo alcance de appointments: todo autenticado vê a agenda inteira.
CREATE POLICY "Authenticated users can select appointment reminders"
  ON public.appointment_reminders FOR SELECT
  USING (auth.role() = 'authenticated');

-- Caixa de avisos de cada pessoa. Genérica (type) para servir a outros avisos
-- depois; hoje só existe 'appointment_reminder'.
--   event_at  quando acontece aquilo que o aviso lembra. O front monta o
--             "Hoje às 15:00" / "Amanhã" na hora de mostrar e para de cobrar
--             aviso cujo evento já passou.
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  entity_id  UUID,
  event_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at    TIMESTAMPTZ
);

CREATE INDEX notifications_user_recent ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_entity ON public.notifications (entity_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- Só leitura e "marcar como lida". Quem cria aviso é o despacho (SECURITY DEFINER).
REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

CREATE POLICY "Users can select own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark own notifications as read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Triggers em appointments
-- ---------------------------------------------------------------------------

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
  SELECT NEW.id, k.kind, x.at, CASE WHEN x.at <= now() THEN 'skipped' ELSE 'pending' END
    FROM (VALUES ('day_before'), ('same_day')) AS k(kind)
   CROSS JOIN LATERAL (
     SELECT public.appointment_reminder_at(NEW.date, NEW.time, k.kind, NULL, v_tz) AS at
   ) x
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END;
$$;

CREATE TRIGGER appointment_reminders_on_insert
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointment_reminders_on_insert();

-- Remarcar recalcula tudo: o que ficou no futuro volta a valer (inclusive o
-- que já tinha disparado para a data antiga) e o que ficou no passado é
-- pulado. Remarcar, cancelar ou concluir aposenta os avisos ainda não lidos,
-- que falavam de um compromisso que não é mais aquele.
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
           status    = CASE WHEN x.at <= now() THEN 'skipped' ELSE 'pending' END,
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

CREATE TRIGGER appointment_reminders_on_update
  AFTER UPDATE OF date, time, status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointment_reminders_on_update();

-- ---------------------------------------------------------------------------
-- RPC do formulário: substitui o conjunto de lembretes do agendamento.
-- Mantém as linhas que continuam pedidas (um lembrete já enviado não é
-- reenviado só porque o formulário foi salvo de novo).
-- ---------------------------------------------------------------------------
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
         CASE WHEN x.at <= now() THEN 'skipped' ELSE 'pending' END
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

-- ---------------------------------------------------------------------------
-- Despacho (pg_cron, a cada minuto)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dispatch_due_appointment_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz   text := public.app_timezone();
  v_sent integer;
BEGIN
  -- Vencido que não serve mais (cancelado, concluído, sem dono ou já começou)
  -- é fechado sem avisar. Reabrir o agendamento depois não ressuscita aviso velho.
  UPDATE public.appointment_reminders r
     SET status = 'skipped'
    FROM public.appointments a
   WHERE a.id = r.appointment_id
     AND r.status = 'pending'
     AND r.remind_at <= now()
     AND (   coalesce(a.status, 'scheduled') <> 'scheduled'
          OR a.user_id IS NULL
          OR ((a.date + a.time) AT TIME ZONE v_tz) <= now());

  -- O resto vira aviso numa instrução só: a linha muda para 'sent' e o aviso
  -- nasce juntos, então dois despachos simultâneos nunca avisam duas vezes.
  WITH due AS (
    UPDATE public.appointment_reminders r
       SET status = 'sent', sent_at = now()
      FROM public.appointments a
     WHERE a.id = r.appointment_id
       AND r.status = 'pending'
       AND r.remind_at <= now()
       AND coalesce(a.status, 'scheduled') = 'scheduled'
       AND a.user_id IS NOT NULL
       AND ((a.date + a.time) AT TIME ZONE v_tz) > now()
    RETURNING a.id AS appointment_id, a.user_id, a.title, a.contact_id,
              ((a.date + a.time) AT TIME ZONE v_tz) AS starts_at
  )
  INSERT INTO public.notifications (user_id, type, title, body, link, entity_id, event_at)
  SELECT d.user_id,
         'appointment_reminder',
         d.title,
         nullif(trim(coalesce(nullif(trim(c.name), ''), c.phone_number, '')), ''),
         '/scheduling?appointment=' || d.appointment_id,
         d.appointment_id,
         d.starts_at
    FROM due d
    LEFT JOIN public.contacts c ON c.id = d.contact_id;

  GET DIAGNOSTICS v_sent = ROW_COUNT;
  RETURN v_sent;
END;
$$;

-- Funções internas não ficam expostas pela API; só a RPC do formulário.
REVOKE EXECUTE ON FUNCTION public.app_timezone() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.appointment_reminder_at(date, time, text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.appointment_reminders_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.appointment_reminders_on_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dispatch_due_appointment_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_appointment_reminders(uuid, boolean, boolean, integer[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_appointment_reminders(uuid, boolean, boolean, integer[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Agendamentos que já existem e ainda estão por vir ganham os padrões.
-- Aqui ninguém acabou de criar nada, então o que libera hoje (o "hoje" dos
-- compromissos de hoje e a véspera dos de amanhã) vale e aparece no próximo
-- acesso. Só o que liberou antes de hoje é pulado.
-- ---------------------------------------------------------------------------
INSERT INTO public.appointment_reminders (appointment_id, kind, remind_at, status)
SELECT a.id, k.kind, x.at,
       CASE WHEN x.at < (date_trunc('day', now() AT TIME ZONE public.app_timezone()) AT TIME ZONE public.app_timezone())
            THEN 'skipped' ELSE 'pending' END
  FROM public.appointments a
 CROSS JOIN (VALUES ('day_before'), ('same_day')) AS k(kind)
 CROSS JOIN LATERAL (
   SELECT public.appointment_reminder_at(a.date, a.time, k.kind, NULL, public.app_timezone()) AS at
 ) x
 WHERE coalesce(a.status, 'scheduled') = 'scheduled'
   AND ((a.date + a.time) AT TIME ZONE public.app_timezone()) > now()
ON CONFLICT DO NOTHING;

-- cron.schedule com um nome que já existe atualiza o job (pg_cron >= 1.3).
SELECT cron.schedule(
  'appointment-reminders',
  '* * * * *',
  $$SELECT public.dispatch_due_appointment_reminders()$$
);
