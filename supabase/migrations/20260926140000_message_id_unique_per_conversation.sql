-- A WhatsApp message id (key.id) is the same on both ends of a chat. When two
-- numbers connected to the platform talk to each other, the sender's echo and
-- the receiver's inbound carry the same id; with a global unique index the
-- second one hit 23505, was treated as a duplicate and silently dropped — the
-- message "never arrived". Dedup only needs to hold within one conversation.
DROP INDEX IF EXISTS public.messages_whatsapp_message_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_whatsapp_message_id_unique
ON public.messages (conversation_id, whatsapp_message_id)
WHERE whatsapp_message_id IS NOT NULL;
