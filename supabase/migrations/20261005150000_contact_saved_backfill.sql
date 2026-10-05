-- Ponto zero do "Salvar contato": todo contato que já existia conta como salvo
-- (saved_by nulo = marcado pela migração). "Não salvos" passa a listar só quem
-- chegar pelo webhook daqui pra frente. Grupos ficam de fora (não são salvos).
update public.contacts
set saved_at = created_at
where saved_at is null
  and external_id not like '%@g.us';
