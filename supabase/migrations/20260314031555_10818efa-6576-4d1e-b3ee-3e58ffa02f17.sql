
-- Releases table
CREATE TABLE public.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  name text NOT NULL,
  release_type text NOT NULL DEFAULT 'single',
  release_date date,
  artwork_url text,
  genre text,
  secondary_genre text,
  record_label text,
  upc_code text,
  status text NOT NULL DEFAULT 'draft',
  split_project_id uuid REFERENCES public.split_projects(id) ON DELETE SET NULL,
  pro_registration_status text NOT NULL DEFAULT 'not_started',
  mlc_registration_status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view releases" ON public.releases
  FOR SELECT TO public USING (is_team_member(team_id));
CREATE POLICY "Owners/managers can insert releases" ON public.releases
  FOR INSERT TO public WITH CHECK (is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can update releases" ON public.releases
  FOR UPDATE TO public USING (is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can delete releases" ON public.releases
  FOR DELETE TO public USING (is_team_owner_or_manager(team_id));
