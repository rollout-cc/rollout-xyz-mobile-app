

# Distribution Wizard Overhaul: Merged Rights & Splits Step + Automated Rights Registration

## What Changes

### 1. Merge Steps 4 & 5 into "Rights & Splits" (6 steps → 5 steps)

The current "Rights" (step 4) and "Approvals" (step 5) become a single step. The contributor grid gets enhanced with PRO affiliation, IPI number, and email fields inline. Below the per-track splits grid, a section shows approval status and a "Send Approval Requests" button. The split project is auto-created when the first contributor is added (no separate "Create Split Project" button).

**New step order**: Tracks → Details → Partners → Rights & Splits → Review

### 2. Enhanced Contributor Grid

Each contributor row in the Rights & Splits step expands to include:
- Name, Role, Master %, Publishing %  *(existing)*
- **PRO Affiliation** (dropdown: BMI, ASCAP, SESAC, GMR, SOCAN, PRS, Other)
- **IPI #** (text input)
- **Email** (for approval requests)

On smaller viewports, the grid collapses to a stacked card layout per contributor.

### 3. Automated Rights Registration (replaces manual toggles)

Replace the current MLC/Copyright toggle cards with an **automated registration section**:
- Once splits are confirmed (all columns total 100%), show a card: "Rollout will register these works with The MLC and your PRO on your behalf"
- User sees a confirmation checkbox: "I authorize Rollout to register these works"
- Status indicators: "Pending Confirmation → Registering → Registered" (for now, status stays at "Pending Confirmation" since backend registration is future work)
- Remove the external links to MLC/Copyright Office — Rollout handles it

### 4. Splits Tab on Artist Profile Stays Editable

Keep the `SplitsTab` and `SplitSongEditor` as-is — inline editing remains. The wizard auto-creates split projects that appear here. No changes to the artist profile splits tab.

### 5. PRO/MLC Source Connectors in Settings

Add a "Connections" tab to Profile Settings with cards for BMI, ASCAP, SESAC, SoundExchange, and The MLC. Each shows connect status and an account email field. This is UI-only for now (stores intent in a new `pro_connections` table).

---

## Technical Details

### Database Migration

```sql
-- PRO source connections
CREATE TABLE public.pro_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  source text NOT NULL, -- 'bmi','ascap','sesac','soundexchange','mlc'
  account_email text,
  status text NOT NULL DEFAULT 'pending',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pro_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team owners manage pro connections" ON public.pro_connections
  FOR ALL TO authenticated
  USING (is_team_owner_or_manager(team_id))
  WITH CHECK (is_team_owner_or_manager(team_id));
CREATE POLICY "Team members view pro connections" ON public.pro_connections
  FOR SELECT TO authenticated
  USING (is_team_member(team_id));
```

### Files Modified
- `ReleaseWizard.tsx` — 5 steps, remove StepSplitApproval import, merge approval logic into step 3
- `StepRightsRegistration.tsx` — add PRO/IPI/email columns, inline approval section, replace MLC/Copyright toggles with automated registration UI, auto-create split project
- `StepReview.tsx` — update step numbering references
- `Settings.tsx` — add "Connections" tab

### Files Created
- `src/components/settings/ProConnectionsTab.tsx` — PRO/MLC connector cards

### Files Deleted
- `src/components/distribution/StepSplitApproval.tsx` — merged into StepRightsRegistration

