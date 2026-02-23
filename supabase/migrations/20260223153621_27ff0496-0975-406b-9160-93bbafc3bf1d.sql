
-- Storage bucket for artist assets
INSERT INTO storage.buckets (id, name, public) VALUES ('artist-assets', 'artist-assets', true);

-- Storage RLS: team members can upload
CREATE POLICY "Team members can upload artist assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'artist-assets');

CREATE POLICY "Anyone can view artist assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-assets');

CREATE POLICY "Team members can delete artist assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'artist-assets');

-- artist_contacts
CREATE TABLE public.artist_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view contacts" ON public.artist_contacts
FOR SELECT USING (public.has_artist_access(artist_id, 'view_access'));

CREATE POLICY "Owners/managers can insert contacts" ON public.artist_contacts
FOR INSERT WITH CHECK (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can update contacts" ON public.artist_contacts
FOR UPDATE USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can delete contacts" ON public.artist_contacts
FOR DELETE USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

-- artist_travel_info
CREATE TABLE public.artist_travel_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  passport_name TEXT,
  dietary_restrictions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_travel_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view travel info" ON public.artist_travel_info
FOR SELECT USING (public.has_artist_access(artist_id, 'view_access'));

CREATE POLICY "Owners/managers can insert travel info" ON public.artist_travel_info
FOR INSERT WITH CHECK (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can update travel info" ON public.artist_travel_info
FOR UPDATE USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can delete travel info" ON public.artist_travel_info
FOR DELETE USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

-- artist_clothing
CREATE TABLE public.artist_clothing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  shirt_size TEXT,
  pant_size TEXT,
  shoe_size TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_clothing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view clothing" ON public.artist_clothing
FOR SELECT USING (public.has_artist_access(artist_id, 'view_access'));

CREATE POLICY "Owners/managers can insert clothing" ON public.artist_clothing
FOR INSERT WITH CHECK (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can update clothing" ON public.artist_clothing
FOR UPDATE USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can delete clothing" ON public.artist_clothing
FOR DELETE USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

-- artist_link_folders
CREATE TABLE public.artist_link_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_link_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view link folders" ON public.artist_link_folders
FOR SELECT USING (public.has_artist_access(artist_id, 'view_access') OR is_public = true);

CREATE POLICY "Owners/managers can insert link folders" ON public.artist_link_folders
FOR INSERT WITH CHECK (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can update link folders" ON public.artist_link_folders
FOR UPDATE USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can delete link folders" ON public.artist_link_folders
FOR DELETE USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

-- artist_links
CREATE TABLE public.artist_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.artist_link_folders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_links ENABLE ROW LEVEL SECURITY;

-- For artist_links, we need to join through folder to get artist_id
CREATE OR REPLACE FUNCTION public.get_link_folder_artist_id(p_folder_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT artist_id FROM public.artist_link_folders WHERE id = p_folder_id
$$;

CREATE OR REPLACE FUNCTION public.is_link_folder_public(p_folder_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(is_public, false) FROM public.artist_link_folders WHERE id = p_folder_id
$$;

CREATE POLICY "Can view links" ON public.artist_links
FOR SELECT USING (
  public.has_artist_access(public.get_link_folder_artist_id(folder_id), 'view_access')
  OR public.is_link_folder_public(folder_id)
);

CREATE POLICY "Owners/managers can insert links" ON public.artist_links
FOR INSERT WITH CHECK (public.is_team_owner_or_manager(public.get_artist_team_id(public.get_link_folder_artist_id(folder_id))));

CREATE POLICY "Owners/managers can update links" ON public.artist_links
FOR UPDATE USING (public.is_team_owner_or_manager(public.get_artist_team_id(public.get_link_folder_artist_id(folder_id))));

CREATE POLICY "Owners/managers can delete links" ON public.artist_links
FOR DELETE USING (public.is_team_owner_or_manager(public.get_artist_team_id(public.get_link_folder_artist_id(folder_id))));

-- artist_milestones
CREATE TABLE public.artist_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view milestones" ON public.artist_milestones
FOR SELECT USING (public.has_artist_access(artist_id, 'view_access') OR is_public = true);

CREATE POLICY "Owners/managers can insert milestones" ON public.artist_milestones
FOR INSERT WITH CHECK (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can update milestones" ON public.artist_milestones
FOR UPDATE USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

CREATE POLICY "Owners/managers can delete milestones" ON public.artist_milestones
FOR DELETE USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

-- Add banner_url to artists
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS banner_url TEXT;
