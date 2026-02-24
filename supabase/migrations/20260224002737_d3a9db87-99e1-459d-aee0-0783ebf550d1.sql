CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  budget_id uuid REFERENCES public.budgets(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Team members can view transactions for artists they have access to
CREATE POLICY "Team members can view transactions"
  ON public.transactions FOR SELECT
  USING (has_artist_access(artist_id, 'view_access'::permission_level));

-- Owners/managers can insert transactions
CREATE POLICY "Owners/managers can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (is_team_owner_or_manager(get_artist_team_id(artist_id)));

-- Owners/managers can update transactions
CREATE POLICY "Owners/managers can update transactions"
  ON public.transactions FOR UPDATE
  USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));

-- Owners/managers can delete transactions
CREATE POLICY "Owners/managers can delete transactions"
  ON public.transactions FOR DELETE
  USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));