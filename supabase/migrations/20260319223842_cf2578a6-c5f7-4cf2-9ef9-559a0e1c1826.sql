
CREATE TYPE public.feedback_type AS ENUM ('bug', 'feature');
CREATE TYPE public.feedback_status AS ENUM ('new', 'reviewed', 'planned', 'done', 'wont_fix');

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  type feedback_type NOT NULL DEFAULT 'bug',
  message text NOT NULL,
  page_url text,
  ai_category text,
  ai_priority text,
  ai_summary text,
  status feedback_status NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Platform admins can read all feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update feedback"
  ON public.feedback FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()));
