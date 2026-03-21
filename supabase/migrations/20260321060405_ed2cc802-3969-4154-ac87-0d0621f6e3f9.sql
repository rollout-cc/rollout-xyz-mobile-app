-- Replace the overly permissive "Team members can view artists" policy
-- with one that uses has_artist_access for proper role-based filtering.
-- Owners/managers see all artists; artist/guest roles only see assigned ones.

DROP POLICY IF EXISTS "Team members can view artists" ON public.artists;

CREATE POLICY "Team members can view artists"
ON public.artists
FOR SELECT
USING (
  has_artist_access(id, 'view_access'::permission_level)
);