
-- Create a SECURITY DEFINER function to check if two users share a team
-- This avoids recursive RLS issues when the profiles policy references team_memberships
CREATE OR REPLACE FUNCTION public.shares_team_with(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships tm1
    JOIN public.team_memberships tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = p_user_id
  )
$$;

-- Drop the old policy and recreate using the SECURITY DEFINER function
DROP POLICY IF EXISTS "Team members can view profiles" ON public.profiles;

CREATE POLICY "Team members can view profiles"
  ON public.profiles
  FOR SELECT
  USING (public.shares_team_with(id));
