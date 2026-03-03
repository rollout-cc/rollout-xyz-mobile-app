
CREATE OR REPLACE FUNCTION public.handle_new_team_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.team_subscriptions (team_id, plan, seat_limit, status, trial_ends_at)
  VALUES (NEW.id, 'rising', 1, 'trialing', now() + interval '30 days');
  RETURN NEW;
END;
$function$;
