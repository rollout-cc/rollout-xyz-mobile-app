
-- Add permission booleans to team_memberships (additive on top of role defaults)
ALTER TABLE public.team_memberships
  ADD COLUMN IF NOT EXISTS perm_view_finance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_manage_finance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_view_staff_salaries boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_view_ar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_view_roster boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_edit_artists boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_view_billing boolean NOT NULL DEFAULT false;

-- Add permission booleans to invite_links so they carry over on accept
ALTER TABLE public.invite_links
  ADD COLUMN IF NOT EXISTS perm_view_finance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_manage_finance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_view_staff_salaries boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_view_ar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_view_roster boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_edit_artists boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_view_billing boolean NOT NULL DEFAULT false;
