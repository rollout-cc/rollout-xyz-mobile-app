
-- Vendors table
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  w9_status text NOT NULL DEFAULT 'not_requested',
  w9_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  w9_completed_at timestamptz,
  total_paid numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_vendor_team_id(p_vendor_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT team_id FROM public.vendors WHERE id = p_vendor_id
$$;

CREATE POLICY "Team members can view vendors" ON public.vendors FOR SELECT USING (is_team_member(team_id));
CREATE POLICY "Owners/managers can insert vendors" ON public.vendors FOR INSERT WITH CHECK (is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can update vendors" ON public.vendors FOR UPDATE USING (is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can delete vendors" ON public.vendors FOR DELETE USING (is_team_owner_or_manager(team_id));

-- Vendor W-9 data (sensitive)
CREATE TABLE public.vendor_w9_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  business_name text,
  federal_tax_classification text NOT NULL,
  llc_classification text,
  exempt_payee_code text,
  fatca_exemption_code text,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  tin_type text NOT NULL,
  tin_last_four text NOT NULL,
  tin_encrypted text NOT NULL,
  signature_name text NOT NULL,
  signature_date date NOT NULL,
  payment_method text NOT NULL DEFAULT 'check',
  bank_routing_encrypted text,
  bank_account_encrypted text,
  paypal_email text,
  venmo_handle text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_w9_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners/managers can view w9 data" ON public.vendor_w9_data FOR SELECT USING (is_team_owner_or_manager(get_vendor_team_id(vendor_id)));

-- Invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  recipient_name text NOT NULL,
  recipient_email text,
  status text NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  footer_notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view invoices" ON public.invoices FOR SELECT USING (is_team_member(team_id));
CREATE POLICY "Owners/managers can insert invoices" ON public.invoices FOR INSERT WITH CHECK (is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can update invoices" ON public.invoices FOR UPDATE USING (is_team_owner_or_manager(team_id));
CREATE POLICY "Owners/managers can delete invoices" ON public.invoices FOR DELETE USING (is_team_owner_or_manager(team_id));

-- Invoice line items
CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_invoice_team_id(p_invoice_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT team_id FROM public.invoices WHERE id = p_invoice_id
$$;

CREATE POLICY "Team members can view line items" ON public.invoice_line_items FOR SELECT USING (is_team_member(get_invoice_team_id(invoice_id)));
CREATE POLICY "Owners/managers can insert line items" ON public.invoice_line_items FOR INSERT WITH CHECK (is_team_owner_or_manager(get_invoice_team_id(invoice_id)));
CREATE POLICY "Owners/managers can update line items" ON public.invoice_line_items FOR UPDATE USING (is_team_owner_or_manager(get_invoice_team_id(invoice_id)));
CREATE POLICY "Owners/managers can delete line items" ON public.invoice_line_items FOR DELETE USING (is_team_owner_or_manager(get_invoice_team_id(invoice_id)));

-- Next invoice number function
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_team_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 'INV-' || LPAD((COALESCE(MAX(NULLIF(REGEXP_REPLACE(invoice_number, '[^0-9]', '', 'g'), '')::integer), 0) + 1)::text, 4, '0')
  FROM public.invoices
  WHERE team_id = p_team_id
$$;
