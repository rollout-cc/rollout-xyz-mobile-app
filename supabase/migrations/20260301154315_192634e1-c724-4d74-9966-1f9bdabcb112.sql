
CREATE TABLE public.monthly_listener_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  monthly_listeners INTEGER,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_mlh_artist_date ON public.monthly_listener_history(artist_id, recorded_at DESC);

-- Unique constraint: one record per artist per day
CREATE UNIQUE INDEX idx_mlh_artist_day ON public.monthly_listener_history(artist_id, recorded_at);

-- RLS
ALTER TABLE public.monthly_listener_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view listener history"
  ON public.monthly_listener_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      JOIN public.team_memberships tm ON tm.team_id = a.team_id
      WHERE a.id = monthly_listener_history.artist_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners/managers can insert listener history"
  ON public.monthly_listener_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artists a
      JOIN public.team_memberships tm ON tm.team_id = a.team_id
      WHERE a.id = monthly_listener_history.artist_id AND tm.user_id = auth.uid()
        AND tm.role IN ('team_owner', 'manager')
    )
  );
