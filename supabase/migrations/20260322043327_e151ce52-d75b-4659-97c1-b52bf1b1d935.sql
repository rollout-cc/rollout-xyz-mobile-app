
-- Session summaries (service-role only, no RLS policies for users)
CREATE TABLE public.rolly_session_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES public.artists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rolly_session_summaries ENABLE ROW LEVEL SECURITY;

-- Artist tone profile (auto-populated by Rolly, not user-facing)
ALTER TABLE public.artists ADD COLUMN rolly_profile text;
