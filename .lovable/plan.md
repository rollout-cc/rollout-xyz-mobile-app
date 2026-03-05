

## Redesign Team Invite Dialog + BCC All Resend Emails + Fix JobTitleSelect Scroll

### 1. Redesign `InviteMemberDialog` — email-first flow

**File: `src/components/settings/InviteMemberDialog.tsx`**

- Add `email` and `name` (first + last) input fields above Role selector
- On submit: insert into `invite_links` with `invitee_email` and `invitee_name`, then invoke `send-invite-notification` edge function with `{ token, email, team_name, invitee_name, role }`
- Get team name from `useTeams()` hook (already returns team name)
- After success: show confirmation state with "Email sent to X" AND the invite link visible with copy button as fallback ("Didn't get the email? Copy the link")
- If email field is left empty, fall back to link-only generation (current behavior)
- Button text: "Send Invite" when email present, "Generate Link" when empty

### 2. Add BCC to all Resend email calls

Add `bcc: ["accounts@rollout.cc"]` to every Resend API call across all 4 edge functions:

- `supabase/functions/send-invite-notification/index.ts`
- `supabase/functions/send-notification/index.ts`
- `supabase/functions/create-contact-request/index.ts`
- `supabase/functions/send-digest/index.ts`

### 3. Fix `JobTitleSelect` scroll

**File: `src/components/ui/JobTitleSelect.tsx`**

The `ScrollArea` with `max-h-72` doesn't properly scroll when departments expand. Replace with a plain `div` using `max-h-72 overflow-y-auto` which handles dynamic content expansion reliably inside popovers.

### 4. Add `send-invite-notification` to `config.toml`

The function is missing from `supabase/config.toml`. Add it with `verify_jwt = false` so it can be invoked from the client.

