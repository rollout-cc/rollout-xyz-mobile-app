

## Plan: Wire Feature Gates + Free 30-Day Trial for All New Users

### Key Change: Trial Logic

Currently, the `check-subscription` function returns `rising` (no trial) when there's no Stripe subscription. We need to change this so **every new team gets a 30-day free trial with full (Icon-level) access**, tracked via `trial_ends_at` on the `team_subscriptions` table. After 30 days, access drops to Rising limits. Users can restore access by subscribing.

### Changes

#### 1. Database Migration
- Update the `handle_new_team_subscription` trigger to set `trial_ends_at = now() + 30 days` and `status = 'trialing'` when creating the default subscription row for new teams.

#### 2. Update `check-subscription` Edge Function
- When no Stripe subscription exists, check `team_subscriptions.trial_ends_at`. If it's in the future, return `plan: "icon"`, `is_trialing: true`, `trial_days_left`, `seat_limit: 5` (default trial tier). If expired, return `rising` as before.

#### 3. Update `useTeamPlan` Hook
- Treat `isTrialing === true` the same as `isPaid` for feature access (full unlock during trial). The existing `isPaid` logic becomes: `isPaid = plan === "icon" || plan === "legend"` which already covers trialing since check-subscription will return `plan: "icon"` during trial.

#### 4. Update Settings Page
- Show Team/Billing tabs during trial (since `isPaid` will be true during trial).
- Show a trial banner/badge in the Plan tab indicating days remaining.

#### 5. Wire Feature Gates (6 locations)

| Location | Gate | Behavior When Blocked |
|----------|------|-----------------------|
| **Roster.tsx** — Add Artist | `limits.maxArtists` vs current count | Show UpgradeDialog |
| **ARContent.tsx** — Add Prospect | `limits.maxProspects` vs current count | Show UpgradeDialog |
| **TasksTab.tsx** — Add Task | `limits.maxTasksPerMonth` vs monthly count | Show UpgradeDialog |
| **SplitsTab.tsx** — whole tab | `limits.canUseSplits` | Show upgrade prompt instead of content |
| **FinanceTab.tsx** — whole tab | `limits.canUseFinance` | Show upgrade prompt instead of content |
| **InviteMemberDialog.tsx** — invite | `limits.canInviteMembers` + seat count | Show UpgradeDialog |

Each gate checks `useTeamPlan()` and conditionally opens the existing `UpgradeDialog` with a relevant `feature` string.

#### 6. Trial Banner Component
- Small banner in AppLayout or PlanTab: "You have X days left in your free trial" with an "Upgrade" button.

### Files to Create/Modify
- `supabase/migrations/` — new migration to update trigger
- `supabase/functions/check-subscription/index.ts` — add trial logic
- `src/hooks/useTeamPlan.ts` — minor: trial = full access
- `src/pages/Roster.tsx` — artist count gate
- `src/components/ar/ARContent.tsx` — prospect count gate  
- `src/components/artist/TasksTab.tsx` — monthly task gate
- `src/components/artist/SplitsTab.tsx` — canUseSplits gate
- `src/components/artist/FinanceTab.tsx` — canUseFinance gate
- `src/components/settings/InviteMemberDialog.tsx` — canInviteMembers + seat gate
- `src/components/settings/PlanTab.tsx` — trial banner
- `src/pages/ArtistDetail.tsx` — hide Finance/Splits nav items when gated

