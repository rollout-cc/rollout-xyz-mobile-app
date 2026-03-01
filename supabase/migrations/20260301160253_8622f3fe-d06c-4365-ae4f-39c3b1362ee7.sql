
-- Create artist_timelines table
CREATE TABLE public.artist_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view timelines" ON public.artist_timelines
  FOR SELECT USING (is_team_member(get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can insert timelines" ON public.artist_timelines
  FOR INSERT WITH CHECK (is_team_owner_or_manager(get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can update timelines" ON public.artist_timelines
  FOR UPDATE USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can delete timelines" ON public.artist_timelines
  FOR DELETE USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));

-- Public access for shared timelines
CREATE POLICY "Public can view timelines for public artists" ON public.artist_timelines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_timelines.artist_id AND a.timeline_is_public = true
    )
  );

-- Add timeline_id to milestones
ALTER TABLE public.artist_milestones
  ADD COLUMN timeline_id uuid REFERENCES public.artist_timelines(id) ON DELETE SET NULL;
