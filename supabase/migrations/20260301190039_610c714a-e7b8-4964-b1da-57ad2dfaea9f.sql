
-- Create roster_folders table for grouping artists
CREATE TABLE public.roster_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to artists (nullable - artists can be uncategorized)
ALTER TABLE public.artists ADD COLUMN folder_id UUID REFERENCES public.roster_folders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.roster_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Team members can view roster folders"
  ON public.roster_folders FOR SELECT
  USING (is_team_member(team_id));

CREATE POLICY "Owners/managers can insert roster folders"
  ON public.roster_folders FOR INSERT
  WITH CHECK (is_team_owner_or_manager(team_id));

CREATE POLICY "Owners/managers can update roster folders"
  ON public.roster_folders FOR UPDATE
  USING (is_team_owner_or_manager(team_id));

CREATE POLICY "Owners/managers can delete roster folders"
  ON public.roster_folders FOR DELETE
  USING (is_team_owner_or_manager(team_id));
