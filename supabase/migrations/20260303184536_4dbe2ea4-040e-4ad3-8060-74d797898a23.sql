
-- Migration 1: profiles personal info columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_airline text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ktn_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tsa_precheck_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_seat text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shirt_size text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pant_size text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shoe_size text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dietary_restrictions text;

-- Migration 2: invite_links contact info
ALTER TABLE public.invite_links ADD COLUMN IF NOT EXISTS invitee_email text;
ALTER TABLE public.invite_links ADD COLUMN IF NOT EXISTS invitee_phone text;

-- Migration 3: transactions approval workflow
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS approved_at timestamptz;
