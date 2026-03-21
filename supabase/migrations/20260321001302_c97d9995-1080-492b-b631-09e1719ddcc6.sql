
CREATE TABLE public.meeting_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  title TEXT,
  raw_text TEXT NOT NULL,
  extracted_tasks JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read transcripts"
  ON public.meeting_transcripts FOR SELECT
  TO authenticated
  USING (public.is_team_member(team_id));

CREATE POLICY "Team members can insert transcripts"
  ON public.meeting_transcripts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_member(team_id));

CREATE POLICY "Team members can update transcripts"
  ON public.meeting_transcripts FOR UPDATE
  TO authenticated
  USING (public.is_team_member(team_id));
