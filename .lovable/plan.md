

## Plan: Show All Features, Gate on Click with Upgrade Prompt

**Goal**: All features (Finance, Splits, Invite Members, Permissions) are always visible in the UI. Free/Rising users who click them get an upgrade dialog instead of the feature content.

### Changes

**1. `src/pages/ArtistDetail.tsx`**
- Always include Finance in `actionButtons` (remove `canUseFinance` conditional on line 147)
- Always include "splits" in `tabItems` (remove `canUseSplits` conditional on line 155)
- Add `upgradeOpen` + `upgradeFeature` state
- Intercept clicks on Finance and Splits when user lacks access — open UpgradeDialog instead of switching view
- Render one `<UpgradeDialog>` at bottom of component

**2. `src/components/artist/SplitsTab.tsx`**
- Remove the internal `useTeamPlan` gate (lines 24-42) that shows an inline upgrade prompt. Parent now handles gating, so this component only renders for paid users.

**3. `src/components/artist/FinanceTab.tsx`**
- Remove the internal `useTeamPlan` gate (lines 50-73). Same reasoning — parent intercepts the click.

**4. `src/pages/Overview.tsx`**
- On the company Finance tab click (line 440), intercept if `!limits.canUseFinance` and show UpgradeDialog instead of navigating to the finance tab content.

**5. `src/components/settings/InviteMemberDialog.tsx`**
- Already uses click-intercept pattern. No change needed.

### UX Flow
1. Free user sees Finance button, Splits tab, etc. — identical to a paid user
2. Clicking a gated feature opens the UpgradeDialog: "Finance tools are available on the Icon plan"
3. Paid users experience zero change

