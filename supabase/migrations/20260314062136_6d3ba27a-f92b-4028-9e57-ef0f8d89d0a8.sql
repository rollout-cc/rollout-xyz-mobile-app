
CREATE TABLE public.pro_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  source text NOT NULL,
  account_email text,
  status text NOT NULL DEFAULT 'pending',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team owners manage pro connections" ON public.pro_connections
  FOR ALL TO authenticated
  USING (is_team_owner_or_manager(team_id))
  WITH CHECK (is_team_owner_or_manager(team_id));

CREATE POLICY "Team members view pro connections" ON public.pro_connections
  FOR SELECT TO authenticated
  USING (is_team_member(team_id));
