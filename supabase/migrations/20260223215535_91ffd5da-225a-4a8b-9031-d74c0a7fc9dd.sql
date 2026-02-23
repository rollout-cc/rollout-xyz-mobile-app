
-- Add public sharing token to artists for timeline sharing
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS timeline_public_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text);
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS timeline_is_public boolean NOT NULL DEFAULT false;

-- Allow public to view milestones when the artist's timeline is public
DROP POLICY IF EXISTS "Public can view shared milestones" ON public.artist_milestones;
CREATE POLICY "Public can view shared milestones" ON public.artist_milestones FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.timeline_is_public = true
  )
);
