
-- Table to track objective progress over time
CREATE TABLE public.objective_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK (slot IN (1, 2)),
  objective_type text NOT NULL,
  recorded_value numeric,
  target_value numeric,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  is_baseline boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, slot, recorded_at)
);

ALTER TABLE public.objective_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view objective snapshots"
  ON public.objective_snapshots FOR SELECT
  USING (has_artist_access(artist_id, 'view_access'::permission_level));

CREATE POLICY "Owners/managers can insert objective snapshots"
  ON public.objective_snapshots FOR INSERT
  WITH CHECK (is_team_owner_or_manager(get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can delete objective snapshots"
  ON public.objective_snapshots FOR DELETE
  USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));
