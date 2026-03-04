
-- Create sub_budgets table
CREATE TABLE public.sub_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sub_budgets ENABLE ROW LEVEL SECURITY;

-- Helper function to get budget's artist team_id
CREATE OR REPLACE FUNCTION public.get_budget_team_id(p_budget_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_artist_team_id(artist_id) FROM public.budgets WHERE id = p_budget_id
$$;

-- RLS policies for sub_budgets
CREATE POLICY "Team members can view sub_budgets"
  ON public.sub_budgets FOR SELECT TO authenticated
  USING (is_team_member(get_budget_team_id(budget_id)));

CREATE POLICY "Owners/managers can insert sub_budgets"
  ON public.sub_budgets FOR INSERT TO authenticated
  WITH CHECK (is_team_owner_or_manager(get_budget_team_id(budget_id)));

CREATE POLICY "Owners/managers can update sub_budgets"
  ON public.sub_budgets FOR UPDATE TO authenticated
  USING (is_team_owner_or_manager(get_budget_team_id(budget_id)));

CREATE POLICY "Owners/managers can delete sub_budgets"
  ON public.sub_budgets FOR DELETE TO authenticated
  USING (is_team_owner_or_manager(get_budget_team_id(budget_id)));

-- Add sub_budget_id to transactions
ALTER TABLE public.transactions ADD COLUMN sub_budget_id uuid REFERENCES public.sub_budgets(id) ON DELETE SET NULL;
