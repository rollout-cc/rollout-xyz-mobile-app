-- Team subscriptions table
CREATE TABLE public.team_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'rising',
  seat_limit integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  trial_ends_at timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_id)
);

ALTER TABLE public.team_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team owners can view subscription"
  ON public.team_subscriptions FOR SELECT
  USING (is_team_owner_or_manager(team_id));

CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  team_size text,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert contact requests"
  ON public.contact_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TRIGGER set_team_subscriptions_updated_at
  BEFORE UPDATE ON public.team_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_team_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.team_subscriptions (team_id, plan, seat_limit, status)
  VALUES (NEW.id, 'rising', 1, 'active');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created_add_subscription
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_team_subscription();