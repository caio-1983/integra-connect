-- Lu reads a lead's conversation and decides whether the sale closed. Sales
-- close inside the chat and nobody moves the card, so the campaigns scoreboard
-- showed 2 wins out of 325 campaign leads in October 2026.
--
-- One row per deal: the verdict, the literal evidence and the value the model
-- found. `applied_at` is set when the backend script moved the deal to Ganho
-- because of this row — that is the "marcado pela Lu" seal in the scoreboard.
-- Undoing a win is a normal stage move in the Kanban; this row stays as history.
--
-- Written only by the backend (service role). Everyone authenticated reads it.

CREATE TABLE public.deal_sale_detections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID NOT NULL UNIQUE REFERENCES public.deals(id) ON DELETE RESTRICT,
  contact_id    UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  verdict       TEXT NOT NULL CHECK (verdict IN ('sold', 'not_sold', 'unclear')),
  confidence    SMALLINT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  evidence      TEXT,
  value         NUMERIC,
  model         TEXT NOT NULL,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  applied_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_sale_detections_contact ON public.deal_sale_detections(contact_id);

ALTER TABLE public.deal_sale_detections ENABLE ROW LEVEL SECURITY;

-- No INSERT/UPDATE/DELETE policy by design: only the service role writes.
CREATE POLICY "Authenticated users can select deal sale detections" ON public.deal_sale_detections
  FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.deal_sale_detections IS
  'Veredito da Lu (IA) sobre se a venda fechou na conversa. applied_at preenchido = a oportunidade foi movida para Ganho por este registro.';
