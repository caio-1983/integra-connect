-- The AI agent isn't live yet: every conversation is handled by a person.
-- New rows default to 'human' (the backend only opens in 'nina' when
-- AI_AUTOSTART=true), and existing AI-mode conversations move to 'human'.

ALTER TABLE public.conversations ALTER COLUMN status SET DEFAULT 'human';

UPDATE public.conversations SET status = 'human' WHERE status = 'nina';
