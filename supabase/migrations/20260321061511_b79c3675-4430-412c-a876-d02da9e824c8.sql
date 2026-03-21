
-- Fix INSERT policy on artists table - change role from authenticated to public
-- The is_team_owner_or_manager function itself verifies auth.uid() so this is still secure
DROP POLICY IF EXISTS "Owners/managers can insert artists" ON public.artists;

CREATE POLICY "Owners/managers can insert artists"
ON public.artists
FOR INSERT
TO public
WITH CHECK (is_team_owner_or_manager(team_id));
