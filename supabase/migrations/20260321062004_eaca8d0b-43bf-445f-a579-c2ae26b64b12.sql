
-- Fix artists SELECT policy so owner/manager access can be evaluated from the row itself.
-- This allows INSERT ... RETURNING via PostgREST to succeed for newly-created rows.
DROP POLICY IF EXISTS "Team members can view artists" ON public.artists;

CREATE POLICY "Team members can view artists"
ON public.artists
FOR SELECT
TO public
USING (
  is_team_owner_or_manager(team_id)
  OR has_artist_access(id, 'view_access'::permission_level)
);
