-- SupportAI Database Schema
-- Run this once in Supabase SQL Editor to bootstrap the database
-- Includes: pgvector extension, all tables with constraints/indexes, RAG functions, signup trigger

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT businesses_owner_id_unique UNIQUE (owner_id)
);

-- 3. Create bot_configs table (1:1 with businesses)
CREATE TABLE IF NOT EXISTS public.bot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  bot_name TEXT NOT NULL DEFAULT 'Support',
  welcome_message TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
  personality TEXT NOT NULL DEFAULT 'professional and friendly',
  escalation_rules TEXT NOT NULL DEFAULT 'Escalate if customer requests a refund, reports a critical bug, or expresses frustration.',
  suggested_questions JSONB DEFAULT '["How do I get started?", "What payment methods do you accept?"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'md')),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  chunk_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_business_id_idx ON public.documents(business_id);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON public.documents(created_at DESC);

-- 5. Create chunks table (denormalized with business_id for fast tenant filtering)
CREATE TABLE IF NOT EXISTS public.chunks (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chunks_business_id_idx ON public.chunks(business_id);
CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON public.chunks(document_id);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON public.chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 6. Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  escalated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT conversations_session_business_unique UNIQUE (session_id, business_id)
);

CREATE INDEX IF NOT EXISTS conversations_business_id_idx ON public.conversations(business_id);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON public.conversations(created_at DESC);

-- 7. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_business_id_idx ON public.messages(business_id);

-- 8. Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  query TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_business_id_idx ON public.tickets(business_id);
CREATE INDEX IF NOT EXISTS tickets_business_status_idx ON public.tickets(business_id, status);
CREATE INDEX IF NOT EXISTS tickets_created_at_idx ON public.tickets(created_at DESC);

-- 9. Create match_chunks RPC function (cosine similarity search)
CREATE OR REPLACE FUNCTION public.match_chunks(
  p_business_id UUID,
  p_query_embedding VECTOR(768),
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  content TEXT,
  similarity FLOAT
) LANGUAGE SQL STABLE AS $$
  SELECT
    chunks.content,
    1 - (chunks.embedding <=> p_query_embedding) as similarity
  FROM public.chunks
  WHERE chunks.business_id = p_business_id
    AND chunks.embedding IS NOT NULL
  ORDER BY chunks.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- 10. Create signup trigger function (atomic provisioning)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_business_id UUID;
BEGIN
  -- Create business (with NULL name; user sets it in onboarding)
  INSERT INTO public.businesses (owner_id, name)
  VALUES (NEW.id, 'My Business')
  RETURNING id INTO new_business_id;

  -- Create default bot config for this business
  INSERT INTO public.bot_configs (business_id)
  VALUES (new_business_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists (idempotent)
DROP TRIGGER IF NOT EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 11. Enable RLS (optional; this implementation uses API-layer isolation, not RLS)
-- Uncomment these lines for defense-in-depth in production
-- ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.bot_configs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 12. Grant permissions
-- All access goes through server with admin key; users authenticate via Supabase Auth
GRANT ALL ON public.businesses TO authenticated;
GRANT ALL ON public.bot_configs TO authenticated;
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.chunks TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.tickets TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_chunks TO authenticated;

-- Schema version for migrations
COMMENT ON TABLE public.businesses IS 'Tenant root table; one per business signup';
COMMENT ON TABLE public.bot_configs IS 'Bot configuration per business (1:1)';
COMMENT ON TABLE public.documents IS 'Knowledge base documents (PDF, DOCX, TXT, MD)';
COMMENT ON TABLE public.chunks IS 'Parsed document chunks with embeddings (denormalized business_id for fast filtering)';
COMMENT ON TABLE public.conversations IS 'Chat sessions; composite unique (session_id, business_id) prevents cross-tenant leakage';
COMMENT ON TABLE public.messages IS 'Chat history per conversation';
COMMENT ON TABLE public.tickets IS 'Support tickets created on escalation';
COMMENT ON FUNCTION public.match_chunks IS 'Vector similarity search; filters by business_id inside the function for tenant isolation';
