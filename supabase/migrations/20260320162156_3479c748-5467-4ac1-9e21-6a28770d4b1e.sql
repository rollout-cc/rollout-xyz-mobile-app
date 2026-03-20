-- Lock down team creation so applicants cannot self-provision accounts
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Platform admins can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Prevent users from self-adding memberships; provisioning must happen through admin/backend flows
DROP POLICY IF EXISTS "Owners/managers can insert memberships" ON public.team_memberships;
CREATE POLICY "Owners/managers can insert memberships"
ON public.team_memberships
FOR INSERT
TO authenticated
WITH CHECK (public.is_team_owner_or_manager(team_id));