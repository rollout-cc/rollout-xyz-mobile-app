ALTER TABLE public.invite_links ADD COLUMN IF NOT EXISTS add_to_staff boolean NOT NULL DEFAULT false;
ALTER TABLE public.invite_links ADD COLUMN IF NOT EXISTS staff_employment_type text DEFAULT 'w2';