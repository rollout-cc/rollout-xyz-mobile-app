
-- Add perm_view_full_roster to team_memberships
ALTER TABLE public.team_memberships ADD COLUMN IF NOT EXISTS perm_view_full_roster boolean NOT NULL DEFAULT false;

-- Add perm_view_full_roster to invite_links
ALTER TABLE public.invite_links ADD COLUMN IF NOT EXISTS perm_view_full_roster boolean NOT NULL DEFAULT false;

-- Set existing team_owners to true (they always see full roster)
UPDATE public.team_memberships SET perm_view_full_roster = true WHERE role = 'team_owner';

-- Set existing managers to true to preserve backward compat
UPDATE public.team_memberships SET perm_view_full_roster = true WHERE role = 'manager';

-- Update has_artist_access to respect perm_view_full_roster instead of blanket manager access
CREATE OR REPLACE FUNCTION public.has_artist_access(p_artist_id uuid, p_min_level permission_level)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.artist_permissions
    WHERE user_id = auth.uid() AND artist_id = p_artist_id
    AND (
      (p_min_level = 'view_access' AND permission IN ('view_access', 'full_access'))
      OR (p_min_level = 'full_access' AND permission = 'full_access')
      OR (p_min_level = 'no_access')
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.artists a
    JOIN public.team_memberships tm ON tm.team_id = a.team_id
    WHERE a.id = p_artist_id AND tm.user_id = auth.uid()
    AND (tm.role = 'team_owner' OR tm.perm_view_full_roster = true)
  )
$$;
