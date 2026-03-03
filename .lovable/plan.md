

# Onboarding Restructure + Finance Tab + Role-Based Landing

## Overview

Three workstreams: (1) merge redundant owner onboarding, (2) build a full Finance tab under Company, (3) restructure invited user onboarding with department-based routing.

---

## 1. Owner Onboarding (`Onboarding.tsx`)

Current: 5 steps (Welcome → Your Info → Company Details → Get Organized → Start with a Task).
New: 7 steps — insert Add Artists (step 4) and Invite Team (step 5) between Company Details and Get Organized.

| Step | Content |
|------|---------|
| 1 | Welcome (unchanged) |
| 2 | Your Info (unchanged) |
| 3 | Company Details (unchanged) |
| 4 | **Add Artists** — reuse `StepAddArtists` (needs teamId from step 3) |
| 5 | **Invite Team** — revised `StepInviteMembers` |
| 6 | Get Organized (unchanged, renumbered) |
| 7 | Start with a Task — "Let's go" sets `onboarding_completed = true` on team |

**Invite step (step 5) changes to `StepInviteMembers.tsx`:**
- Required fields: first name, last name, email or phone, job title
- Optional fields: salary, employment type (W-2/1099), artist access with "All Artists" toggle
- Primary action: "Send Invite" (calls `send-invite-notification` edge function), secondary: "Copy Link"
- Add `invitee_email` and `invitee_phone` columns to `invite_links` table

On step 7 finish, set `onboarding_completed = true` so the Build Your Company wizard is gated.

## 2. Build Your Company → Budget-Only

Strip `CompanyOnboardingWizard.tsx` to just 2 steps: budget setup + completion. Remove company type, profile, artists, and invite steps. Show on Overview only if `onboarding_completed = true` AND `annual_budget` is null/0. Only for team owners (check membership role).

## 3. Finance Tab under Company

Add a fourth pill tab: **Dashboard | Agenda | Staff | Finance**

The Finance tab is a fixed, non-draggable layout with full CRUD capabilities. Unlike the Dashboard's widget grid, this is a structured finance workspace.

### Layout (top to bottom):

**A. Date Range Filter Bar**
Global date range selector (Month / Quarter / YTD / Custom) that filters all sections below.

**B. Financial KPIs** (read-only summary)
- Total Budget, Total Revenue, Total Spending, Net P&L, Burn Rate, Runway (months remaining at current spend pace)
- Reuse `KpiCardsSection` with two new cards for burn rate and runway

**C. Company Expenses** (editable)
- Full ledger of company-level expenses from `company_expenses` table
- Add/edit/delete rows inline (description, amount, date, category, recurring flag)
- Category breakdown subtotals
- CSV export button

**D. Staff Payroll Overview** (editable)
- Table of all staff with employment type, salary/retainer, employer costs
- Inline editing of salary figures
- Total monthly/annual payroll cost

**E. Artist Financial Drill-Down** (expandable, editable)
- Accordion list of all artists, sorted by budget size
- Each artist expands to show their full `transactions` ledger (expenses + revenue)
- Inline add/edit/delete transactions
- Per-artist budget vs actual, category breakdown
- Expense approval: pending expenses show approve/deny buttons (new `approval_status` column on `transactions`)

**F. Quarterly P&L**
- Reuse `QuarterlyPnlSection`, filtered by the global date range

**G. Spending Per Act**
- Reuse `SpendingPerActSection`

**H. Company Budget Settings**
- Inline version of `CompanyBudgetSection` (not in a sheet)

**I. Export**
- "Export to CSV" button that downloads all visible financial data

### Database changes for Finance tab:
- Add `approval_status` column to `transactions` table (text, default 'approved', values: 'pending', 'approved', 'denied')
- Add `approved_by` column to `transactions` (uuid, nullable)
- Add `approved_at` column to `transactions` (timestamptz, nullable)

## 4. Invited User Onboarding (`JoinTeam.tsx`)

Current: auth → profile name → accept invite → done (navigate to /roster).
New: auth → confirm name + photo → personal details → confirm artists → welcome + department routing.

| Step | Content |
|------|---------|
| 1 | Auth (login/signup) — unchanged |
| 2 | Confirm name (pre-filled from invite's `invitee_name`) + optional profile photo upload |
| 3 | Personal details (optional, skippable) — preferred airline, KTN, TSA PreCheck, preferred seat, shirt/pant/shoe size, dietary restrictions |
| 4 | Confirm artist team assignments (read-only list with checkmarks from invite data) |
| 5 | "Welcome to {team}" — "Get Started" routes to department |

**Department routing** (based on `invitee_job_title`):
- A&R, Marketing, Creative Director → `/roster` (A&R Signings tab)
- Finance, Operations → `/overview?tab=finance`
- Manager → `/roster`
- Other/default → `/roster`

### Database changes for invited user:
- Add personal info columns to `profiles`: `preferred_airline`, `ktn_number`, `tsa_precheck_number`, `preferred_seat`, `shirt_size`, `pant_size`, `shoe_size`, `dietary_restrictions`

## 5. Database Migrations (Summary)

**Migration 1 — profiles personal info:**
```sql
ALTER TABLE profiles ADD COLUMN preferred_airline text;
ALTER TABLE profiles ADD COLUMN ktn_number text;
ALTER TABLE profiles ADD COLUMN tsa_precheck_number text;
ALTER TABLE profiles ADD COLUMN preferred_seat text;
ALTER TABLE profiles ADD COLUMN shirt_size text;
ALTER TABLE profiles ADD COLUMN pant_size text;
ALTER TABLE profiles ADD COLUMN shoe_size text;
ALTER TABLE profiles ADD COLUMN dietary_restrictions text;
```

**Migration 2 — invite_links contact info:**
```sql
ALTER TABLE invite_links ADD COLUMN invitee_email text;
ALTER TABLE invite_links ADD COLUMN invitee_phone text;
```

**Migration 3 — transactions approval:**
```sql
ALTER TABLE transactions ADD COLUMN approval_status text NOT NULL DEFAULT 'approved';
ALTER TABLE transactions ADD COLUMN approved_by uuid;
ALTER TABLE transactions ADD COLUMN approved_at timestamptz;
```

## 6. Edge Function: `send-invite-notification`

New edge function that receives `{ token, email?, phone?, team_name, invitee_name }` and sends an email with the invite link (`https://rollout.cc/join/{token}`). Uses Resend for email delivery (will need `RESEND_API_KEY` secret).

## Files to Create
- `supabase/functions/send-invite-notification/index.ts`
- `src/components/overview/FinanceContent.tsx` — Finance tab layout component

## Files to Modify
- `src/pages/Onboarding.tsx` — 5→7 steps, add artists + invite steps, set `onboarding_completed` on finish
- `src/components/onboarding/StepInviteMembers.tsx` — add email/phone required fields, "Send Invite" + "Copy Link", "All Artists" toggle
- `src/components/onboarding/CompanyOnboardingWizard.tsx` — strip to budget-only (2 steps)
- `src/pages/Overview.tsx` — add "finance" tab, render `FinanceContent` when selected, update gate logic
- `src/pages/JoinTeam.tsx` — multi-step onboarding: name+photo, personal details, artist confirm, department routing
- `src/components/overview/BuildYourCompany.tsx` — conditionally show only for owners without budget
- `src/components/overview/KpiCardsSection.tsx` — add burn rate + runway cards
- 3 database migrations

