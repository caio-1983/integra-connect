-- ============================================================================
-- INTEGRA CONNECT / NINA WHATSAPP CRM — CLONE DE SCHEMA COMPLETO
-- ============================================================================
-- Reconstrução do ESTADO FINAL do schema Supabase original (projeto
-- mlttucjfmqnzbctwysks), derivada da leitura integral das 52 migrations em
-- supabase/migrations/ (ordem cronológica) + conferência contra
-- src/integrations/supabase/types.ts + supabase/functions/*/index.ts.
--
-- Este script é IDEMPOTENTE: pode ser executado mais de uma vez sem erro.
-- Não contém dados de negócio reais — apenas estrutura e seeds estruturais
-- mínimos (ver seção 10) necessários para o funcionamento da aplicação.
--
-- Ordem de execução: 0 reset do schema public, 1 extensões, 2 enums,
-- 3 tabelas, 4 índices, 5 funções, 6 triggers, 7 RLS, 8 views, 9 realtime,
-- 10 seeds estruturais, 11 storage.
-- ============================================================================


-- ============================================================================
-- 0. RESET DO SCHEMA PUBLIC
-- ============================================================================
-- O projeto de destino já tinha um schema próprio e não relacionado (tabelas
-- como whatsapp_instances, evolution_config, assignment_rules, profiles com
-- formato diferente, etc — confirmado não ser necessário pelo usuário). Esse
-- reset remove TUDO em public (tabelas, views, functions, types) e recria o
-- schema vazio com os grants padrão de um projeto Supabase novo, para então
-- reconstruir do zero com o schema da Integra Connect abaixo.
--
-- ATENÇÃO: isto apaga permanentemente qualquer dado/objeto hoje existente no
-- schema public deste projeto. Não afeta auth.users nem storage.buckets.

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO postgres, anon, authenticated, service_role;


-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- fornece gen_random_uuid() (defensivo; Supabase já traz por padrão)

-- pg_cron: habilitada no projeto original (20251126203606) mas nenhuma rotina
-- (cron.schedule) foi encontrada em migrations ou Edge Functions — parece não
-- utilizada na prática. Incluída por fidelidade, mas protegida com bloco
-- try/catch pois alguns projetos Supabase exigem habilitar a extensão pelo
-- Dashboard antes de liberá-la via SQL.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron não pôde ser habilitada automaticamente (ok ignorar se não usada): %', SQLERRM;
END $$;

DO $$
BEGIN
  GRANT USAGE ON SCHEMA cron TO postgres;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Grants de pg_cron ignorados: %', SQLERRM;
END $$;


-- ============================================================================
-- 2. ENUMS / TIPOS CUSTOMIZADOS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.conversation_status AS ENUM ('nina', 'human', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_from AS ENUM ('user', 'nina', 'human');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_status AS ENUM ('sent', 'delivered', 'read', 'failed', 'processing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_type AS ENUM ('text', 'audio', 'image', 'document', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.queue_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.team_assignment AS ENUM ('mateus', 'igor', 'fe', 'vendas', 'suporte');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.appointment_type AS ENUM ('demo', 'meeting', 'support', 'followup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.member_role AS ENUM ('admin', 'manager', 'agent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.member_status AS ENUM ('active', 'invited', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 3. TABELAS (ordem de dependência)
-- ============================================================================

-- 3.1 profiles (1:1 com auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3.2 user_roles (separada de profiles por segurança — evita recursão em RLS)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

-- 3.3 teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT teams_user_name_unique UNIQUE (user_id, name)
);

-- 3.4 team_functions
CREATE TABLE IF NOT EXISTS public.team_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT team_functions_user_name_unique UNIQUE (user_id, name)
);

-- 3.5 team_members
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role public.member_role NOT NULL DEFAULT 'agent',
  status public.member_status NOT NULL DEFAULT 'invited',
  avatar TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  function_id UUID REFERENCES public.team_functions(id) ON DELETE SET NULL,
  weight INTEGER DEFAULT 1,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3.6 contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  whatsapp_id TEXT,
  name TEXT,
  call_name TEXT,
  email TEXT,
  profile_picture_url TEXT,
  is_business BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMPTZ,
  blocked_reason TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  client_memory JSONB DEFAULT '{
      "last_updated": null,
      "lead_profile": {
          "interests": [],
          "lead_stage": "new",
          "objections": [],
          "products_discussed": [],
          "communication_style": "unknown",
          "qualification_score": 0
      },
      "sales_intelligence": {
          "pain_points": [],
          "next_best_action": "qualify",
          "budget_indication": "unknown",
          "decision_timeline": "unknown"
      },
      "interaction_summary": {
          "response_pattern": "unknown",
          "last_contact_reason": "",
          "total_conversations": 0,
          "preferred_contact_time": "unknown"
      },
      "conversation_history": []
  }'::jsonb,
  first_contact_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT contacts_phone_number_unique UNIQUE (phone_number)
);

-- 3.7 conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status public.conversation_status NOT NULL DEFAULT 'nina',
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_team public.team_assignment,
  assigned_user_id UUID,
  tags TEXT[] DEFAULT '{}',
  nina_context JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3.8 messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reply_to_id UUID REFERENCES public.messages(id),
  whatsapp_message_id TEXT,
  type public.message_type NOT NULL DEFAULT 'text',
  from_type public.message_from NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  status public.message_status NOT NULL DEFAULT 'sent',
  processed_by_nina BOOLEAN DEFAULT false,
  nina_response_time INTEGER,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.9 conversation_states
CREATE TABLE IF NOT EXISTS public.conversation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  current_state TEXT NOT NULL DEFAULT 'idle',
  last_action TEXT,
  last_action_at TIMESTAMPTZ,
  scheduling_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.10 message_grouping_queue
CREATE TABLE IF NOT EXISTS public.message_grouping_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_message_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  message_data JSONB NOT NULL,
  contacts_data JSONB,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  process_after TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '20 seconds'),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE
);

-- 3.11 message_processing_queue
CREATE TABLE IF NOT EXISTS public.message_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_message_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  status public.queue_status NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 1,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.12 nina_processing_queue
CREATE TABLE IF NOT EXISTS public.nina_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  context_data JSONB,
  status public.queue_status NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 1,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.13 send_queue
CREATE TABLE IF NOT EXISTS public.send_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  from_type TEXT NOT NULL DEFAULT 'nina',
  content TEXT,
  media_url TEXT,
  metadata JSONB DEFAULT '{}',
  status public.queue_status NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 1,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE
);

-- 3.14 nina_settings
-- Colunas calcom_api_key / openai_api_key / openai_model / openai_assistant_id
-- existiram no schema original mas foram removidas (migration 20251209142229)
-- porque o sistema passou a usar o Lovable AI Gateway. Não incluídas aqui.
CREATE TABLE IF NOT EXISTS public.nina_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  system_prompt_override TEXT,
  test_system_prompt TEXT,
  elevenlabs_api_key TEXT,
  elevenlabs_voice_id TEXT NOT NULL DEFAULT '33B4UnXyTNbgLmdEDh5P',
  elevenlabs_model TEXT DEFAULT 'eleven_turbo_v2_5',
  elevenlabs_stability NUMERIC NOT NULL DEFAULT 0.75,
  elevenlabs_similarity_boost NUMERIC NOT NULL DEFAULT 0.80,
  elevenlabs_style NUMERIC NOT NULL DEFAULT 0.30,
  elevenlabs_speaker_boost BOOLEAN NOT NULL DEFAULT true,
  elevenlabs_speed NUMERIC DEFAULT 1.0,
  whatsapp_access_token TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_verify_token TEXT DEFAULT 'viver-de-ia-nina-webhook',
  auto_response_enabled BOOLEAN NOT NULL DEFAULT true,
  adaptive_response_enabled BOOLEAN NOT NULL DEFAULT true,
  message_breaking_enabled BOOLEAN NOT NULL DEFAULT true,
  response_delay_min INTEGER NOT NULL DEFAULT 1000,
  response_delay_max INTEGER NOT NULL DEFAULT 3000,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  business_hours_start TIME NOT NULL DEFAULT '09:00:00',
  business_hours_end TIME NOT NULL DEFAULT '18:00:00',
  business_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  async_booking_enabled BOOLEAN DEFAULT false,
  route_all_to_receiver_enabled BOOLEAN NOT NULL DEFAULT false,
  test_phone_numbers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_name TEXT DEFAULT NULL,
  sdr_name TEXT DEFAULT NULL,
  ai_model_mode TEXT DEFAULT 'flash' CHECK (ai_model_mode IN ('flash', 'pro', 'pro3', 'adaptive')),
  audio_response_enabled BOOLEAN DEFAULT false,
  ai_scheduling_enabled BOOLEAN DEFAULT true,
  whatsapp_business_account_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT nina_settings_user_id_unique UNIQUE (user_id)
);

-- 3.15 tag_definitions
CREATE TABLE IF NOT EXISTS public.tag_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  category TEXT NOT NULL DEFAULT 'custom',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT tag_definitions_user_key_unique UNIQUE (user_id, key)
);

-- 3.16 pipeline_stages
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'border-slate-500',
  position INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ai_trigger_criteria TEXT DEFAULT NULL,
  is_ai_managed BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON COLUMN public.pipeline_stages.ai_trigger_criteria IS
  'Descrição textual de quando a IA deve mover um deal para este estágio. Ex: "Lead demonstrou interesse claro e pediu demonstração"';
COMMENT ON COLUMN public.pipeline_stages.is_ai_managed IS
  'Se true, a IA pode mover deals automaticamente para este estágio. Se false, apenas movimentação manual.';

-- 3.17 deals
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT,
  value NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'new',
  priority TEXT DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  due_date DATE,
  owner_id UUID REFERENCES public.team_members(id),
  notes TEXT,
  lost_reason TEXT,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3.18 deal_activities
CREATE TABLE IF NOT EXISTS public.deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.team_members(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT deal_activities_type_check CHECK (type IN ('note', 'call', 'email', 'meeting', 'task'))
);

-- 3.19 appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  type public.appointment_type NOT NULL DEFAULT 'meeting',
  attendees TEXT[] DEFAULT '{}',
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  meeting_url TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- REPLICA IDENTITY FULL — necessário para o Realtime enviar o payload
-- completo em UPDATE/DELETE (migrations 20251208220818 e 20251208234214).
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.contacts REPLICA IDENTITY FULL;
ALTER TABLE public.deals REPLICA IDENTITY FULL;
ALTER TABLE public.pipeline_stages REPLICA IDENTITY FULL;


-- ============================================================================
-- 4. ÍNDICES
-- ============================================================================

-- contacts
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON public.contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_id ON public.contacts(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_contacts_is_blocked ON public.contacts(is_blocked);
CREATE INDEX IF NOT EXISTS idx_contacts_last_activity ON public.contacts(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON public.contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts(created_at DESC);

-- conversations
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_is_active ON public.conversations(is_active);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON public.conversations USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id ON public.messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_type ON public.messages(from_type);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS messages_whatsapp_message_id_unique
  ON public.messages (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

-- conversation_states
CREATE INDEX IF NOT EXISTS idx_conversation_states_conversation_id ON public.conversation_states(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_states_current_state ON public.conversation_states(current_state);

-- message_grouping_queue
CREATE INDEX IF NOT EXISTS idx_message_grouping_queue_processed ON public.message_grouping_queue(processed);
CREATE INDEX IF NOT EXISTS idx_message_grouping_queue_phone_number_id ON public.message_grouping_queue(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_message_grouping_queue_created_at ON public.message_grouping_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_message_grouping_ready
  ON public.message_grouping_queue (process_after, processed)
  WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_message_grouping_queue_message_id ON public.message_grouping_queue(message_id);

-- message_processing_queue
CREATE INDEX IF NOT EXISTS idx_message_processing_queue_status ON public.message_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_message_processing_queue_scheduled_for ON public.message_processing_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_message_processing_queue_priority ON public.message_processing_queue(priority DESC);

-- nina_processing_queue
CREATE INDEX IF NOT EXISTS idx_nina_processing_queue_status ON public.nina_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_nina_processing_queue_message_id ON public.nina_processing_queue(message_id);
CREATE INDEX IF NOT EXISTS idx_nina_processing_queue_conversation_id ON public.nina_processing_queue(conversation_id);
CREATE INDEX IF NOT EXISTS idx_nina_processing_queue_scheduled_for ON public.nina_processing_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_nina_processing_queue_priority ON public.nina_processing_queue(priority DESC);

-- send_queue
CREATE INDEX IF NOT EXISTS idx_send_queue_status ON public.send_queue(status);
CREATE INDEX IF NOT EXISTS idx_send_queue_contact_id ON public.send_queue(contact_id);
CREATE INDEX IF NOT EXISTS idx_send_queue_conversation_id ON public.send_queue(conversation_id);
CREATE INDEX IF NOT EXISTS idx_send_queue_scheduled_at ON public.send_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_send_queue_priority ON public.send_queue(priority DESC);

-- nina_settings
CREATE INDEX IF NOT EXISTS idx_nina_settings_is_active ON public.nina_settings(is_active);

-- tag_definitions
CREATE INDEX IF NOT EXISTS idx_tag_definitions_key ON public.tag_definitions(key);
CREATE INDEX IF NOT EXISTS idx_tag_definitions_category ON public.tag_definitions(category);

-- pipeline_stages
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_position ON public.pipeline_stages(position);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_is_active ON public.pipeline_stages(is_active);

-- deal_activities
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON public.deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_created_at ON public.deal_activities(created_at DESC);

-- appointments
CREATE INDEX IF NOT EXISTS idx_appointments_metadata_source
  ON public.appointments USING GIN (metadata jsonb_path_ops);


-- ============================================================================
-- 5. FUNCTIONS / RPCs
-- ============================================================================

-- 5.1 Trigger genérico de updated_at (estado final: sem SECURITY DEFINER,
-- search_path fixo — 20260304184800 + 20260304184807)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5.2 Atualiza last_message_at da conversa e last_activity do contato
-- (estado final: 20260304184800)
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;

  UPDATE public.contacts
  SET last_activity = now(), updated_at = now()
  WHERE id = (SELECT contact_id FROM public.conversations WHERE id = NEW.conversation_id);

  RETURN NEW;
END;
$$;

-- 5.3 Cria deal automaticamente ao inserir um novo contato, respeitando o
-- pipeline do mesmo user_id (ou global) — estado final: 20251209183158,
-- confirmado como a função vigente pelas duas últimas migrations
-- (20260623125537 / 20260623125625, "post_remix_consolidated_fixes").
-- NOTA: existiu uma função intermediária "auto_create_deal_on_contact()"
-- (criada em 20260304184800) que chegou a ser usada por um curto período,
-- mas as migrations finais revertem o trigger para usar esta função —
-- por isso ela foi omitida deste script (objeto órfão, nunca referenciado
-- no estado final).
CREATE OR REPLACE FUNCTION public.create_deal_for_new_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  first_stage_id UUID;
BEGIN
  SELECT id INTO first_stage_id
  FROM public.pipeline_stages
  WHERE is_active = true
    AND (user_id = NEW.user_id OR user_id IS NULL)
  ORDER BY position
  LIMIT 1;

  IF first_stage_id IS NULL THEN
    RAISE NOTICE 'No pipeline stages found, skipping deal creation for contact %', NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.deals (contact_id, title, company, stage, stage_id, priority, user_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.name, NEW.call_name, 'Novo Lead'),
    NULL,
    'new',
    first_stage_id,
    'medium',
    NEW.user_id
  );

  RETURN NEW;
END;
$function$;

-- 5.4 get_or_create_conversation_state (RPC)
CREATE OR REPLACE FUNCTION public.get_or_create_conversation_state(p_conversation_id UUID)
RETURNS public.conversation_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    state_record public.conversation_states;
BEGIN
    SELECT * INTO state_record
    FROM public.conversation_states
    WHERE conversation_id = p_conversation_id;

    IF NOT FOUND THEN
        INSERT INTO public.conversation_states (conversation_id, current_state)
        VALUES (p_conversation_id, 'idle')
        RETURNING * INTO state_record;
    END IF;

    RETURN state_record;
END;
$$;

-- 5.5 update_conversation_state (RPC)
CREATE OR REPLACE FUNCTION public.update_conversation_state(
    p_conversation_id UUID,
    p_new_state TEXT,
    p_action TEXT DEFAULT NULL,
    p_context JSONB DEFAULT NULL
)
RETURNS public.conversation_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    state_record public.conversation_states;
BEGIN
    INSERT INTO public.conversation_states (
        conversation_id, current_state, last_action, last_action_at, scheduling_context
    )
    VALUES (
        p_conversation_id, p_new_state, p_action, now(), COALESCE(p_context, '{}')
    )
    ON CONFLICT (conversation_id)
    DO UPDATE SET
        current_state = EXCLUDED.current_state,
        last_action = EXCLUDED.last_action,
        last_action_at = EXCLUDED.last_action_at,
        scheduling_context = CASE
            WHEN EXCLUDED.scheduling_context = '{}' THEN conversation_states.scheduling_context
            ELSE EXCLUDED.scheduling_context
        END,
        updated_at = now()
    RETURNING * INTO state_record;

    RETURN state_record;
END;
$$;

-- 5.6 update_client_memory (RPC) — mantém search_path vazio original
-- (referências totalmente qualificadas com "public.")
CREATE OR REPLACE FUNCTION public.update_client_memory(p_contact_id UUID, p_new_memory JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.contacts
    SET client_memory = p_new_memory, updated_at = now()
    WHERE id = p_contact_id;
END;
$$;

-- 5.7 claim_nina_processing_batch (RPC)
CREATE OR REPLACE FUNCTION public.claim_nina_processing_batch(p_limit INTEGER DEFAULT 50)
RETURNS SETOF public.nina_processing_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    WITH cte AS (
        SELECT id
        FROM public.nina_processing_queue
        WHERE status = 'pending'
          AND (scheduled_for IS NULL OR scheduled_for <= now())
        ORDER BY priority DESC, scheduled_for ASC NULLS FIRST, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    )
    UPDATE public.nina_processing_queue n
    SET status = 'processing', updated_at = now()
    WHERE n.id IN (SELECT id FROM cte)
    RETURNING n.*;
END;
$$;

-- 5.8 claim_send_queue_batch (RPC)
CREATE OR REPLACE FUNCTION public.claim_send_queue_batch(p_limit INTEGER DEFAULT 10)
RETURNS SETOF public.send_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    WITH cte AS (
        SELECT id
        FROM public.send_queue
        WHERE status = 'pending'
          AND (scheduled_at IS NULL OR scheduled_at <= now())
        ORDER BY priority DESC, scheduled_at ASC NULLS FIRST, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    )
    UPDATE public.send_queue s
    SET status = 'processing', updated_at = now()
    WHERE s.id IN (SELECT id FROM cte)
    RETURNING s.*;
END;
$$;

-- 5.9 claim_message_processing_batch (RPC)
CREATE OR REPLACE FUNCTION public.claim_message_processing_batch(p_limit INTEGER DEFAULT 50)
RETURNS SETOF public.message_processing_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    WITH cte AS (
        SELECT id
        FROM public.message_processing_queue
        WHERE status = 'pending'
          AND (scheduled_for IS NULL OR scheduled_for <= now())
        ORDER BY priority DESC, scheduled_for ASC NULLS FIRST, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    )
    UPDATE public.message_processing_queue m
    SET status = 'processing', updated_at = now()
    WHERE m.id IN (SELECT id FROM cte)
    RETURNING m.*;
END;
$$;

-- 5.10 cleanup_processed_queues (RPC)
CREATE OR REPLACE FUNCTION public.cleanup_processed_queues()
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.message_processing_queue
    WHERE status = 'completed' AND processed_at < now() - interval '24 hours';

    DELETE FROM public.nina_processing_queue
    WHERE status = 'completed' AND processed_at < now() - interval '24 hours';

    DELETE FROM public.send_queue
    WHERE status = 'completed' AND sent_at < now() - interval '24 hours';

    DELETE FROM public.message_processing_queue
    WHERE status = 'failed' AND updated_at < now() - interval '7 days';

    DELETE FROM public.nina_processing_queue
    WHERE status = 'failed' AND updated_at < now() - interval '7 days';

    DELETE FROM public.send_queue
    WHERE status = 'failed' AND updated_at < now() - interval '7 days';
END;
$$;

-- 5.11 cleanup_processed_message_queue (RPC)
CREATE OR REPLACE FUNCTION public.cleanup_processed_message_queue()
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.message_grouping_queue
    WHERE processed = true AND created_at < now() - interval '1 hour';
END;
$$;

-- 5.12 has_role (RPC) — SECURITY DEFINER para evitar recursão de RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5.13 get_auth_user_id (RPC)
CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
$$;

-- 5.14 handle_new_user — cria profile + role ao registrar novo usuário em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');

  -- Primeiro usuário do sistema vira admin; os demais, user comum
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- updated_at genérico
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_functions_updated_at ON public.team_functions;
CREATE TRIGGER update_team_functions_updated_at
  BEFORE UPDATE ON public.team_functions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_members_updated_at ON public.team_members;
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_states_updated_at ON public.conversation_states;
CREATE TRIGGER update_conversation_states_updated_at
  BEFORE UPDATE ON public.conversation_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_processing_queue_updated_at ON public.message_processing_queue;
CREATE TRIGGER update_message_processing_queue_updated_at
  BEFORE UPDATE ON public.message_processing_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_nina_processing_queue_updated_at ON public.nina_processing_queue;
CREATE TRIGGER update_nina_processing_queue_updated_at
  BEFORE UPDATE ON public.nina_processing_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_send_queue_updated_at ON public.send_queue;
CREATE TRIGGER update_send_queue_updated_at
  BEFORE UPDATE ON public.send_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_nina_settings_updated_at ON public.nina_settings;
CREATE TRIGGER update_nina_settings_updated_at
  BEFORE UPDATE ON public.nina_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tag_definitions_updated_at ON public.tag_definitions;
CREATE TRIGGER update_tag_definitions_updated_at
  BEFORE UPDATE ON public.tag_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON public.pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_deals_updated_at ON public.deals;
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_deal_activities_updated_at ON public.deal_activities;
CREATE TRIGGER update_deal_activities_updated_at
  BEFORE UPDATE ON public.deal_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers de negócio
DROP TRIGGER IF EXISTS auto_create_deal_on_contact ON public.contacts;
CREATE TRIGGER auto_create_deal_on_contact
  AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.create_deal_for_new_contact();

DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON public.messages;
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Trigger em auth.users (cria profile + role no signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_grouping_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nina_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nina_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- teams (leitura para autenticados, escrita só admin)
DROP POLICY IF EXISTS "Allow all operations on teams" ON public.teams;
DROP POLICY IF EXISTS "Users can manage own teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated can read teams" ON public.teams;
CREATE POLICY "Authenticated can read teams" ON public.teams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can modify teams" ON public.teams;
CREATE POLICY "Admins can modify teams" ON public.teams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- team_functions
DROP POLICY IF EXISTS "Allow all operations on team_functions" ON public.team_functions;
DROP POLICY IF EXISTS "Users can manage own team_functions" ON public.team_functions;
DROP POLICY IF EXISTS "Authenticated can read team_functions" ON public.team_functions;
CREATE POLICY "Authenticated can read team_functions" ON public.team_functions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can modify team_functions" ON public.team_functions;
CREATE POLICY "Admins can modify team_functions" ON public.team_functions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- team_members
DROP POLICY IF EXISTS "Allow all operations on team_members" ON public.team_members;
DROP POLICY IF EXISTS "Users can manage own team_members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated can read team_members" ON public.team_members;
CREATE POLICY "Authenticated can read team_members" ON public.team_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can modify team_members" ON public.team_members;
CREATE POLICY "Admins can modify team_members" ON public.team_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- contacts (final: aberto para qualquer autenticado)
DROP POLICY IF EXISTS "Allow all operations on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can access all contacts" ON public.contacts;
CREATE POLICY "Authenticated users can access all contacts" ON public.contacts FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- conversations (final: aberto para qualquer autenticado)
DROP POLICY IF EXISTS "Allow all operations on conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can access all conversations" ON public.conversations;
CREATE POLICY "Authenticated users can access all conversations" ON public.conversations FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- messages (final: aberto para qualquer autenticado)
DROP POLICY IF EXISTS "Allow all operations on messages" ON public.messages;
DROP POLICY IF EXISTS "Users can access messages of their conversations" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can access all messages" ON public.messages;
CREATE POLICY "Authenticated users can access all messages" ON public.messages FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- conversation_states (nunca migrado para o modelo "aberto" — continua
-- restrito ao dono da conversa; preservado fielmente do estado real)
DROP POLICY IF EXISTS "Allow all operations on conversation_states" ON public.conversation_states;
DROP POLICY IF EXISTS "Users can access states of their conversations" ON public.conversation_states;
CREATE POLICY "Users can access states of their conversations" ON public.conversation_states FOR ALL
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_states.conversation_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_states.conversation_id AND user_id = auth.uid()));

-- message_grouping_queue / message_processing_queue / nina_processing_queue / send_queue
-- (final: qualquer autenticado, sem escopo por usuário — filas internas)
DROP POLICY IF EXISTS "Allow all operations on message_grouping_queue" ON public.message_grouping_queue;
DROP POLICY IF EXISTS "Authenticated access message_grouping_queue" ON public.message_grouping_queue;
CREATE POLICY "Authenticated access message_grouping_queue" ON public.message_grouping_queue FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on message_processing_queue" ON public.message_processing_queue;
DROP POLICY IF EXISTS "Authenticated access message_processing_queue" ON public.message_processing_queue;
CREATE POLICY "Authenticated access message_processing_queue" ON public.message_processing_queue FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on nina_processing_queue" ON public.nina_processing_queue;
DROP POLICY IF EXISTS "Authenticated access nina_processing_queue" ON public.nina_processing_queue;
CREATE POLICY "Authenticated access nina_processing_queue" ON public.nina_processing_queue FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on send_queue" ON public.send_queue;
DROP POLICY IF EXISTS "Authenticated access send_queue" ON public.send_queue;
CREATE POLICY "Authenticated access send_queue" ON public.send_queue FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- nina_settings (final: 20260522013840 supera a fase "admin-only read + view pública")
DROP POLICY IF EXISTS "Allow all operations on nina_settings" ON public.nina_settings;
DROP POLICY IF EXISTS "Users can manage own nina_settings" ON public.nina_settings;
DROP POLICY IF EXISTS "Authenticated can read nina_settings" ON public.nina_settings;
DROP POLICY IF EXISTS "Admins can modify nina_settings" ON public.nina_settings;
DROP POLICY IF EXISTS "Admins can read nina_settings" ON public.nina_settings;
DROP POLICY IF EXISTS "Authenticated users can access all nina_settings" ON public.nina_settings;
CREATE POLICY "Authenticated users can access all nina_settings" ON public.nina_settings FOR ALL TO authenticated
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- tag_definitions
DROP POLICY IF EXISTS "Allow all operations on tag_definitions" ON public.tag_definitions;
DROP POLICY IF EXISTS "Users can manage own tag_definitions" ON public.tag_definitions;
DROP POLICY IF EXISTS "Authenticated can read tag_definitions" ON public.tag_definitions;
CREATE POLICY "Authenticated can read tag_definitions" ON public.tag_definitions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can modify tag_definitions" ON public.tag_definitions;
CREATE POLICY "Admins can modify tag_definitions" ON public.tag_definitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- pipeline_stages
DROP POLICY IF EXISTS "Allow all operations on pipeline_stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Users can manage own pipeline_stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Authenticated can read pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Authenticated can read pipeline_stages" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can modify pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Admins can modify pipeline_stages" ON public.pipeline_stages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- deals (final: aberto para qualquer autenticado — repetido 4x nas migrations originais)
DROP POLICY IF EXISTS "Allow all operations on deals" ON public.deals;
DROP POLICY IF EXISTS "Users can manage own deals" ON public.deals;
DROP POLICY IF EXISTS "Authenticated users can access all deals" ON public.deals;
CREATE POLICY "Authenticated users can access all deals" ON public.deals FOR ALL TO authenticated
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- deal_activities (nunca migrado para o modelo "aberto" — continua restrito ao dono do deal)
DROP POLICY IF EXISTS "Allow all operations on deal_activities" ON public.deal_activities;
DROP POLICY IF EXISTS "Users can access activities of their deals" ON public.deal_activities;
CREATE POLICY "Users can access activities of their deals" ON public.deal_activities FOR ALL
  USING (EXISTS (SELECT 1 FROM public.deals WHERE id = deal_activities.deal_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.deals WHERE id = deal_activities.deal_id AND user_id = auth.uid()));

-- appointments (final: aberto para qualquer autenticado)
DROP POLICY IF EXISTS "Allow all operations on appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can manage own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can access all appointments" ON public.appointments;
CREATE POLICY "Authenticated users can access all appointments" ON public.appointments FOR ALL TO authenticated
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Revoga EXECUTE de anon/public nas funções sensíveis (endurecimento aplicado
-- em 20260522012528 — mantidas apenas para authenticated/service_role, que
-- recebem EXECUTE implicitamente por serem donas/roles com acesso amplo).
REVOKE EXECUTE ON FUNCTION public.claim_message_processing_batch(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_nina_processing_batch(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_send_queue_batch(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation_state(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_client_memory(uuid, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_conversation_state(uuid, text, text, jsonb) FROM anon, public;


-- ============================================================================
-- 8. VIEWS
-- ============================================================================

-- 8.1 contacts_with_stats — security_invoker=true (respeita RLS do usuário)
CREATE OR REPLACE VIEW public.contacts_with_stats
WITH (security_invoker = true) AS
SELECT
    c.id,
    c.phone_number,
    c.whatsapp_id,
    c.name,
    c.call_name,
    c.email,
    c.profile_picture_url,
    c.is_business,
    c.is_blocked,
    c.blocked_at,
    c.blocked_reason,
    c.tags,
    c.notes,
    c.client_memory,
    c.first_contact_date,
    c.last_activity,
    c.created_at,
    c.updated_at,
    c.user_id,
    COALESCE(msg_stats.total_messages, 0::bigint) AS total_messages,
    COALESCE(msg_stats.nina_messages, 0::bigint) AS nina_messages,
    COALESCE(msg_stats.user_messages, 0::bigint) AS user_messages,
    COALESCE(msg_stats.human_messages, 0::bigint) AS human_messages
FROM public.contacts c
LEFT JOIN (
    SELECT
        conv.contact_id,
        count(m.id) AS total_messages,
        count(CASE WHEN m.from_type = 'nina'::public.message_from THEN 1 ELSE NULL::integer END) AS nina_messages,
        count(CASE WHEN m.from_type = 'user'::public.message_from THEN 1 ELSE NULL::integer END) AS user_messages,
        count(CASE WHEN m.from_type = 'human'::public.message_from THEN 1 ELSE NULL::integer END) AS human_messages
    FROM public.conversations conv
    JOIN public.messages m ON m.conversation_id = conv.id
    GROUP BY conv.contact_id
) msg_stats ON msg_stats.contact_id = c.id;

COMMENT ON VIEW public.contacts_with_stats IS 'View que agrega dados do contato com estatísticas de mensagens. Usa security_invoker=true para respeitar as políticas de RLS.';

-- 8.2 nina_settings_public — subconjunto seguro de nina_settings, exposto a
-- authenticated e anon (ex.: página pública de widget/webchat)
CREATE OR REPLACE VIEW public.nina_settings_public
WITH (security_invoker = true) AS
SELECT id, company_name, sdr_name, is_active, auto_response_enabled,
       timezone, business_hours_start, business_hours_end, business_days
FROM public.nina_settings;

GRANT SELECT ON public.nina_settings_public TO authenticated, anon;


-- ============================================================================
-- 9. REALTIME
-- ============================================================================
-- Conjunto final de tabelas na publicação supabase_realtime, confirmado pelas
-- migrations "post_remix_consolidated_fixes" (as duas últimas do histórico).
-- tag_definitions, nina_settings, profiles, user_roles, deal_activities e as
-- tabelas de fila NUNCA foram adicionadas à publicação — omitidas de propósito.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contacts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'deals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pipeline_stages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_stages;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'teams') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'team_functions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_functions;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'team_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
END $$;


-- ============================================================================
-- 10. SEEDS ESTRUTURAIS
-- ============================================================================
-- As linhas abaixo reproduzem exatamente o bootstrap que a própria aplicação
-- executa em runtime para uma instalação nova (Edge Function
-- supabase/functions/initialize-system/index.ts, disparada para o primeiro
-- usuário que faz login). Como o objetivo aqui é um projeto novo e vazio,
-- inserir esses defaults previamente evita estados intermediários estranhos
-- (ex.: webhooks chegando antes de existir qualquer nina_settings) e poupa
-- o primeiro admin de recriar manualmente pipeline/tags/times.
--
-- Deliberadamente NÃO reproduzido: o texto completo do "system_prompt_override"
-- embutido em initialize-system (prompt de vendas da persona "Nina" da empresa
-- "Viver de IA") e os valores "company_name"/"sdr_name" — são conteúdo de
-- negócio específico do tenant original, não estrutura. A coluna já é
-- nullable e a aplicação preenche/edita isso pela tela de configurações.

-- 10.1 nina_settings — linha única global (user_id NULL), apoiada nos
-- DEFAULTs de coluna já definidos na tabela.
INSERT INTO public.nina_settings (is_active)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.nina_settings);

-- 10.2 pipeline_stages — mesmo conjunto de 6 estágios usado por
-- initialize-system (DEFAULT_PIPELINE_STAGES). Superou a versão "6 estágios
-- + mutações incrementais com UUIDs fixos" encontrada nas migrations
-- orgânicas (20251129024326 + 20251208215915), que gerava posições duplicadas
-- (dois estágios na position=1 e dois na position=2) e dependia de UUIDs que
-- não existirão em um banco novo — ver detalhes no resumo final.
INSERT INTO public.pipeline_stages (title, color, position, is_system, is_ai_managed, is_active, user_id)
SELECT * FROM (VALUES
  ('Novos Leads',      'border-blue-500',   0,   false, false, true, NULL::uuid),
  ('Em Qualificação',  'border-yellow-500', 1,   false, true,  true, NULL::uuid),
  ('Oportunidade',     'border-purple-500', 2,   false, true,  true, NULL::uuid),
  ('Fechamento',       'border-orange-500', 3,   false, false, true, NULL::uuid),
  ('Ganho',            'border-green-500',  100, true,  false, true, NULL::uuid),
  ('Perdido',          'border-red-500',    101, true,  false, true, NULL::uuid)
) AS v(title, color, position, is_system, is_ai_managed, is_active, user_id)
WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_stages);

-- 10.3 tag_definitions — mesmo conjunto usado por initialize-system
-- (DEFAULT_TAG_DEFINITIONS). Superou o conjunto de 13 tags com emoji criado
-- pela migration 20251129025809 (versão mais antiga, sem correspondência 1:1
-- de chaves com a versão atual do app) — ver detalhes no resumo final.
INSERT INTO public.tag_definitions (key, label, color, category, is_active, user_id)
SELECT * FROM (VALUES
  ('hot_lead',       'Lead Quente',      '#ef4444', 'status',       true, NULL::uuid),
  ('warm_lead',      'Lead Morno',       '#f97316', 'status',       true, NULL::uuid),
  ('cold_lead',      'Lead Frio',        '#3b82f6', 'status',       true, NULL::uuid),
  ('qualified',      'Qualificado',      '#22c55e', 'qualification',true, NULL::uuid),
  ('unqualified',    'Não Qualificado',  '#6b7280', 'qualification',true, NULL::uuid),
  ('interested',     'Interessado',      '#8b5cf6', 'interest',     true, NULL::uuid),
  ('follow_up',      'Follow-up',        '#eab308', 'action',       true, NULL::uuid),
  ('demo_requested', 'Demo Solicitada',  '#06b6d4', 'action',       true, NULL::uuid)
) AS v(key, label, color, category, is_active, user_id)
WHERE NOT EXISTS (SELECT 1 FROM public.tag_definitions);

-- 10.4 teams — mesmo conjunto usado por initialize-system (DEFAULT_TEAMS).
-- Superou o conjunto de 3 times (Vendas/Suporte/Marketing) da migration
-- original 20251128213045 — a Edge Function atual só cria 2.
INSERT INTO public.teams (name, description, color, is_active, user_id)
SELECT * FROM (VALUES
  ('Vendas',  'Equipe de vendas',                 '#3b82f6', true, NULL::uuid),
  ('Suporte', 'Equipe de suporte ao cliente',      '#22c55e', true, NULL::uuid)
) AS v(name, description, color, is_active, user_id)
WHERE NOT EXISTS (SELECT 1 FROM public.teams);

-- 10.5 team_functions — mesmo conjunto usado por initialize-system
-- (DEFAULT_TEAM_FUNCTIONS). Superou o conjunto de 5 funções da migration
-- original 20251128213045 — a Edge Function atual só cria 3.
INSERT INTO public.team_functions (name, description, is_active, user_id)
SELECT * FROM (VALUES
  ('SDR',    'Sales Development Representative', true, NULL::uuid),
  ('Closer', 'Responsável por fechar vendas',     true, NULL::uuid),
  ('CS',     'Customer Success',                  true, NULL::uuid)
) AS v(name, description, is_active, user_id)
WHERE NOT EXISTS (SELECT 1 FROM public.team_functions);


-- ============================================================================
-- 11. STORAGE
-- ============================================================================

-- Bucket público para áudios gerados pela Nina (TTS) / áudios recebidos
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-messages', 'audio-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Estado final: a policy pública de SELECT ("Public read access for audio")
-- foi removida em 20260522012528 (endurecimento de segurança) — arquivos
-- continuam acessíveis via URL pública do bucket/CDN, mas não são mais
-- listáveis pela API. Mantém-se apenas a policy de INSERT para service_role.
DROP POLICY IF EXISTS "Public read access for audio" ON storage.objects;

DROP POLICY IF EXISTS "Service role insert for audio" ON storage.objects;
CREATE POLICY "Service role insert for audio" ON storage.objects
FOR INSERT TO service_role WITH CHECK (bucket_id = 'audio-messages');

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
