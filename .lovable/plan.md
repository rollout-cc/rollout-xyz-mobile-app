

# Proactive Rolly Nudge System — All 5 Features

## Overview
Build a floating pill component (`RollyNudge`) that surfaces contextual, AI-powered nudges throughout the app. Combine this with the 4 split/metadata improvements (publisher %, contributor sync, PDF export, SoundExchange fields) and contextual split warnings.

---

## Architecture

```text
┌─────────────────────────────────────┐
│  rolly-nudge edge function          │
│  Input: { screen, data_snapshot }   │
│  → queries rolly_knowledge          │
│  → gemini-2.5-flash-lite response   │
│  → returns { nudge, cta_prompt }    │
└──────────────┬──────────────────────┘
               │
   ┌───────────▼───────────┐
   │  useRollyNudge hook   │
   │  - calls edge fn      │
   │  - caches per session  │
   │  - dismiss state       │
   └───────────┬───────────┘
               │
   ┌───────────▼───────────────────────┐
   │  RollyNudge (floating pill)       │
   │  - Rolly icon + short text        │
   │  - dismiss (X) button             │
   │  - click → opens Rolly FAB chat   │
   │    with pre-filled prompt         │
   │  - fixed bottom-left, above nav   │
   │  - animate in/out with framer     │
   └───────────────────────────────────┘
```

---

## Feature 1: Contextual Split Warnings (client-side, no AI)

Add warning pills below the totals row in `SplitSongEditor.tsx`:
- Amber: percentages != 100%
- Red: contributors missing PRO affiliation
- Info: no publisher listed

Pure client-side — checks entry data + contributor PRO fields. No edge function call.

## Feature 2: Publisher % Column

- **Migration**: `ALTER TABLE split_entries ADD COLUMN publisher_pct numeric;`
- Update `SplitSongEditor` grid to 7 columns, add Publisher % input + total
- Add "Mirror from Writer %" button that copies writer_pct values
- Update `useSplits.ts` hooks

## Feature 3: Contributor ↔ Band Member Sync

- **Migration**: `ALTER TABLE split_contributors ADD COLUMN publisher_name text;`
- In `SplitSongEditor`, query `artist_travel_info` for the artist and show band members in suggestions alongside existing contributors
- On selection, auto-fill PRO/IPI/publisher fields on the contributor record

## Feature 4: Split Sheet PDF Export

- New `src/lib/splitSheetPdf.ts` — generates a print-ready HTML document opened via `window.open()` with `window.print()`
- Includes: project name, song titles, contributor tables, PRO/IPI, all % columns, signature lines
- "Download PDF" button added to `SplitProjectCard.tsx`

## Feature 5: Proactive Rolly Nudges (floating pill)

### New files
- **`supabase/functions/rolly-nudge/index.ts`** — accepts `{ screen, data_snapshot, team_id }`, searches `rolly_knowledge` for relevant entries, calls AI gateway with `gemini-2.5-flash-lite` to generate a single short nudge (max 100 chars) + a CTA prompt string. Cached server-side isn't needed — client handles caching.
- **`src/hooks/useRollyNudge.ts`** — calls the edge function, caches result in `sessionStorage` keyed by `screen:entityId`, returns `{ nudge, ctaPrompt, dismiss, dismissed }`. Debounced — only fires after 2s on screen.
- **`src/components/rolly/RollyNudge.tsx`** — floating pill component:
  - Fixed position bottom-left (desktop) or above bottom nav (mobile)
  - Rolly icon + nudge text + X dismiss button
  - Framer Motion slide-in from left
  - On click → sets a global state/event that opens the RollyFAB chat pre-filled with `ctaPrompt`

### Integration points (drop `<RollyNudge>` into these)
| Component | Screen key | Data snapshot |
|-----------|-----------|---------------|
| `SplitSongEditor` | `"splits"` | `{ masterTotal, writerTotal, missingPro: count }` |
| `FinanceTab` | `"finance"` | `{ hasRevenue, expenseCount }` |
| `TimelinesTab` | `"timelines"` | `{ nextMilestoneDate, taskCount }` |
| `Overview` | `"overview"` | `{ overdueTaskCount, budgetUtilPct }` |
| `ArtistInfoTab` | `"artist-info"` | `{ missingProCount, hasSoundExchange }` |
| `BudgetSection` | `"budget"` | `{ totalBudget, totalSpent }` |

### RollyFAB integration
Add a `openWithPrompt(prompt: string)` method exposed via a lightweight event emitter or context. When `RollyNudge` is clicked, it emits the event, `RollyFAB` listens, opens the chat panel, and pre-fills the input.

---

## Implementation Order
1. DB migrations (publisher_pct, publisher_name)
2. Split warnings (client-side, immediate value)
3. Publisher % column in editor
4. Contributor sync with band members
5. `RollyNudge` component + `useRollyNudge` hook
6. `rolly-nudge` edge function
7. Drop nudges into 6 integration points
8. Split sheet PDF export

