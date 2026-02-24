
-- Industry entities table for publishers, labels, distributors, publishing admins
CREATE TABLE public.industry_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('publisher', 'publishing_admin', 'record_label', 'distributor')),
  is_custom boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'system',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name, entity_type)
);

-- Enable RLS
ALTER TABLE public.industry_entities ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can view entities" ON public.industry_entities
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert new custom entries
CREATE POLICY "Authenticated users can insert entities" ON public.industry_entities
  FOR INSERT TO authenticated WITH CHECK (true);
