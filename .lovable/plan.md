

# Implementation Plan — 5 Changes

## 1. Goals Banner: Add "% progress" label
**File**: `src/pages/ArtistDetail.tsx` line 210
Change `(${Math.round(progress)}%)` → `(${Math.round(progress)}% progress)`
Same for line 214 (no-current-value case).

## 2. Pants Size → SelectField with men's + women's sizes
**File**: `src/components/artist/ArtistInfoTab.tsx` line 246
Replace `Field` with `SelectField` using combined options:
- Men's: `"28x28"` through `"40x34"` (common combos)
- Women's: `"00"`, `"0"`, `"2"`, `"4"`, `"6"`, `"8"`, `"10"`, `"12"`, `"14"`, `"16"`, `"18"`, `"20"`
- Plus explicit waist-only: `"24"`, `"25"`, `"26"`, `"27"`, `"28"`, `"29"`, `"30"`, `"32"`, `"34"`, `"36"`, `"38"`, `"40"`

## 3. Seed clothing_brands table
**Method**: Use the insert tool to run a single `INSERT INTO clothing_brands (name) VALUES (...) ON CONFLICT (name) DO NOTHING` with all ~120 brands from the user's list across Streetwear, Luxury, Bridge, and Heritage tiers.

No code changes needed — `BrandTagInput` already queries this table.

## 4. Date Parsing in WorkTaskItem
**File**: `src/components/work/WorkTaskItem.tsx`
- Add `parsedDate` state: `const [parsedDate, setParsedDate] = useState<Date | null>(null);`
- Pass to `ItemEditor`: `enableDateDetection={true} onDateParsed={setParsedDate} parsedDate={parsedDate}`
- In `parseAndSubmit()`: if no `due_date` was parsed from text but `parsedDate` is set, use `formatLocalDate(parsedDate)` as `due_date`
- Reset `parsedDate` on cancel and after submit
- The existing `parseDateFromText` in `utils.ts` already handles "next friday", "August 6", day names, etc.

## 5. Budget ($) Trigger — Type amount, pick source budget
**File**: `src/components/work/WorkTaskItem.tsx`

**Trigger display change** (line 192-221):
- Show budget names as categories: `"Marketing ($25,000)"`, `"Production ($15,000)"`
- `onSelect`: Instead of replacing user's `$amount` with the budget's amount, preserve the user's typed number and append `[BudgetLabel]`. E.g., user types `$150`, selects "Marketing" → text becomes `…$150 [Marketing] `

**Parse change** (line 340-355):
- After extracting `$amount`, also look for `[BudgetName]` pattern in the title
- Match `BudgetName` against `budgets` by label to resolve `budget_id`
- Strip the `[BudgetName]` from the final title
- If no `[...]` bracket found, fall back to current amount-matching logic

**Finance tracking** (line 250-261):
- Already inserts a transaction when `expense_amount && artistId` — this is correct
- Add `queryClient.invalidateQueries({ queryKey: ["artists-summary"] })` to `onSuccess` of `addTask` to ensure company finance dashboards update
- The transaction insert already links `budget_id`, `initiative_id`, and `task_id`

