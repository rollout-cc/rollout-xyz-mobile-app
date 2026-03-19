
-- 1. Platform admins table
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Security definer function to check platform admin status
CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = p_user_id
  )
$$;

-- RLS: only platform admins can read
CREATE POLICY "Platform admins can read" ON public.platform_admins
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 2. Team ownership transfers table
CREATE TABLE public.team_ownership_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  admin_acknowledged_at timestamptz,
  owner_accepted_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  policy_version text NOT NULL DEFAULT 'v1.0',
  token text NOT NULL DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_ownership_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage transfers" ON public.team_ownership_transfers
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Recipients can view and accept their transfers" ON public.team_ownership_transfers
  FOR SELECT TO authenticated
  USING (to_user_id = auth.uid());

-- 3. Support access requests table
CREATE TABLE public.support_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  approved_by uuid,
  approved_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage support requests" ON public.support_access_requests
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Team owners can view their support requests" ON public.support_access_requests
  FOR SELECT TO authenticated
  USING (public.is_team_member(team_id));

CREATE POLICY "Team owners can update support requests" ON public.support_access_requests
  FOR UPDATE TO authenticated
  USING (public.is_team_owner_or_manager(team_id))
  WITH CHECK (public.is_team_owner_or_manager(team_id));

-- 4. Add is_support_session column to team_memberships
ALTER TABLE public.team_memberships ADD COLUMN IF NOT EXISTS is_support_session boolean NOT NULL DEFAULT false;

-- 5. Function to expire stale support sessions
CREATE OR REPLACE FUNCTION public.expire_support_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove expired support memberships
  DELETE FROM public.team_memberships
  WHERE is_support_session = true
    AND user_id IN (
      SELECT admin_user_id FROM public.support_access_requests
      WHERE status = 'active' AND expires_at < now()
    );
  
  -- Mark expired requests
  UPDATE public.support_access_requests
  SET status = 'expired', ended_at = now()
  WHERE status = 'active' AND expires_at < now();
END;
$$;
