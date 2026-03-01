

# Refactor Timelines to Mirror Work Section

## Overview
Introduce the concept of **Timelines** as grouping containers for milestones, analogous to how **Campaigns** group **Tasks** in the Work section. Users will be able to create multiple timelines (e.g., "Album Rollout", "Tour Dates"), each containing its own milestones. The UI will reuse the same `CollapsibleSection`, `InlineAddTrigger`, `ItemEditor`, `ItemCardRead`, and `MetaBadge` components already used in Work.

## Database Changes

### New table: `artist_timelines`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `artist_id` | uuid | NOT NULL |
| `name` | text | NOT NULL |
| `is_archived` | boolean | NOT NULL, default `false` |
| `created_at` | timestamptz | NOT NULL, default `now()` |

RLS policies mirroring the `initiatives` table pattern:
- SELECT: `is_team_member(get_artist_team_id(artist_id))`
- INSERT/UPDATE/DELETE: `is_team_owner_or_manager(get_artist_team_id(artist_id))`

### Alter `artist_milestones`
- Add column `timeline_id uuid REFERENCES artist_timelines(id) ON DELETE SET NULL` (nullable, so existing milestones land in "Unsorted")

## Frontend Changes

### `src/components/artist/TimelinesTab.tsx` -- Full Refactor

The component will be restructured to closely follow `WorkTab.tsx`:

1. **Top bar**: "Show Completed" equivalent is not needed (milestones don't complete), but we keep the List/Calendar toggle and Share button. Add a **"+ New Timeline"** button on the right (same pattern as `NewCampaignInline`).

2. **Unsorted section**: Milestones without a `timeline_id` appear in a collapsible "Unsorted" section using `CollapsibleSection`.

3. **Timeline sections**: Each `artist_timelines` record renders as a `CollapsibleSection` with:
   - Inline-editable title via `InlineField` (same as `CampaignName`)
   - A count badge of milestones
   - A dropdown menu with Archive/Delete actions (same as `CampaignActions`)
   - A `+ New Milestone` trigger inside each section that defaults `timeline_id` to that timeline

4. **Milestone items**: Keep the existing `MilestoneRow` component (using `ItemCardRead`, `InlineField`, `MetaBadge` for date/folders/links) but add the ability to assign a milestone to a timeline via the `#` shortcut or dropdown.

5. **Calendar view**: Remains unchanged -- shows all milestones across all timelines.

6. **Empty state**: When no timelines and no milestones exist, show a centered empty state with "New Timeline" and "New Milestone" buttons (mirroring `EmptyWorkState`).

### Component Reuse
- `CollapsibleSection` + `InlineAddTrigger` for section headers
- `InlineField` for inline-editable timeline names
- `ItemCardRead` / `MetaBadge` for milestone rows (already in use)
- `ItemEditor` / `DescriptionEditor` for milestone creation (already in use)
- `DropdownMenu` + `AlertDialog` for timeline actions (Archive/Delete)

## Technical Details

### Migration SQL
```sql
CREATE TABLE public.artist_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  name text NOT NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_timelines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Team members can view timelines" ON public.artist_timelines
  FOR SELECT USING (is_team_member(get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can insert timelines" ON public.artist_timelines
  FOR INSERT WITH CHECK (is_team_owner_or_manager(get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can update timelines" ON public.artist_timelines
  FOR UPDATE USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));
CREATE POLICY "Owners/managers can delete timelines" ON public.artist_timelines
  FOR DELETE USING (is_team_owner_or_manager(get_artist_team_id(artist_id)));

-- Add timeline_id to milestones
ALTER TABLE public.artist_milestones
  ADD COLUMN timeline_id uuid REFERENCES public.artist_timelines(id) ON DELETE SET NULL;
```

### Query structure
- Fetch `artist_timelines` for the artist, ordered by `created_at DESC`
- Existing milestones query remains, now also used to group by `timeline_id`
- Unsorted milestones: `milestone.timeline_id === null`
- Timeline milestones: `milestone.timeline_id === timeline.id`

### Public timeline handling
The shared/public timeline page will continue showing all milestones regardless of timeline grouping. The new `artist_timelines` table needs a SELECT policy for public access when the artist's `timeline_is_public` is true (similar to milestones).

