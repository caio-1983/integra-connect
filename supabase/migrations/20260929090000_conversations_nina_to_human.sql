-- Emergency: Lu started replying on her own once a valid OPENAI_API_KEY was set,
-- in every conversation still stored as 'nina' (created before the default
-- became 'human' in 20260926180000). Hand all of them back to the team.
-- The backend also gates auto-reply behind AI_AUTOREPLY=true now.

update public.conversations
set status = 'human'
where status = 'nina';
