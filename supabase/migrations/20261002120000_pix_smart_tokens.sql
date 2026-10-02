-- Smart Pix: links individuais (https://…/pix/{token}) que abrem a página de
-- cópia da chave Pix. Cada linha guarda uma cópia dos dados mostrados no link,
-- para o link mostrar exatamente o que foi enviado.
--
-- O token puro NUNCA é gravado: só o SHA-256 dele, em hex. O token tem 128 bits
-- aleatórios (crypto.randomBytes(16), base64url, 22 caracteres). A recuperação
-- por brute force é impraticável devido à entropia de 128 bits.
--
-- Só o backend (service role) lê e grava. RLS ligada e sem nenhuma policy:
-- atendente logado ou visitante anônimo não acessam a tabela pelo Supabase.
-- O backend grava created_at, expires_at e revoked_at com o mesmo relógio,
-- para as constraints de data não falharem por diferença entre relógios.

CREATE TABLE IF NOT EXISTS public.pix_smart_tokens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash     text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  merchant_name  text NOT NULL CHECK (length(btrim(merchant_name)) > 0),
  -- Como é exibido: "38.230.659/0001-07".
  document       text NOT NULL,
  key_type       text NOT NULL CHECK (key_type IN ('cnpj', 'cpf', 'email', 'phone', 'random')),
  pix_key        text NOT NULL CHECK (length(btrim(pix_key)) > 0),
  expires_at     timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,
  CONSTRAINT pix_smart_tokens_expires_after_created CHECK (expires_at > created_at),
  CONSTRAINT pix_smart_tokens_revoked_after_created CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

ALTER TABLE public.pix_smart_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.pix_smart_tokens FROM anon, authenticated;
