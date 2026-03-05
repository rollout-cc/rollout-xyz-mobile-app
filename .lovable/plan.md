

## Natural Language Revenue Parsing in Task Creation

### What it does

When a user types something like **"send invoice to Nike for $5,000"** in the work item creator, the system will:

1. Detect revenue intent from keywords ("send invoice", "request payment", "collect payment", "bill", etc.)
2. Extract the dollar amount ($5,000) as **revenue** instead of an expense
3. Extract the revenue source from "to [source]" (e.g., "Nike")
4. Create the task as normal
5. Auto-create a **revenue transaction** in the finance ledger with the source as the description, defaulting to uncategorized

### Database Changes

**Migration: Add `revenue_category` and `revenue_source` columns to `transactions`**

```sql
ALTER TABLE public.transactions
  ADD COLUMN revenue_category text,
  ADD COLUMN revenue_source text;
```

- `revenue_category`: one of `show_fee`, `brand_deal`, `feature`, `royalty`, `sync`, `other`, or null (uncategorized)
- `revenue_source`: free text like "Nike", "Live Nation", etc., extracted from "to [source]" in the task title

No enum constraint -- enforced in UI. Keeps it flexible.

### New Utility: `parseRevenueIntent` (in `src/lib/revenueParser.ts`)

A pure function that analyzes task title text and returns parsed revenue metadata:

```typescript
interface RevenueParseResult {
  isRevenue: boolean;
  amount: number | null;
  source: string | null;  // extracted from "to [source]"
  cleanTitle: string;     // title with amount removed
}

function parseRevenueIntent(text: string): RevenueParseResult
```

**Revenue trigger phrases** (case-insensitive):
- "send invoice", "invoice"
- "request payment", "collect payment"
- "bill" (as verb, e.g., "bill Nike")
- "charge"

**Parsing logic:**
1. Check if title contains any revenue trigger phrase
2. Extract `$X,XXX` amount using existing dollar regex
3. Extract source: look for "to [word(s)]" after the trigger phrase, stopping at "for", "$", or end of string
   - "send invoice **to Nike** for $5,000" -> source = "Nike"
   - "invoice **to Live Nation** $10,000" -> source = "Live Nation"
4. Return cleaned title (without the dollar amount, keeping the rest readable)

### Changes to `MyWork.tsx` createTask mutation

Currently, when `expenseAmount` is set and an artist + budget are selected, it creates an expense transaction. The new flow:

1. Before submit, run `parseRevenueIntent(title)` on the final title
2. If `isRevenue === true` and an amount is detected:
   - Store the amount but mark it as revenue (new state: `revenueMode`)
   - The `$` trigger still fires for budget selection on expenses, but if revenue mode is active, **skip the budget picker** -- revenue doesn't need a budget
   - On submit, create a transaction with `type: "revenue"`, `revenue_source: source`, `revenue_category: null` (uncategorized), no `budget_id`
3. If `isRevenue === false`, existing expense flow remains unchanged
4. Show a green "Revenue" pill (instead of the red expense pill) in the metadata area when revenue is detected

### Changes to `WorkItemCreator` / `ItemEditor`

- Add an `onRevenueDetected` callback prop to `WorkItemCreator`
- The parsing happens in `MyWork.tsx` (and `TasksTab.tsx`) as the title changes, similar to how date detection works
- When revenue is detected, the metadata pills show a green revenue indicator with the source name

### Changes to `TasksTab.tsx` (artist-level task creation)

Same parsing logic applied. Since artist context is already known, the revenue transaction auto-links to that artist. The user can later go to Finance tab to assign a revenue category.

### Changes to `FinanceLedger.tsx`

- When `type === "revenue"`, show `revenue_source` as a subtitle/tag on the transaction row
- Add a revenue category picker dropdown (Show Fee, Brand Deal, Feature, Royalty, Sync, Other) for revenue entries instead of the budget dropdown
- Existing "uncategorized" revenue entries show a subtle prompt to categorize

### Files to create/modify

| File | Change |
|------|--------|
| **Migration** | Add `revenue_category` and `revenue_source` to `transactions` |
| `src/lib/revenueParser.ts` | **New** -- `parseRevenueIntent()` function |
| `src/pages/MyWork.tsx` | Add revenue detection in `createTask`, update `$` trigger to skip budget for revenue, add revenue pills |
| `src/components/artist/TasksTab.tsx` | Same revenue detection in `addTask` mutation |
| `src/components/work/WorkItemCreator.tsx` | Add `revenueMode` prop for pill styling (green vs red) |
| `src/components/artist/FinanceLedger.tsx` | Revenue category picker, show `revenue_source` on revenue rows |
| `src/hooks/useArtists.ts` | Add `revenue_category`, `revenue_source` to transactions select |
| `src/components/roster/ArtistCard.tsx` | Revenue view shows breakdown by `revenue_category` |

