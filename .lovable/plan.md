

## Plan: Fix two bugs

### Bug 1: Sub-budget form opens for all budget cards
The `+` button correctly sets `addingSubBudget` to a single budget ID, but the sub-budget form rendering depends on `isExpanded` being true (line 332). When clicking `+`, it also expands that budget. However, looking at the screenshot, the sub-budget form appears to render directly inside the card body rather than only in the expanded section. The fix: move the sub-budget inline form so it renders when `isAddingSub` is true regardless of the expanded state, but **outside** the expanded subs list. This ensures only the clicked card shows the form. Also, the current condition `isExpanded && (subs.length > 0 || isAddingSub)` can cause the form to not appear if the card isn't expanded. Change to always show the form when `isAddingSub` is true for that specific card.

**File**: `src/components/artist/BudgetSection.tsx`
- Separate the add-sub-budget form from the expanded subs section
- Render it conditionally based only on `isAddingSub` (which already checks `addingSubBudget === b.id`)
- Keep the expanded section purely for displaying existing sub-budgets

### Bug 2: Revenue/Spent showing $0 on artist cards
The `ArtistCard.tsx` code correctly reads `artist.transactions` and calculates revenue/spending. The `useArtists` hook fetches `transactions(amount, type)`. The dummy transactions were inserted via SQL but the query cache may not have refreshed. Additionally, the transactions query uses a relation through `artist_id` — need to verify the inserted transactions have the correct `artist_id` values. The most likely cause: the transactions were inserted but the page data wasn't refetched. A simple page refresh should show the data. No code change needed for this — but I'll verify the data is present.

### Files to modify

| File | Change |
|---|---|
| `src/components/artist/BudgetSection.tsx` | Fix sub-budget form to only render for the specific clicked budget card |

