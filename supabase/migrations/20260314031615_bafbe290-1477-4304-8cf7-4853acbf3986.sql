
-- Helper function
CREATE OR REPLACE FUNCTION public.get_release_team_id(p_release_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT team_id FROM public.releases WHERE id = p_release_id
$$;

-- Release tracks table
CREATE TABLE public.release_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  title text NOT NULL,
  isrc_code text,
  song_id uuid REFERENCES public.split_songs(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  is_explicit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.release_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view release tracks" ON public.release_tracks
  FOR SELECT TO public USING (is_team_member(get_release_team_id(release_id)));
CREATE POLICY "Owners/managers can insert release tracks" ON public.release_tracks
  FOR INSERT TO public WITH CHECK (is_team_owner_or_manager(get_release_team_id(release_id)));
CREATE POLICY "Owners/managers can update release tracks" ON public.release_tracks
  FOR UPDATE TO public USING (is_team_owner_or_manager(get_release_team_id(release_id)));
CREATE POLICY "Owners/managers can delete release tracks" ON public.release_tracks
  FOR DELETE TO public USING (is_team_owner_or_manager(get_release_team_id(release_id)));

-- Release platforms table
CREATE TABLE public.release_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  platform text NOT NULL,
  enabled boolean NOT NULL DEFAULT true
);

ALTER TABLE public.release_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view release platforms" ON public.release_platforms
  FOR SELECT TO public USING (is_team_member(get_release_team_id(release_id)));
CREATE POLICY "Owners/managers can insert release platforms" ON public.release_platforms
  FOR INSERT TO public WITH CHECK (is_team_owner_or_manager(get_release_team_id(release_id)));
CREATE POLICY "Owners/managers can update release platforms" ON public.release_platforms
  FOR UPDATE TO public USING (is_team_owner_or_manager(get_release_team_id(release_id)));
CREATE POLICY "Owners/managers can delete release platforms" ON public.release_platforms
  FOR DELETE TO public USING (is_team_owner_or_manager(get_release_team_id(release_id)));
