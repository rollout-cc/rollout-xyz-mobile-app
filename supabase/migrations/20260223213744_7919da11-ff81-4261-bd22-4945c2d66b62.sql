
ALTER TABLE public.artist_travel_info
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex');

CREATE OR REPLACE FUNCTION public.is_member_info_public(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(is_public, false) FROM public.artist_travel_info WHERE id = p_member_id
$$;

CREATE POLICY "Public can view shared member info"
ON public.artist_travel_info
FOR SELECT
USING (is_public = true);
