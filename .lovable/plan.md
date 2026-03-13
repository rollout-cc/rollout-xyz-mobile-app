

## Plan: Vendor Invoice Submission with Artist Selection, PO Numbers, and Payment Terms

### Summary

Vendors submit invoices via a simple public form (reusing their W-9 token). Before sending the link, your team selects the artist and payment terms. The form auto-generates a PO number so the vendor just fills in: description, amount, invoice date, due date, and optional file upload. Approved invoices auto-create expense transactions.

### Database: `vendor_invoices` table

```sql
CREATE TABLE public.vendor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  team_id uuid NOT NULL,
  artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  po_number text NOT NULL,              -- auto-generated PO-0001, PO-0002...
  payment_terms text NOT NULL DEFAULT 'net_30', -- asap, net_15, net_30, net_45, net_60, upon_completion
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  file_url text,
  status text NOT NULL DEFAULT 'pending',  -- pending, approved, rejected, paid
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Also add columns to the `vendors` table to store the pre-selected artist and payment terms for the invoice request:

```sql
ALTER TABLE public.vendors
  ADD COLUMN invoice_artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  ADD COLUMN invoice_payment_terms text DEFAULT 'net_30';
```

DB function for auto-incrementing PO numbers:

```sql
CREATE OR REPLACE FUNCTION public.next_po_number(p_team_id uuid)
RETURNS text AS $$
  SELECT 'PO-' || LPAD((COALESCE(MAX(NULLIF(REGEXP_REPLACE(po_number, '[^0-9]', '', 'g'), '')::integer), 0) + 1)::text, 4, '0')
  FROM public.vendor_invoices WHERE team_id = p_team_id
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public';
```

RLS: team members SELECT, owners/managers UPDATE/DELETE, open INSERT (service role via edge function).

### Edge Function: `submit-vendor-invoice`

Public (no JWT). Validates vendor via `w9_token`, confirms W-9 is completed. Accepts: description, amount, invoice_date, due_date (optional). Auto-generates PO number using service role. Reads `invoice_artist_id` and `invoice_payment_terms` from the vendor record to populate the invoice row.

### Public Page: `/vendor-invoice/:token`

Simple single-page form (no multi-step needed since W-9 is already done):
- **Pre-filled**: Vendor name, artist name (read-only), payment terms (read-only, set by team)
- **Vendor fills in**: Description of services, amount (currency input), invoice date (date picker), due date (optional date picker), optional notes
- PO number is auto-generated on submit -- vendor never sees/manages it
- Success confirmation after submit

### VendorManager Changes

**"Request Invoice" flow** — before copying the link, a small dialog lets the team member:
1. Select which **artist** this invoice is for (dropdown of team artists)
2. Select **payment terms** (ASAP, Net 15, Net 30, Net 45, Net 60, Upon Completion)
3. These get saved to the vendor record, then the link is copied

Only shown for vendors with completed W-9s.

### VendorInvoiceList Component

Shows incoming invoices with: PO number, vendor name, artist, amount, status badge, payment terms. Actions: Approve (creates expense transaction automatically), Reject, Mark Paid. Integrated into FinanceTab as a collapsible "Incoming Invoices" section.

### Files

| Action | File |
|--------|------|
| Migration | `vendor_invoices` table, vendor columns, PO function, RLS |
| Create | `supabase/functions/submit-vendor-invoice/index.ts` |
| Create | `src/pages/VendorInvoice.tsx` |
| Create | `src/components/finance/VendorInvoiceList.tsx` |
| Edit | `src/App.tsx` — add `/vendor-invoice/:token` route |
| Edit | `src/components/finance/VendorManager.tsx` — add "Request Invoice" dialog with artist/terms selection |
| Edit | `src/components/artist/FinanceTab.tsx` — add incoming invoices section |

### Flow

```text
Team: VendorManager → "Request Invoice" → pick artist + payment terms → saves to vendor → copies link
Vendor: /vendor-invoice/:token → sees artist name + terms → fills description, amount, dates → submit
Backend: edge function validates token, generates PO number, inserts vendor_invoice
Team: Finance tab → "Incoming Invoices" → approve → auto-creates expense transaction
```

