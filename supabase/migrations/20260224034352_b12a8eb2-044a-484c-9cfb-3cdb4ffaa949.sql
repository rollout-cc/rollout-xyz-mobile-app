
CREATE TABLE public.artist_performance_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  lead_streams_total bigint DEFAULT 0,
  feat_streams_total bigint DEFAULT 0,
  daily_streams bigint DEFAULT 0,
  monthly_streams bigint DEFAULT 0,
  monthly_listeners_all bigint DEFAULT 0,
  est_monthly_revenue numeric DEFAULT 0,
  raw_markdown text,
  scraped_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(artist_id)
);

ALTER TABLE public.artist_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view performance snapshots"
  ON public.artist_performance_snapshots
  FOR SELECT
  USING (has_artist_access(artist_id, 'view_access'::permission_level));

CREATE POLICY "Owners/managers can insert performance snapshots"
  ON public.artist_performance_snapshots
  FOR INSERT
  WITH CHECK (is_team_owner_or_manager(get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can update performance snapshots"
  ON public.artist_performance_snapshots
  FOR UPDATE
  USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can delete performance snapshots"
  ON public.artist_performance_snapshots
  FOR DELETE
  USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));
