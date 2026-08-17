-- Channel identity on contacts, conversations and messages.
--
-- Until now a contact WAS a phone number: `contacts_phone_number_unique
-- UNIQUE (phone_number)` with `phone_number NOT NULL`. That works while
-- WhatsApp/Evolution is the only real connector, but an Instagram IGSID or a
-- Messenger PSID is not a phone number and has nowhere to land — so every
-- non-WhatsApp channel was structurally blocked at the identity layer.
--
-- This migration re-keys the contact on (channel, external_id):
--   * WhatsApp keeps `phone_number` populated (it is still the routing address
--     Evolution expects), and `external_id` mirrors it.
--   * Meta channels write the PSID/IGSID to `external_id` and leave
--     `phone_number` NULL.
--
-- Contacts are NOT merged across channels: the same person writing on WhatsApp
-- and on Instagram becomes two contacts. Identity unification is its own piece
-- of work and is deliberately out of scope.
--
-- `channel` is also denormalized onto conversations and messages because the
-- frontend transformers currently hardcode 'whatsapp' (src/types/index.ts),
-- which makes per-channel reporting impossible.

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS channel     TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Backfill before the new key goes on: every existing row is a WhatsApp
-- contact whose identity is its phone number.
UPDATE public.contacts
   SET external_id = phone_number
 WHERE external_id IS NULL;

ALTER TABLE public.contacts
  ALTER COLUMN external_id SET NOT NULL;

-- Swap the key. The old constraint was globally unique on phone_number, which
-- would reject two contacts on different channels that happen to share a
-- number, and cannot express "this IGSID is unique within Instagram".
ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_phone_number_unique;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_channel_external_id_unique UNIQUE (channel, external_id);

-- Only WhatsApp is required to carry a phone number from here on.
ALTER TABLE public.contacts
  ALTER COLUMN phone_number DROP NOT NULL;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_whatsapp_requires_phone
  CHECK (channel <> 'whatsapp' OR phone_number IS NOT NULL);

-- Safety net for every writer that predates this migration and still inserts a
-- contact as "just a phone number": the legacy Meta Cloud Edge Functions
-- (whatsapp-webhook, test-whatsapp-message, simulate-webhook,
-- simulate-audio-webhook) and the frontend's CreateDealModal. Without this,
-- `external_id NOT NULL` would reject those inserts outright. For a WhatsApp
-- contact the phone number IS the external id, so deriving it is exact, not a
-- guess. BEFORE INSERT runs ahead of the NOT NULL check, so the row is already
-- complete by the time the constraint is evaluated.
CREATE OR REPLACE FUNCTION public.contacts_default_external_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.external_id IS NULL THEN
    NEW.external_id := NEW.phone_number;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER contacts_default_external_id_trg
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.contacts_default_external_id();

COMMENT ON COLUMN public.contacts.channel IS
  'Canal em que este contato foi identificado: whatsapp | instagram | facebook | telegram | webchat. Um mesmo ser humano em dois canais gera dois contatos (sem unificacao de identidade nesta fase).';
COMMENT ON COLUMN public.contacts.external_id IS
  'Identificador do contato no canal de origem: digitos do telefone (whatsapp), PSID (facebook) ou IGSID (instagram). Chave real do contato junto com channel.';

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS channel  TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS provider TEXT;

-- Evolution is the only connector that has ever written a conversation.
UPDATE public.conversations
   SET provider = 'evolution'
 WHERE provider IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_channel ON public.conversations(channel);

COMMENT ON COLUMN public.conversations.provider IS
  'Conector que atende esta conversa (evolution | meta). Junto com metadata->>''instance'' determina como uma resposta manual e roteada.';

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';

CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(channel);
