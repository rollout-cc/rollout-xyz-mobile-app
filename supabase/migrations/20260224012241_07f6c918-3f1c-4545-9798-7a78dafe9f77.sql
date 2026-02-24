
-- Add columns to transactions table for the enhanced finance view
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'expense',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id uuid;

-- Finance categories table
CREATE TABLE IF NOT EXISTS public.finance_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK for category_id
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.finance_categories(id) ON DELETE SET NULL;

-- RLS for finance_categories
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view finance categories"
  ON public.finance_categories FOR SELECT
  USING (has_artist_access(artist_id, 'view_access'::permission_level));

CREATE POLICY "Owners/managers can insert finance categories"
  ON public.finance_categories FOR INSERT
  WITH CHECK (is_team_owner_or_manager(get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can update finance categories"
  ON public.finance_categories FOR UPDATE
  USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can delete finance categories"
  ON public.finance_categories FOR DELETE
  USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));
