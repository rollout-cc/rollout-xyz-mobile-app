
-- Junction table: milestones <-> link folders
CREATE TABLE public.milestone_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID NOT NULL REFERENCES public.artist_milestones(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.artist_link_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(milestone_id, folder_id)
);

-- Junction table: milestones <-> links
CREATE TABLE public.milestone_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID NOT NULL REFERENCES public.artist_milestones(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.artist_links(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(milestone_id, link_id)
);

-- Enable RLS
ALTER TABLE public.milestone_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_links ENABLE ROW LEVEL SECURITY;

-- Helper function to get artist_id from milestone
CREATE OR REPLACE FUNCTION public.get_milestone_artist_id(p_milestone_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT artist_id FROM public.artist_milestones WHERE id = p_milestone_id
$$;

-- RLS for milestone_folders
CREATE POLICY "Team members can view milestone folders"
  ON public.milestone_folders FOR SELECT
  USING (has_artist_access(get_milestone_artist_id(milestone_id), 'view_access'::permission_level));

CREATE POLICY "Owners/managers can insert milestone folders"
  ON public.milestone_folders FOR INSERT
  WITH CHECK (is_team_owner_or_manager(get_artist_team_id(get_milestone_artist_id(milestone_id))));

CREATE POLICY "Owners/managers can delete milestone folders"
  ON public.milestone_folders FOR DELETE
  USING (is_team_owner_or_manager(get_artist_team_id(get_milestone_artist_id(milestone_id))));

-- RLS for milestone_links
CREATE POLICY "Team members can view milestone links"
  ON public.milestone_links FOR SELECT
  USING (has_artist_access(get_milestone_artist_id(milestone_id), 'view_access'::permission_level));

CREATE POLICY "Owners/managers can insert milestone links"
  ON public.milestone_links FOR INSERT
  WITH CHECK (is_team_owner_or_manager(get_artist_team_id(get_milestone_artist_id(milestone_id))));

CREATE POLICY "Owners/managers can delete milestone links"
  ON public.milestone_links FOR DELETE
  USING (is_team_owner_or_manager(get_artist_team_id(get_milestone_artist_id(milestone_id))));
