
ALTER TABLE public.teams 
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

ALTER TABLE public.invite_links
  ADD COLUMN IF NOT EXISTS invitee_name text,
  ADD COLUMN IF NOT EXISTS invitee_job_title text,
  ADD COLUMN IF NOT EXISTS staff_salary numeric;

-- Mark existing teams with company_type as already onboarded
UPDATE public.teams SET onboarding_completed = true WHERE company_type IS NOT NULL;
