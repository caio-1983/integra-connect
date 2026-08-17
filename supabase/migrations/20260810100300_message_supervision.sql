-- Per-operator message attribution + response-time stats.
--
-- Answers "nao possui controle de mensagens", which the team clarified means
-- SUPERVISION AND QUALITY (not volume or cost): the manager cannot see what each
-- attendant replied, how long they took, or which conversations were left
-- hanging.
--
-- The gap is that `messages.from_type` only distinguishes user / nina / human —
-- so with five attendants on the same inbox, every human reply is anonymous.
--
-- Trust boundary, stated explicitly: the backend gateway authenticates with a
-- single shared bearer token (backend/src/middleware/auth.ts) and has no
-- per-user identity, so `sent_by` arrives as a self-asserted `operatorId` on the
-- reply request. It is sound for ATTRIBUTION and REPORTING and must never be
-- used for authorization. This grants no privilege the endpoint didn't already
-- have.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Partial: only human replies ever carry an operator, and this is exactly the
-- set the per-attendant report scans.
CREATE INDEX IF NOT EXISTS idx_messages_sent_by ON public.messages(sent_by, sent_at)
  WHERE sent_by IS NOT NULL;

COMMENT ON COLUMN public.messages.sent_by IS
  'Operador que digitou esta mensagem (apenas from_type = human). Auto-declarado pelo frontend via operatorId — serve para atribuicao e relatorio, nunca para autorizacao.';

-- `assigned_at` lets supervision show how long a conversation has been sitting
-- with its current attendant. A full transfer history (who moved it from whom)
-- is deliberately out of scope — assigned_at plus messages.sent_by already
-- answer the supervision and SLA questions without another table.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Existing assignments predate the column; the conversation's own start is the
-- closest honest approximation, and NULL would read as "never assigned".
UPDATE public.conversations
   SET assigned_at = started_at
 WHERE assigned_user_id IS NOT NULL AND assigned_at IS NULL;

-- ---------------------------------------------------------------------------
-- Fix: assigned_user_id holds the wrong kind of id
-- ---------------------------------------------------------------------------

-- `api.assignConversation` writes the same value to `conversations.assigned_user_id`
-- and to `deals.owner_id`, but those are different id spaces:
-- `deals.owner_id` references team_members(id), while assigned_user_id is named
-- for an auth.users id and is what the transfer-eligibility filter in
-- ChatInterface compares against `team_members.user_id`. The column has no
-- foreign key, so it has been silently storing team_members.id — harmless only
-- because nothing read it yet. The attendant chip and the "my conversations"
-- filter both read it now, so it has to be right.
--
-- Translate any value that is actually a team_members.id into that member's
-- auth user id; null out anything that resolves to neither, since such a value
-- identifies nobody.
UPDATE public.conversations c
   SET assigned_user_id = tm.user_id
  FROM public.team_members tm
 WHERE c.assigned_user_id = tm.id
   AND tm.user_id IS NOT NULL;

UPDATE public.conversations c
   SET assigned_user_id = NULL, assigned_at = NULL
 WHERE c.assigned_user_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.assigned_user_id);

-- With the data now consistent, let the database enforce it.
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_assigned_user_id_fkey
  FOREIGN KEY (assigned_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_assigned_user ON public.conversations(assigned_user_id)
  WHERE assigned_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- conversation_response_stats
-- ---------------------------------------------------------------------------

-- Computed in SQL rather than by scanning `messages` in the browser: the client
-- only ever loads the last 100 messages per conversation, so any client-side SLA
-- number would be quietly wrong on long threads.
--
-- `security_invoker` matters for more than tidiness here: it makes the view obey
-- the instance-based `can_access_conversation` RLS, so an attendant without a
-- grant on a WhatsApp number cannot read that number's response stats either.
CREATE VIEW public.conversation_response_stats
WITH (security_invoker = true) AS
WITH first_inbound AS (
  SELECT conversation_id, MIN(sent_at) AS at
  FROM public.messages
  WHERE from_type = 'user'
  GROUP BY conversation_id
),
first_human AS (
  SELECT m.conversation_id, MIN(m.sent_at) AS at
  FROM public.messages m
  JOIN first_inbound fi ON fi.conversation_id = m.conversation_id
  WHERE m.from_type = 'human' AND m.sent_at >= fi.at
  GROUP BY m.conversation_id
),
first_responder AS (
  SELECT DISTINCT ON (m.conversation_id) m.conversation_id, m.sent_by
  FROM public.messages m
  JOIN first_human fh ON fh.conversation_id = m.conversation_id AND fh.at = m.sent_at
  WHERE m.from_type = 'human'
  ORDER BY m.conversation_id, m.id
),
last_msg AS (
  SELECT DISTINCT ON (conversation_id) conversation_id, from_type, sent_at
  FROM public.messages
  ORDER BY conversation_id, sent_at DESC, id DESC
),
counts AS (
  SELECT
    conversation_id,
    COUNT(*) FILTER (WHERE from_type = 'user')  AS inbound_count,
    COUNT(*) FILTER (WHERE from_type = 'human') AS human_count,
    COUNT(*) FILTER (WHERE from_type = 'nina')  AS ai_count
  FROM public.messages
  GROUP BY conversation_id
)
SELECT
  c.id                        AS conversation_id,
  c.contact_id,
  c.channel,
  c.status,
  c.assigned_user_id,
  c.assigned_at,
  c.started_at,
  c.last_message_at,
  fi.at                       AS first_inbound_at,
  fh.at                       AS first_human_response_at,
  fr.sent_by                  AS first_human_responder,
  CASE WHEN fh.at IS NOT NULL AND fi.at IS NOT NULL
       THEN EXTRACT(EPOCH FROM (fh.at - fi.at))::INTEGER
  END                         AS first_response_seconds,
  COALESCE(ct.inbound_count, 0) AS inbound_count,
  COALESCE(ct.human_count, 0)   AS human_count,
  COALESCE(ct.ai_count, 0)      AS ai_count,
  -- The contact spoke last: nobody has answered yet. This is the "conversas sem
  -- resposta" list, and it counts an AI reply as an answer — a human should only
  -- be chased for threads where nothing at all went back.
  (lm.from_type = 'user')     AS awaiting_response,
  CASE WHEN lm.from_type = 'user'
       THEN EXTRACT(EPOCH FROM (now() - lm.sent_at))::INTEGER
  END                         AS awaiting_seconds
FROM public.conversations c
LEFT JOIN first_inbound   fi ON fi.conversation_id = c.id
LEFT JOIN first_human     fh ON fh.conversation_id = c.id
LEFT JOIN first_responder fr ON fr.conversation_id = c.id
LEFT JOIN last_msg        lm ON lm.conversation_id = c.id
LEFT JOIN counts          ct ON ct.conversation_id = c.id;

COMMENT ON VIEW public.conversation_response_stats IS
  'Metricas de resposta por conversa (primeira resposta humana, quem respondeu, sem-resposta e contagens). Respeita a RLS de acesso por numero via security_invoker.';
