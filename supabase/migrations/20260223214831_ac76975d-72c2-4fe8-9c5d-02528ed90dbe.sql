
-- Add artist_id to artist_links for unfiled links
ALTER TABLE public.artist_links ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.artists(id) ON DELETE CASCADE;

-- Make folder_id nullable
ALTER TABLE public.artist_links ALTER COLUMN folder_id DROP NOT NULL;

-- Backfill artist_id from existing folder relationships
UPDATE public.artist_links al
SET artist_id = f.artist_id
FROM public.artist_link_folders f
WHERE al.folder_id = f.id AND al.artist_id IS NULL;

-- Update RLS policies to handle unfiled links
DROP POLICY IF EXISTS "Can view links" ON public.artist_links;
CREATE POLICY "Can view links" ON public.artist_links FOR SELECT
USING (
  (folder_id IS NOT NULL AND (has_artist_access(get_link_folder_artist_id(folder_id), 'view_access'::permission_level) OR is_link_folder_public(folder_id)))
  OR
  (artist_id IS NOT NULL AND has_artist_access(artist_id, 'view_access'::permission_level))
);

DROP POLICY IF EXISTS "Owners/managers can insert links" ON public.artist_links;
CREATE POLICY "Owners/managers can insert links" ON public.artist_links FOR INSERT
WITH CHECK (
  (folder_id IS NOT NULL AND is_team_owner_or_manager(get_artist_team_id(get_link_folder_artist_id(folder_id))))
  OR
  (artist_id IS NOT NULL AND is_team_owner_or_manager(get_artist_team_id(artist_id)))
);

DROP POLICY IF EXISTS "Owners/managers can update links" ON public.artist_links;
CREATE POLICY "Owners/managers can update links" ON public.artist_links FOR UPDATE
USING (
  (folder_id IS NOT NULL AND is_team_owner_or_manager(get_artist_team_id(get_link_folder_artist_id(folder_id))))
  OR
  (artist_id IS NOT NULL AND is_team_owner_or_manager(get_artist_team_id(artist_id)))
);

DROP POLICY IF EXISTS "Owners/managers can delete links" ON public.artist_links;
CREATE POLICY "Owners/managers can delete links" ON public.artist_links FOR DELETE
USING (
  (folder_id IS NOT NULL AND is_team_owner_or_manager(get_artist_team_id(get_link_folder_artist_id(folder_id))))
  OR
  (artist_id IS NOT NULL AND is_team_owner_or_manager(get_artist_team_id(artist_id)))
);
