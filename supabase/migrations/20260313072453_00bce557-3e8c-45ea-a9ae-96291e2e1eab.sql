
-- Create vendor_invoices table
CREATE TABLE public.vendor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  team_id uuid NOT NULL,
  artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  po_number text NOT NULL,
  payment_terms text NOT NULL DEFAULT 'net_30',
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  file_url text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Team members can view vendor invoices"
  ON public.vendor_invoices FOR SELECT
  USING (is_team_member(team_id));

CREATE POLICY "Owners/managers can update vendor invoices"
  ON public.vendor_invoices FOR UPDATE
  USING (is_team_owner_or_manager(team_id));

CREATE POLICY "Owners/managers can delete vendor invoices"
  ON public.vendor_invoices FOR DELETE
  USING (is_team_owner_or_manager(team_id));

CREATE POLICY "Service role can insert vendor invoices"
  ON public.vendor_invoices FOR INSERT
  WITH CHECK (true);

-- Add invoice request fields to vendors table
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS invoice_artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_payment_terms text DEFAULT 'net_30';

-- PO number auto-increment function
CREATE OR REPLACE FUNCTION public.next_po_number(p_team_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 'PO-' || LPAD(
    (COALESCE(
      MAX(NULLIF(REGEXP_REPLACE(po_number, '[^0-9]', '', 'g'), '')::integer),
      0
    ) + 1)::text,
    4, '0'
  )
  FROM public.vendor_invoices
  WHERE team_id = p_team_id
$$;
