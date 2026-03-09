
-- ROLLY tables
CREATE TABLE public.rolly_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.rolly_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.rolly_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.education_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  simple_explanation TEXT NOT NULL,
  detailed_explanation TEXT,
  related_concepts TEXT[],
  example TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.rolly_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rolly_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations" ON public.rolly_conversations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage messages in own conversations" ON public.rolly_messages FOR ALL TO authenticated
  USING (conversation_id IN (SELECT id FROM public.rolly_conversations WHERE user_id = auth.uid()))
  WITH CHECK (conversation_id IN (SELECT id FROM public.rolly_conversations WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can read education content" ON public.education_content FOR SELECT TO authenticated USING (true);

-- Split project approval token
ALTER TABLE public.split_entries ADD COLUMN IF NOT EXISTS project_approval_token TEXT;
