-- Uma conversa ativa por (contato, número).
--
-- O backend fazia "procura, e se não achar cria" sem nada no banco garantindo
-- unicidade. Duas mensagens do mesmo contato chegando juntas — a do cliente e o
-- eco da saudação automática do WhatsApp Business 1 s depois, ou texto + foto —
-- liam "nenhuma conversa" ao mesmo tempo e cada uma criava a sua. O inbox
-- mostrava o mesmo contato duas vezes (caso Angel, 29/09 22:03).
--
-- 1. Junta as duplicadas que já existem na mais antiga do grupo: move as
--    mensagens e as filas, une as tags, e desativa as demais (sem apagar —
--    DELETE é travado desde 20260707140000).
-- 2. O índice único vem na migração seguinte (20260929120100), que só pode
--    rodar depois do deploy do backend que trata o 23505.

CREATE TEMP TABLE conversation_merge AS
SELECT id AS loser, keeper
FROM (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY contact_id, metadata->>'instance'
           ORDER BY created_at, id
         ) AS keeper
  FROM public.conversations
  WHERE is_active AND metadata->>'instance' IS NOT NULL
) ranked
WHERE id <> keeper;

-- Mensagens: a que já existe na vencedora (mesmo whatsapp_message_id) fica na
-- perdedora, para não violar o índice único (conversation_id, whatsapp_message_id).
UPDATE public.messages m
SET conversation_id = cm.keeper
FROM conversation_merge cm
WHERE m.conversation_id = cm.loser
  AND (
    m.whatsapp_message_id IS NULL
    OR (
      NOT EXISTS (
        SELECT 1 FROM public.messages k
        WHERE k.conversation_id = cm.keeper
          AND k.whatsapp_message_id = m.whatsapp_message_id
      )
      -- e, se mais de uma perdedora tem a mesma mensagem, só uma é movida.
      AND NOT EXISTS (
        SELECT 1 FROM public.messages o
        JOIN conversation_merge ocm ON ocm.loser = o.conversation_id
        WHERE ocm.keeper = cm.keeper
          AND o.whatsapp_message_id = m.whatsapp_message_id
          AND o.id < m.id
      )
    )
  );

UPDATE public.nina_processing_queue q
SET conversation_id = cm.keeper
FROM conversation_merge cm
WHERE q.conversation_id = cm.loser;

UPDATE public.send_queue q
SET conversation_id = cm.keeper
FROM conversation_merge cm
WHERE q.conversation_id = cm.loser;

UPDATE public.conversations k
SET tags = agg.tags,
    last_message_at = GREATEST(k.last_message_at, agg.last_message_at),
    assigned_user_id = COALESCE(k.assigned_user_id, agg.assigned_user_id),
    -- Continua arquivada só se todas as partes estavam arquivadas.
    archived_at = CASE WHEN k.archived_at IS NULL OR agg.any_unarchived THEN NULL ELSE k.archived_at END
FROM (
  SELECT cm.keeper,
         ARRAY(
           SELECT DISTINCT t
           FROM public.conversations c2, unnest(c2.tags) t
           WHERE c2.id = cm.keeper OR c2.id IN (SELECT loser FROM conversation_merge WHERE keeper = cm.keeper)
         ) AS tags,
         max(l.last_message_at) AS last_message_at,
         (array_agg(l.assigned_user_id) FILTER (WHERE l.assigned_user_id IS NOT NULL))[1] AS assigned_user_id,
         bool_or(l.archived_at IS NULL) AS any_unarchived
  FROM conversation_merge cm
  JOIN public.conversations l ON l.id = cm.loser
  GROUP BY cm.keeper
) agg
WHERE k.id = agg.keeper;

UPDATE public.conversations c
SET is_active = false,
    metadata = c.metadata || jsonb_build_object('merged_into', cm.keeper)
FROM conversation_merge cm
WHERE c.id = cm.loser;

DROP TABLE conversation_merge;
