
-- 1. Add priority column to tasks
ALTER TABLE public.tasks ADD COLUMN priority smallint NULL DEFAULT NULL;

-- 2. Brand alerts table
CREATE TABLE public.brand_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  brand_name text NOT NULL,
  headline text NOT NULL,
  url text,
  image_url text,
  drop_type text NOT NULL DEFAULT 'collection',
  detected_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view brand alerts"
  ON public.brand_alerts FOR SELECT TO authenticated
  USING (public.is_team_member(team_id));

CREATE POLICY "Team members can update brand alerts"
  ON public.brand_alerts FOR UPDATE TO authenticated
  USING (public.is_team_member(team_id));

-- 3. Brand alert artist matches
CREATE TABLE public.brand_alert_artist_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES public.brand_alerts(id) ON DELETE CASCADE NOT NULL,
  artist_id uuid REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  artist_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_alert_artist_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view brand alert matches"
  ON public.brand_alert_artist_matches FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brand_alerts ba
    WHERE ba.id = alert_id AND public.is_team_member(ba.team_id)
  ));

-- 4. Add brand alert frequency to notification preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN brand_alert_frequency text NOT NULL DEFAULT 'weekly_digest';
