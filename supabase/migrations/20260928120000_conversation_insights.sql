-- Lu as copilot: one AI "insight" per conversation (suggested reply, what the
-- customer needs, detected fields, next steps), generated when an attendant
-- opens a conversation whose last message is from the customer. Cached by the
-- last message id so every attendant opening it reuses the same model call.
--
-- Only the backend (service role) reads/writes it: RLS on with no policies.

CREATE TABLE IF NOT EXISTS public.conversation_insights (
  conversation_id uuid PRIMARY KEY REFERENCES public.conversations(id) ON DELETE CASCADE,
  last_message_id uuid NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_insights ENABLE ROW LEVEL SECURITY;

-- Fields the attendant confirmed from Lu's suggestion (produto, quantidade,
-- cep, pagamento, necessidade…). Free-form on purpose: the shape follows the
-- sales conversation, not a fixed schema.
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
