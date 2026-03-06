DROP POLICY "Members can view team memberships" ON public.team_memberships;

CREATE POLICY "Members can view team memberships"
ON public.team_memberships
FOR SELECT
TO authenticated
USING (is_team_member(team_id));