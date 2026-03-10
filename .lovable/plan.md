

# Full Platform Audit: Bugs & Paradoxes

## Critical Bugs (will break user flows)

### Bug E: `getClaims` does not exist — check-subscription crashes on every load
**Severity**: CRITICAL (blank screen, current runtime error)
**Files**: `supabase/functions/check-subscription/index.ts`, `supabase/functions/scrape-chartmasters/index.ts`

The previous fix changed `getUser(token)` to `getClaims(token)`, but `getClaims` is not a method on `@supabase/supabase-js@2.49.1`. The runtime error confirms: `"anonClient.auth.getClaims is not a function"`.

**Fix**: Revert to `getUser()` (no argument — called on the anon client that already has the Authorization header set). This is the pattern that works across all other edge functions (accept-invite, rolly-chat, etc.):
```typescript
const { data: { user }, error: userError } = await anonClient.auth.getUser();
```
If `getUser()` fails (e.g. ES256 token mismatch), return the default "rising" plan gracefully instead of crashing. Apply the same fix to `scrape-chartmasters/index.ts`.

### Bug F: JoinTeam Google OAuth uses wrong pattern on custom domain
**Severity**: HIGH (Google sign-in broken on invite page at app.rollout.cc)
**File**: `src/pages/JoinTeam.tsx` (lines 150-171)

The `handleGoogleLogin` in JoinTeam still has the old conditional logic that calls `supabase.auth.signInWithOAuth` directly on custom domains — the exact pattern that was just fixed in Login.tsx. Since the Supabase project has no OAuth secrets, this will fail with the same error the user reported.

**Fix**: Use `lovable.auth.signInWithOAuth("google", { redirect_uri: ... })` unconditionally, matching the Login.tsx fix. Also add Apple sign-in option (currently missing from invite flow).

### Bug G: JoinTeam signup may not auto-confirm, blocking invite acceptance
**Severity**: HIGH
**File**: `src/pages/JoinTeam.tsx`

When a new user signs up via the invite page with email/password, they may need to verify their email before they can proceed. But there's no messaging or flow for this — after signup the auth state change triggers `acceptInvite()` immediately. If auto-confirm is disabled, the user object will exist but their session may be unconfirmed, causing the accept-invite edge function to fail or the user to be stuck.

**Fix**: After signup, show a "Check your email to verify" message and pause the accept flow until they're fully authenticated. Or handle the case where `user` exists but session is not confirmed.

---

## Significant Bugs (data integrity / UX)

### Bug A (previously identified): FinanceTab doesn't set `budget_id` on transactions
Still needs fixing per the prior plan.

### Bug B (previously identified): Query key mismatch across finance components
Still needs fixing per the prior plan.

### Bug C (previously identified): FinanceTab mutations don't refresh budget queries
Still needs fixing per the prior plan.

### Bug H: `invite_links.used_at` cannot be updated — no UPDATE RLS policy
**Severity**: MEDIUM
**File**: Database RLS on `invite_links`

The invite_links table has no UPDATE policy. The `accept-invite` edge function uses the service role, so this works. However, if any client-side code tries to update invite_links, it will silently fail. Currently not broken because accept-invite uses service role, but worth noting.

### Bug I: TrialWelcomeDialog forwardRef warnings
**Severity**: LOW (console noise only)
**File**: `src/components/billing/TrialWelcomeDialog.tsx`

`Dialog` and `UpgradeDialog` are function components that can't receive refs. The warning is caused by React trying to attach refs to them.

**Fix**: Remove the unused `UpgradeDialog` render (line 128) since `upgradeOpen` is never set to `true` — `setUpgradeOpen` is defined but never called. Removing `<UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />` eliminates the warning.

### Bug J: Links query depends on `folders` but fires before folders load
**Severity**: MEDIUM (links may appear empty briefly)
**File**: `src/components/artist/LinksTab.tsx` (lines 42-58)

The `artist_links` query uses `folders.map((f) => f.id)` in its query function, but `enabled: folders !== undefined` is always true since `folders` defaults to `[]`. When folders is empty array, the `.in("folder_id", [])` query returns nothing, so folder-linked links are missed on first render. They appear after folders load and the query refetches.

**Fix**: Add `folders.length > 0` to the enabled condition, or restructure the query to not depend on folder IDs (query by artist_id directly with a join or two separate queries).

### Bug K: SMS notifications are configured in preferences but never sent
**Severity**: MEDIUM (feature gap)
**Files**: `notification_preferences` table has `_sms` columns, but `send-notification/index.ts` only sends via Resend (email). No SMS provider (Twilio, etc.) is integrated.

**Fix**: Either remove SMS toggle options from the notification settings UI to avoid user confusion, or document that SMS is a future feature. Currently the toggles suggest SMS works but nothing happens.

---

## Minor Issues

### Issue L: Password reset redirect doesn't go to a reset page
**File**: `src/pages/Login.tsx` line 67
`redirectTo: window.location.origin` sends users back to root, not a `/reset-password` page. Without that page, users are auto-logged-in without actually resetting their password.

**Fix**: Create a `/reset-password` route, or change `redirectTo` to `${window.location.origin}/reset-password`.

### Issue M: Public timeline/agenda queries may fail for unauthenticated users
**Files**: `PublicTimeline.tsx`, `PublicAgenda.tsx`

These pages query tables like `teams`, `tasks`, `transactions`, `budgets` using the anon client. RLS policies on these tables require `is_team_member()` or `has_artist_access()`, which need `auth.uid()`. Unauthenticated visitors will get empty results for teams query (line 22-26 in PublicTimeline.tsx) and transactions/tasks (PublicAgenda.tsx lines 33-38).

The `artists` table has public SELECT policies for `agenda_is_public` and `timeline_is_public`, so the artist query works. But `teams`, `tasks`, `transactions`, and `budgets` require authentication. The `budgets` table has a public policy for `agenda_is_public` artists, so budgets work. Tasks and transactions do NOT have public agenda policies — so the PublicAgenda page will show 0 tasks and $0 spending for unauthenticated visitors.

**Fix**: Add SELECT RLS policies on `tasks` and `transactions` for public agenda access, similar to the budgets policy: `EXISTS (SELECT 1 FROM artists a WHERE a.id = tasks.artist_id AND a.agenda_is_public = true)`.

---

## Implementation Order

1. **Bug E** — Fix `getClaims` crash in check-subscription and scrape-chartmasters (CRITICAL — app is currently broken)
2. **Bug F** — Fix JoinTeam Google OAuth to use lovable.auth
3. **Bug I** — Remove unused UpgradeDialog render in TrialWelcomeDialog
4. **Bugs A/B/C** — Finance data sync fixes (from prior plan)
5. **Bug J** — Fix links query timing
6. **Issue M** — Add public RLS policies for tasks/transactions on public agendas
7. **Issue L** — Add /reset-password route
8. **Bug K** — Remove SMS toggles or add "coming soon" label
9. **Bug G** — Handle unconfirmed signups on invite page
10. **Purge seed data** (from prior plan)

