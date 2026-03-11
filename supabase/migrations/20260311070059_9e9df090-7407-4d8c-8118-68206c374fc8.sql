
CREATE OR REPLACE FUNCTION public.increment_rolly_usage(p_team_id uuid, p_month text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.rolly_usage (team_id, month, message_count)
  VALUES (p_team_id, p_month, 1)
  ON CONFLICT (team_id, month)
  DO UPDATE SET message_count = rolly_usage.message_count + 1;
$$;
