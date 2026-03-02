
-- Create tables first (no RLS policies yet)
CREATE TABLE public.split_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  name text NOT NULL,
  project_type text NOT NULL DEFAULT 'single',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.split_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.split_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.split_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  pro_affiliation text,
  ipi_number text,
  pub_ipi_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.split_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES public.split_songs(id) ON DELETE CASCADE,
  contributor_id uuid NOT NULL REFERENCES public.split_contributors(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'songwriter',
  master_pct numeric,
  producer_pct numeric,
  writer_pct numeric,
  approval_status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approval_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Now create helper functions that reference these tables
CREATE OR REPLACE FUNCTION public.get_split_project_team_id(p_project_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT a.team_id FROM public.split_projects sp
  JOIN public.artists a ON a.id = sp.artist_id
  WHERE sp.id = p_project_id
$$;

CREATE OR REPLACE FUNCTION public.get_split_song_team_id(p_song_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT a.team_id FROM public.split_songs ss
  JOIN public.split_projects sp ON sp.id = ss.project_id
  JOIN public.artists a ON a.id = sp.artist_id
  WHERE ss.id = p_song_id
$$;

-- Enable RLS
ALTER TABLE public.split_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_entries ENABLE ROW LEVEL SECURITY;

-- split_projects policies
CREATE POLICY "Team members can view split projects" ON public.split_projects
  FOR SELECT TO authenticated USING (is_team_member(get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can insert split projects" ON public.split_projects
  FOR INSERT TO authenticated WITH CHECK (is_team_owner_or_manager(get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can update split projects" ON public.split_projects
  FOR UPDATE TO authenticated USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can delete split projects" ON public.split_projects
  FOR DELETE TO authenticated USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));

-- split_songs policies
CREATE POLICY "Team members can view split songs" ON public.split_songs
  FOR SELECT TO authenticated USING (is_team_member(get_split_project_team_id(project_id)));
CREATE POLICY "Owners/managers can insert split songs" ON public.split_songs
  FOR INSERT TO authenticated WITH CHECK (is_team_owner_or_manager(get_split_project_team_id(project_id)));
CREATE POLICY "Owners/managers can update split songs" ON public.split_songs
  FOR UPDATE TO authenticated USING (is_team_owner_or_manager(get_split_project_team_id(project_id)));
CREATE POLICY "Owners/managers can delete split songs" ON public.split_songs
  FOR DELETE TO authenticated USING (is_team_owner_or_manager(get_split_project_team_id(project_id)));

-- split_contributors policies
CREATE POLICY "Team members can view split contributors" ON public.split_contributors
  FOR SELECT TO authenticated USING (is_team_member(team_id));
CREATE POLICY "Owners/managers can insert split contributors" ON public.split_contributors
  FOR INSERT TO authenticated WITH CHECK (is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can update split contributors" ON public.split_contributors
  FOR UPDATE TO authenticated USING (is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can delete split contributors" ON public.split_contributors
  FOR DELETE TO authenticated USING (is_team_owner_or_manager(team_id));

-- split_entries policies
CREATE POLICY "Team members can view split entries" ON public.split_entries
  FOR SELECT TO authenticated USING (is_team_member(get_split_song_team_id(song_id)));
CREATE POLICY "Owners/managers can insert split entries" ON public.split_entries
  FOR INSERT TO authenticated WITH CHECK (is_team_owner_or_manager(get_split_song_team_id(song_id)));
CREATE POLICY "Owners/managers can update split entries" ON public.split_entries
  FOR UPDATE TO authenticated USING (is_team_owner_or_manager(get_split_song_team_id(song_id)));
CREATE POLICY "Owners/managers can delete split entries" ON public.split_entries
  FOR DELETE TO authenticated USING (is_team_owner_or_manager(get_split_song_team_id(song_id)));

-- Public access policies for approval flow
CREATE POLICY "Public can view split entries by token" ON public.split_entries
  FOR SELECT TO anon USING (approval_token IS NOT NULL);
CREATE POLICY "Public can update split entry by token" ON public.split_entries
  FOR UPDATE TO anon USING (approval_token IS NOT NULL);

CREATE POLICY "Public can view split songs for approval" ON public.split_songs
  FOR SELECT TO anon USING (EXISTS (
    SELECT 1 FROM public.split_entries se WHERE se.song_id = split_songs.id
  ));
CREATE POLICY "Public can view split projects for approval" ON public.split_projects
  FOR SELECT TO anon USING (EXISTS (
    SELECT 1 FROM public.split_songs ss WHERE ss.project_id = split_projects.id
  ));
CREATE POLICY "Public can view split contributors for approval" ON public.split_contributors
  FOR SELECT TO anon USING (EXISTS (
    SELECT 1 FROM public.split_entries se WHERE se.contributor_id = split_contributors.id
  ));
