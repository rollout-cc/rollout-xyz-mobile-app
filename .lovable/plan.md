

## Plan: 5 Changes

### 1. Fix email flag icon
The `flagUrl` in `_styles.ts`, `send-notification`, `send-digest`, and `send-invite-notification` references a broken Supabase storage URL. Copy the uploaded `Rollout_Mobile_App_Icon.png` to `public/rollout-flag.png` and update all 4 files to use `https://app.rollout.cc/rollout-flag.png`.

### 2. Dummy budgets and tasks for 4 new artists
Query artist IDs for Cigarettes After Sex, Promise Ring, EARTHGANG, and Colin via database read, then insert 2-3 budget categories and 3-4 tasks per artist using the insert tool.

### 3. Revenue and Spent on Artist Card
Update `ArtistCard.tsx` to show two `$` indicators:
- Green `$` with revenue total (transactions where `type === "revenue"`)
- Red `$` with spent total (transactions where `type === "expense"`)

The `useArtists` hook already fetches `transactions(amount, type)`.

### 4. Sub-budgets system
**Database migration**: Create `sub_budgets` table and add `sub_budget_id` to `transactions`:

```sql
CREATE TABLE public.sub_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sub_budgets ENABLE ROW LEVEL SECURITY;
-- RLS: same pattern as budgets (via get_artist_team_id on parent budget)

ALTER TABLE public.transactions ADD COLUMN sub_budget_id uuid REFERENCES public.sub_budgets(id) ON DELETE SET NULL;
```

**UI in `BudgetSection.tsx`**:
- On hover of a budget card, show a `+` icon (alongside delete) to create a sub-budget
- Inline form: label + amount; validation ensures sub-budget sum does not exceed parent; if it does, parent budget auto-increases
- Sub-budgets render as a collapsible list within the parent card (collapsed by default). When expanded: show sub-budget name, amount, and linked transactions
- Delete sub-budget via hover trash icon

**UI in `FinanceTab.tsx` and `FinanceLedger.tsx`**:
- When a budget category is selected in transaction forms, show an optional sub-budget dropdown populated from `sub_budgets` for that budget
- Display sub-budget label as a secondary badge on ledger rows

### 5. Sub-budgets in task `$` trigger (WorkTab)
Update the `$` trigger in `WorkTab.tsx` `TaskItem` to show a two-level picker:
- First level: budget categories (existing behavior)
- When a budget is selected and it has sub-budgets, show an arrow `>` next to it revealing sub-budgets
- Selecting a sub-budget stores `sub_budget_id` on the task's linked transaction
- The `parseAndSubmit` function and `addTask` mutation pass `sub_budget_id` through to the transaction insert

This requires:
- Fetching `sub_budgets` alongside `budgets` in WorkTab
- Updating the `$` trigger items to include sub-budget entries with a visual hierarchy (indented or with parent label prefix)
- Passing `sub_budget_id` into the transaction insert in `addTask.mutationFn`

### Files to modify

| File | Change |
|---|---|
| `public/rollout-flag.png` | Copy uploaded PNG |
| `supabase/functions/_shared/email-templates/_styles.ts` | Update `flagUrl` |
| `supabase/functions/send-notification/index.ts` | Update `flagUrl` |
| `supabase/functions/send-digest/index.ts` | Update `flagUrl` |
| `supabase/functions/send-invite-notification/index.ts` | Update `flagUrl` |
| DB migration | Create `sub_budgets` table, add `sub_budget_id` to `transactions` |
| DB insert | Dummy budgets + tasks for 4 artists |
| `src/components/roster/ArtistCard.tsx` | Add green/red revenue/spent indicators |
| `src/components/artist/BudgetSection.tsx` | Sub-budget CRUD, collapsible display, auto-parent-resize |
| `src/components/artist/FinanceTab.tsx` | Sub-budget dropdown in transaction form + badge |
| `src/components/artist/FinanceLedger.tsx` | Sub-budget dropdown + badge |
| `src/components/artist/WorkTab.tsx` | Two-level `$` trigger with sub-budgets, pass `sub_budget_id` to transaction |

