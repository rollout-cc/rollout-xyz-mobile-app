

# Admin Console UX Overhaul + Ownership Transfer Notifications

## Summary

Three changes: (1) replace all UUID inputs with searchable dropdowns, (2) streamline Create User to auto-create team+trial when role is Owner, (3) send email + in-app notification when ownership is transferred.

---

## 1. Searchable Dropdowns — Replace All UUID Inputs

Add two new actions to the `admin-actions` edge function: `list_users` and `list_teams`. These return `[{id, label}]` arrays (name + email for users, team name for teams).

In `Admin.tsx`, replace every UUID `<Input>` with a Combobox (Popover + Command pattern) that searches by name. The UUID is stored internally but never shown to the admin.

**Affected fields:**
- Create Team → "Owner" (search users by name/email)
- Grant Trial → "Team" (search teams by name)
- Transfer Ownership → "Team" and "New Owner" (search both)
- Support Access → "Team" (search teams by name)

**Success messages** will show human names instead of UUIDs.

---

## 2. Streamlined Create User Flow

Add a **Role** dropdown to the Create User form with options: Owner, Manager, Artist, Guest.

When "Owner" is selected, show an inline **Team Name** field and a **Trial Days** field (default 30).

On submit, the backend `create_user` action will:
1. Create the auth user
2. If `team_name` is provided: create team, add membership as `team_owner` with all permissions, grant trial
3. Return `{ user_id, email, full_name, team_name }` — no UUIDs in the toast

This mirrors the existing onboarding flow but driven by the admin.

---

## 3. Ownership Transfer Email + In-App Pop-up

When the admin initiates a transfer via the `initiate_transfer` action:

**Email**: The edge function sends a branded email (via Resend, same pattern as `send-notification`) to the new owner with:
- Subject: "You've been given ownership of [Team Name] on Rollout"
- Body: explains they're now the owner, Rollout cannot access their data without consent, and a CTA button linking to `/accept-ownership/{token}`

**In-app notification**: Add a `pending_ownership_transfers` check to the authenticated app shell. When a user logs in and has a pending transfer for their `user_id`, show a prominent banner/dialog that:
- Explains they've been given ownership
- Shows the same privacy acknowledgment as the AcceptOwnership page
- Lets them accept inline (calls `accept_transfer`) or click through to the full page

This ensures the new owner sees it both via email and the next time they open Rollout.

---

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/admin-actions/index.ts` | Add `list_users`, `list_teams` actions; extend `create_user` to accept `role`, `team_name`, `trial_days`; add email send on `initiate_transfer` via Resend |
| `src/pages/Admin.tsx` | Replace all UUID inputs with searchable Combobox; add Role + Team Name fields to Create User; update success toasts to show names |
| `src/components/OwnershipTransferBanner.tsx` | New component — checks for pending transfers on mount, shows a dialog/banner with accept flow |
| `src/App.tsx` | Render `<OwnershipTransferBanner />` in the authenticated layout alongside `<FeedbackWidget />` |

---

## Technical Details

**Combobox pattern**: Uses existing shadcn `Popover` + `Command` components. On open, calls `adminAction("list_users")` or `adminAction("list_teams")`. Filters client-side. Displays `Name (email)` or team name. Stores UUID internally.

**Email sending**: The `initiate_transfer` action in the edge function will look up the recipient's email from `auth.admin.getUserById()`, then POST to Resend API using the existing `RESEND_API_KEY` secret. Uses the same branded flat-beige template style as other Rollout emails.

**In-app banner**: `OwnershipTransferBanner` queries `team_ownership_transfers` where `to_user_id = auth.uid()` and `status = 'pending'`. If found, renders a full-screen dialog (not dismissable) with the accept flow. After accepting, the dialog closes and the page refreshes.

