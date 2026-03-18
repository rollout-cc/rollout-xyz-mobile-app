

# Implementation Plan — 5 Refined Changes

## 1. Goals Banner — Clean Text + Amber Progress Bar
**File**: `src/pages/ArtistDetail.tsx` (lines 197-218)
- Simplify `getObjectiveSummary()` to return ONLY `"138.7K → 500K (27% progress)"` — no label prefix, no colon, no "Goal" word.

**File**: `src/components/artist/ObjectiveKpiCard.tsx` (line 298)
- Change `"bg-primary"` to `"bg-amber-400"` for the progress bar fill color.

## 2. Clothing Brands — Seed from Blue in Green + User's List
**Method**: Database migration to INSERT ~70 brands from blueingreensoho.com (Kapital, Needles, orSlow, Engineered Garments, Pure Blue Japan, etc.) using `ON CONFLICT (name) DO NOTHING`. No code changes needed.

## 3. Task Editor — Parsed Metadata Replaces Icons in Toolbar

**Current**: `ItemEditor` strips date text from input (line 107: `onChange(parsed.title)`). Parsed date renders as a chip inline next to the input. Toolbar shows static icons (Calendar, User, $, #).

**New behavior**:
- **ItemEditor.tsx** (line 107): Remove `onChange(parsed.title)` — keep sentence intact, only call `onDateParsed(parsed.date)`.
- **ItemEditor.tsx** (lines 195-197): Remove the inline `DateChip` from next to the input.
- **WorkTaskItem.tsx** (lines 487-494): In the toolbar row, replace each icon with a filled chip when its metadata is set:
  - Calendar icon → when `parsedDate` is set, show a clickable chip like `"Mar 27"` in its place. Clicking opens date re-entry.
  - User icon → when `@name` is detected in text, show assignee name chip replacing the User icon.
  - $ icon → when `$amount [Budget]` is detected, show `"$150 Marketing"` chip replacing the $ icon.
  - # icon → when `#campaign` is detected, show campaign name chip replacing the # icon.
- Add state tracking for `parsedAssignee` and `parsedBudget` and `parsedCampaign` alongside existing `parsedDate`.
- Each chip has an X to clear and revert to the icon. Clicking the chip focuses the input with the trigger character appended.
- Apply same inline detection logic: when `@name` matches a team member, set `parsedAssignee` state. When `$amount [label]` detected, set `parsedBudget`. When `#campaign` detected, set `parsedCampaign`.
- `parseAndSubmit()` uses these states for the final values, stripping parsed tokens from the title at save time only.

## 4. Objectives Panel — Goal Types + Notes Only

**File**: `src/components/artist/ObjectiveKpiCard.tsx` (lines 9-14)
- Add two new objective types to `OBJECTIVE_TYPES`:
  - `{ value: "merch_revenue", label: "Merch Revenue", icon: DollarSign, unit: "$" }`
  - `{ value: "gross_revenue", label: "Gross Revenue", icon: DollarSign, unit: "$" }`

**File**: `src/pages/ArtistDetail.tsx` (lines 611-655)
- Remove the `textFields` array with Primary/Secondary Goal/Focus.
- Replace with a single notes section: one `InlineField` per objective slot (using `primary_goal` and `secondary_goal` columns). Label as "Notes" under each objective card.
- The ObjectiveKpiCard picker (banner "Set Goal") already renders `OBJECTIVE_TYPES` — the new types will appear automatically.

## 5. Budget Pill — Show Remaining on Hover (Content Swap)

**File**: `src/pages/ArtistDetail.tsx` (lines 443-456)
- Add state: `const [budgetHover, setBudgetHover] = useState(false)`
- Query total expenses for artist (reuse `useQuery` for `transactions` with `type: "expense"`)
- On the budget `<div>`, add `onMouseEnter` / `onMouseLeave` to toggle `budgetHover`
- When `budgetHover === false`: show current content ("Budget" label + `$90K`)
- When `budgetHover === true`: swap content to show "Remaining" label + `$X` (totalBudget - totalSpent), same styling
- No tooltip — the box content itself changes on hover

