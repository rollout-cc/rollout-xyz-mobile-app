
CREATE TABLE public.rolly_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  month text NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (team_id, month)
);

ALTER TABLE public.rolly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view own usage"
  ON public.rolly_usage FOR SELECT
  TO authenticated
  USING (is_team_member(team_id));
