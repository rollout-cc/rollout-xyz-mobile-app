
-- App role enum
CREATE TYPE public.app_role AS ENUM ('team_owner', 'manager', 'artist');

-- Permission level enum
CREATE TYPE public.permission_level AS ENUM ('no_access', 'view_access', 'full_access');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  job_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team memberships
CREATE TABLE public.team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'manager',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, team_id)
);
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- Artists table
CREATE TABLE public.artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  spotify_id TEXT,
  genres TEXT[],
  primary_focus TEXT,
  secondary_focus TEXT,
  primary_goal TEXT,
  secondary_goal TEXT,
  primary_metric TEXT,
  secondary_metric TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- Artist permissions (per-user access to specific artists)
CREATE TABLE public.artist_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  permission public.permission_level NOT NULL DEFAULT 'no_access',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, artist_id)
);
ALTER TABLE public.artist_permissions ENABLE ROW LEVEL SECURITY;

-- Initiatives (campaigns)
CREATE TABLE public.initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;

-- Budgets (per artist, line items)
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  expense_amount NUMERIC,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Notification preferences
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  task_assigned_email BOOLEAN NOT NULL DEFAULT false,
  task_assigned_sms BOOLEAN NOT NULL DEFAULT true,
  task_due_soon_email BOOLEAN NOT NULL DEFAULT false,
  task_due_soon_sms BOOLEAN NOT NULL DEFAULT true,
  task_overdue_email BOOLEAN NOT NULL DEFAULT false,
  task_overdue_sms BOOLEAN NOT NULL DEFAULT true,
  milestone_email BOOLEAN NOT NULL DEFAULT false,
  milestone_sms BOOLEAN NOT NULL DEFAULT true,
  weekly_summary_email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Invite links
CREATE TABLE public.invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  role public.app_role NOT NULL DEFAULT 'manager',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  artist_permissions JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper functions (bypass RLS)

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE user_id = auth.uid() AND team_id = p_team_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner_or_manager(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE user_id = auth.uid() AND team_id = p_team_id AND role IN ('team_owner', 'manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_artist_access(p_artist_id UUID, p_min_level public.permission_level)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
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
    WHERE a.id = p_artist_id AND tm.user_id = auth.uid() AND tm.role IN ('team_owner', 'manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_artist_team_id(p_artist_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.artists WHERE id = p_artist_id
$$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON public.artists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Team members can view profiles" ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_memberships tm1
    JOIN public.team_memberships tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid() AND tm2.user_id = profiles.id
  ));

-- Teams
CREATE POLICY "Members can view their teams" ON public.teams FOR SELECT USING (public.is_team_member(id));
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners/managers can update teams" ON public.teams FOR UPDATE USING (public.is_team_owner_or_manager(id));
CREATE POLICY "Owners can delete teams" ON public.teams FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.team_memberships WHERE user_id = auth.uid() AND team_id = teams.id AND role = 'team_owner')
);

-- Team memberships
CREATE POLICY "Members can view team memberships" ON public.team_memberships FOR SELECT
  USING (user_id = auth.uid() OR public.is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can insert memberships" ON public.team_memberships FOR INSERT
  TO authenticated WITH CHECK (public.is_team_owner_or_manager(team_id) OR user_id = auth.uid());
CREATE POLICY "Owners/managers can update memberships" ON public.team_memberships FOR UPDATE
  USING (public.is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can delete memberships" ON public.team_memberships FOR DELETE
  USING (public.is_team_owner_or_manager(team_id));

-- Artists
CREATE POLICY "Team members can view artists" ON public.artists FOR SELECT
  USING (public.is_team_member(team_id));
CREATE POLICY "Owners/managers can insert artists" ON public.artists FOR INSERT
  TO authenticated WITH CHECK (public.is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers or full access can update artists" ON public.artists FOR UPDATE
  USING (public.is_team_owner_or_manager(team_id) OR public.has_artist_access(id, 'full_access'));
CREATE POLICY "Owners/managers can delete artists" ON public.artists FOR DELETE
  USING (public.is_team_owner_or_manager(team_id));

-- Artist permissions
CREATE POLICY "Users can view own permissions" ON public.artist_permissions FOR SELECT
  USING (user_id = auth.uid() OR public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can manage permissions" ON public.artist_permissions FOR INSERT
  TO authenticated WITH CHECK (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can update permissions" ON public.artist_permissions FOR UPDATE
  USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can delete permissions" ON public.artist_permissions FOR DELETE
  USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

-- Initiatives
CREATE POLICY "Team members can view initiatives" ON public.initiatives FOR SELECT
  USING (public.is_team_member(public.get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can insert initiatives" ON public.initiatives FOR INSERT
  TO authenticated WITH CHECK (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can update initiatives" ON public.initiatives FOR UPDATE
  USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can delete initiatives" ON public.initiatives FOR DELETE
  USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

-- Budgets
CREATE POLICY "Team members can view budgets" ON public.budgets FOR SELECT
  USING (public.has_artist_access(artist_id, 'view_access'));
CREATE POLICY "Owners/managers can insert budgets" ON public.budgets FOR INSERT
  TO authenticated WITH CHECK (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can update budgets" ON public.budgets FOR UPDATE
  USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can delete budgets" ON public.budgets FOR DELETE
  USING (public.is_team_owner_or_manager(public.get_artist_team_id(artist_id)));

-- Tasks
CREATE POLICY "Members can view tasks" ON public.tasks FOR SELECT
  USING (public.is_team_member(team_id));
CREATE POLICY "Members can insert tasks" ON public.tasks FOR INSERT
  TO authenticated WITH CHECK (public.is_team_member(team_id));
CREATE POLICY "Members can update tasks" ON public.tasks FOR UPDATE
  USING (public.is_team_member(team_id));
CREATE POLICY "Owners/managers can delete tasks" ON public.tasks FOR DELETE
  USING (public.is_team_owner_or_manager(team_id));

-- Notification preferences
CREATE POLICY "Users can view own notifications" ON public.notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notification_preferences FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own notifications" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Invite links
CREATE POLICY "Owners/managers can view invites" ON public.invite_links FOR SELECT
  USING (public.is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can create invites" ON public.invite_links FOR INSERT
  TO authenticated WITH CHECK (public.is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can delete invites" ON public.invite_links FOR DELETE
  USING (public.is_team_owner_or_manager(team_id));
