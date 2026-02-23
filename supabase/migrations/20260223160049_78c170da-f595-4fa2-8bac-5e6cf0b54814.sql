
-- Drop all restrictive policies on teams and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Members can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Owners can delete teams" ON public.teams;
DROP POLICY IF EXISTS "Owners/managers can update teams" ON public.teams;

CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view their teams" ON public.teams
  FOR SELECT TO authenticated
  USING (is_team_member(id));

CREATE POLICY "Owners can delete teams" ON public.teams
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_memberships.user_id = auth.uid()
      AND team_memberships.team_id = teams.id
      AND team_memberships.role = 'team_owner'::app_role
  ));

CREATE POLICY "Owners/managers can update teams" ON public.teams
  FOR UPDATE TO authenticated
  USING (is_team_owner_or_manager(id));

-- Also fix team_memberships INSERT policy to be permissive
DROP POLICY IF EXISTS "Members can view team memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Owners/managers can delete memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Owners/managers can insert memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Owners/managers can update memberships" ON public.team_memberships;

CREATE POLICY "Members can view team memberships" ON public.team_memberships
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR is_team_owner_or_manager(team_id));

CREATE POLICY "Owners/managers can delete memberships" ON public.team_memberships
  FOR DELETE TO authenticated
  USING (is_team_owner_or_manager(team_id));

CREATE POLICY "Owners/managers can insert memberships" ON public.team_memberships
  FOR INSERT TO authenticated
  WITH CHECK (is_team_owner_or_manager(team_id) OR (user_id = auth.uid()));

CREATE POLICY "Owners/managers can update memberships" ON public.team_memberships
  FOR UPDATE TO authenticated
  USING (is_team_owner_or_manager(team_id));
