
CREATE TABLE public.team_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  company_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.team_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own applications" ON public.team_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own applications" ON public.team_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all applications" ON public.team_applications
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can update applications" ON public.team_applications
  FOR UPDATE TO authenticated USING (public.is_platform_admin(auth.uid()));
