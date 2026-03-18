

# Plan: 4 Features (Updated Priority Colors)

## 1. Fashion Brand Alerts System

- New `brand_alerts` table (`id`, `team_id`, `brand_name`, `headline`, `url`, `image_url`, `drop_type`, `detected_at`, `is_read`) + `brand_alert_artist_matches` (`alert_id`, `artist_id`, `artist_name`)
- Add `brand_alert_frequency` column to `notification_preferences` (default `'weekly_digest'`, options: `all`, `weekly_digest`, `major_only`, `off`)
- New edge function `check-brand-drops` — uses Firecrawl to scrape brand sites, Gemini Flash to detect new drops, cross-references artists' `favorite_brands`, stores alerts
- UI: Show alerts in Overview dashboard + Rolly nudges like *"Stüssy dropped Spring '26 — Kayla wears Stüssy"*
- Rolly periodically asks users if they want more/fewer alerts

## 2. Inline Text Highlighting (Overlay Pattern)

- In `ItemEditor.tsx`: Add a `highlightOverlay` div behind the input (same font/padding, `pointer-events: none`, `whitespace: pre`)
- Input text color → `transparent`, `caret-color: currentColor` so cursor shows but styled overlay is visible
- `highlightTokens()` function wraps detected tokens in colored spans:
  - `@assignee` → `bg-blue-100 text-blue-700 font-bold`
  - Date phrases → `bg-red-100 text-red-700 font-bold`
  - `#campaign` → `bg-purple-100 text-purple-700 font-bold`
  - `$budget` → `bg-green-100 text-green-700 font-bold`

## 3. Priority Flag (Rollout Flag SVG, 3 States)

- DB: `ALTER TABLE tasks ADD COLUMN priority smallint NULL DEFAULT NULL`
- Replace `Star` icon in toolbar with rollout flag SVG, click cycles: NULL → P1 → P2 → P3 → NULL
- **Updated colors**:
  - No priority: `text-muted-foreground/40` (gray)
  - **P1: `fill-red-500`** (red flag — highest urgency)
  - **P2: `fill-amber-400`** (yellow flag — medium)
  - **P3: `fill-emerald-500`** (green flag — low)
- Read mode: colored flag icon next to task title when set

## 4. Priority Behaviors

- **Sort**: `ORDER BY priority ASC NULLS LAST, due_date ASC` (P1 first)
- **My Work**: P1 tasks get `border-l-2 border-red-500` accent, shown in a "Priority" section at top
- **Rolly P1 nudge**: When user completes a non-P1 task but has incomplete P1 tasks, Rolly nudges: *"Nice work on [task], but [P1 task] is still waiting"*

## DB Migrations
1. `ALTER TABLE tasks ADD COLUMN priority smallint NULL DEFAULT NULL`
2. Create `brand_alerts` + `brand_alert_artist_matches` tables with RLS
3. `ALTER TABLE notification_preferences ADD COLUMN brand_alert_frequency text NOT NULL DEFAULT 'weekly_digest'`

## Files Modified
- `src/components/ui/ItemEditor.tsx` — highlight overlay
- `src/components/work/WorkTaskItem.tsx` — priority flag, sort, chips
- `src/pages/Tasks.tsx` — P1 section
- `supabase/functions/rolly-nudge/index.ts` — P1 awareness
- New: `supabase/functions/check-brand-drops/index.ts`

