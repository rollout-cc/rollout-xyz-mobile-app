
-- Knowledge base table for ROLLY RAG
CREATE TABLE public.rolly_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'passman_11e',
  chapter text,
  page_start integer,
  page_end integer,
  content text NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at timestamptz DEFAULT now()
);

-- Index for full-text search
CREATE INDEX idx_rolly_knowledge_search ON public.rolly_knowledge USING GIN (search_vector);

-- RLS: readable by authenticated users, no insert/update/delete from client
ALTER TABLE public.rolly_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read knowledge"
  ON public.rolly_knowledge
  FOR SELECT
  TO authenticated
  USING (true);
