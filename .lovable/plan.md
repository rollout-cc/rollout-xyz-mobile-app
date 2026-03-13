

# Invoicing & Vendor W-9 System

## Key Design Decisions

**Invoicing (Wave-inspired simplicity):**
- Dead-simple invoice creation: pick a recipient, add line items (description + qty + price), set due date, send
- Status tracking: Draft → Sent → Viewed → Paid → Overdue
- Email delivery with a clean branded HTML invoice
- Accessible from both Company Finance tab and Artist Finance tab

**W-9 Form (real IRS W-9):**
- Public page that mirrors the actual IRS W-9 form fields: legal name, business name, federal tax classification (individual, C corp, S corp, Partnership, Trust/estate, LLC with classification, Other), exemptions, address, TIN (SSN or EIN), certification signature
- Plus payment method section (bank ACH, PayPal, Venmo, check)
- Vendor receives link via email or team copies shareable URL
- Submitted data stored encrypted; team sees masked TIN (last 4 only)

## Data Model

**`vendors` table:**
id, team_id, name, email, phone, w9_status (not_requested/pending/completed), w9_token (unique), w9_completed_at, total_paid, notes, created_at

**`vendor_w9_data` table (sensitive, tight RLS):**
id, vendor_id, legal_name, business_name, federal_tax_classification, llc_classification, exempt_payee_code, fatca_exemption_code, address_line1, address_line2, city, state, zip, tin_type (ssn/ein), tin_last_four, tin_encrypted, signature_name, signature_date, payment_method, bank_routing_encrypted, bank_account_encrypted, paypal_email, venmo_handle, created_at

RLS: Only team owners/managers can SELECT vendor_w9_data via a helper function. No public read.

**`invoices` table:**
id, team_id, artist_id (nullable), vendor_id (nullable), invoice_number, recipient_name, recipient_email, status (draft/sent/viewed/paid/overdue/cancelled), issue_date, due_date, subtotal, tax_rate, total, notes, footer_notes, paid_at, created_at

**`invoice_line_items` table:**
id, invoice_id, description, quantity, unit_price, amount, sort_order

RLS: Team members can view; owners/managers can CRUD.

**DB function:** `next_invoice_number(p_team_id)` returns sequential `INV-0001`.
**DB function:** `get_vendor_team_id(p_vendor_id)` for RLS helpers.

## Edge Functions

**`submit-vendor-w9`** (public, no JWT):
- Validates w9_token, checks not already completed
- Stores W-9 data using service role client
- Updates vendor w9_status → completed
- TIN stored as-is in tin_encrypted (Supabase encryption at rest), last 4 in tin_last_four

**`send-vendor-w9-request`** (authenticated):
- Sends branded email via Resend with link to `/vendor-w9/{token}`
- Updates vendor w9_status → pending

**`send-invoice`** (authenticated):
- Generates clean HTML email with invoice details, line items, totals
- Sends via Resend
- Updates invoice status → sent

## Frontend

**New Components:**
- `src/components/finance/VendorManager.tsx` — vendor list with W-9 status badges, add vendor dialog, actions (send W-9, copy link, view masked data)
- `src/components/finance/InvoiceCreator.tsx` — Sheet with: recipient (vendor dropdown or manual), line items editor (desc/qty/price with auto-calc), dates, tax rate, notes. Preview before send.
- `src/components/finance/InvoiceList.tsx` — table of invoices with status badges, actions (edit, send, mark paid, cancel)
- `src/pages/VendorW9.tsx` — public page, no auth. Multi-step form mirroring IRS W-9: Step 1 (Name/Business/Tax Classification), Step 2 (Exemptions/Address), Step 3 (TIN entry), Step 4 (Payment method), Step 5 (Certification/e-signature). Rollout branding.

**Integration Points:**
- Company Finance tab (`FinanceContent.tsx`): Add "Vendors" and "Invoices" collapsible sections
- Artist Finance tab (`FinanceTab.tsx`): Add "Invoices" section scoped to that artist
- `App.tsx`: Add `/vendor-w9/:token` public route
- `supabase/config.toml`: Register 3 new edge functions

**ROLLY:** Update system prompt in `rolly-chat` to be aware of invoicing and vendor management capabilities.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | 4 tables, RLS, functions |
| `supabase/functions/submit-vendor-w9/index.ts` | New |
| `supabase/functions/send-vendor-w9-request/index.ts` | New |
| `supabase/functions/send-invoice/index.ts` | New |
| `src/components/finance/VendorManager.tsx` | New |
| `src/components/finance/InvoiceCreator.tsx` | New |
| `src/components/finance/InvoiceList.tsx` | New |
| `src/pages/VendorW9.tsx` | New — real W-9 form |
| `src/App.tsx` | Add public route |
| `src/components/overview/FinanceContent.tsx` | Add vendors + invoices sections |
| `src/components/artist/FinanceTab.tsx` | Add invoices section |
| `supabase/config.toml` | Register functions |
| `supabase/functions/rolly-chat/index.ts` | Add awareness |

