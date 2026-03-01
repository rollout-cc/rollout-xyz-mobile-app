-- Allow anonymous users to read artist basic info when timeline is public (for shared timeline page)
CREATE POLICY "Public can view artist with public timeline"
  ON public.artists FOR SELECT
  USING (timeline_is_public = true);