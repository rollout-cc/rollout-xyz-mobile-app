

## App Tour for New Users

### Overview

Build a step-by-step tooltip tour system that auto-triggers after onboarding completes, with an initial overview tour across pages and per-page mini-tours that trigger on first visit. Users can also restart the tour from settings.

### Architecture

**No external library** — build a lightweight custom tour system using a React context + portal-based tooltip component. This keeps bundle size small and gives full control over styling.

#### Core Components

1. **`TourContext`** (`src/contexts/TourContext.tsx`)
   - Manages tour state: current tour ID, step index, completion status
   - Reads/writes tour progress to a `tour_progress` database table so it persists across sessions
   - Exposes `startTour(tourId)`, `nextStep()`, `prevStep()`, `skipTour()`, `resetTours()`

2. **`TourOverlay`** (`src/components/tour/TourOverlay.tsx`)
   - Portal-rendered spotlight overlay with a tooltip bubble
   - Uses `element.getBoundingClientRect()` to position the spotlight cutout around the target element
   - Tooltip shows: step title, description, step counter (e.g. "3 of 8"), Next/Back/Skip buttons
   - Smooth transitions between steps using framer-motion

3. **`TourStep`** marker component (`src/components/tour/TourStep.tsx`)
   - A wrapper or `data-tour="step-id"` attribute system to mark DOM elements as tour targets
   - Tour definitions reference these IDs

4. **Tour definitions** (`src/lib/tourSteps.ts`)
   - Each tour is an array of step objects: `{ id, targetSelector, title, description, page?, placement }`
   - Tours defined:
     - **`welcome-tour`** (initial overview, ~8 steps): Sidebar navigation, team switcher, artist roster, add artist button, overview page, my work, notes, settings
     - **`roster-tour`** (~4 steps): Search/filter, folders, artist cards, sort options
     - **`artist-detail-tour`** (~6 steps): Banner/avatar area, work tab, finance tab, timelines, splits, links
     - **`overview-tour`** (~5 steps): Dashboard tabs (agenda, staff, finance), KPI cards, budget section, widgets, weekly digest
     - **`my-work-tour`** (~4 steps): Task list, note creation, task assignment, filters
     - **`ar-tour`** (~3 steps): Pipeline board, prospect cards, deal terms
     - **`settings-tour`** (~3 steps): Profile, team management, notifications, billing

### Database

New table: **`tour_progress`**
```sql
CREATE TABLE public.tour_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tour_id)
);
ALTER TABLE public.tour_progress ENABLE ROW LEVEL SECURITY;
-- Users can only read/write their own progress
CREATE POLICY "Users manage own tour progress" ON public.tour_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### Tour Trigger Logic

- **After onboarding**: When the user finishes the 7-step onboarding and lands on the roster page, check if `welcome-tour` is completed. If not, auto-start it.
- **Per-page mini-tours**: Each page (Roster, ArtistDetail, Overview, MyWork, AR, Settings) checks on mount if its specific tour has been completed. If not, start it automatically.
- **Manual restart**: Add a "Restart App Tour" button in Settings that resets all `tour_progress` rows and re-triggers the welcome tour.
- **Cross-page navigation**: The welcome tour auto-navigates between pages (Roster → Overview → My Work) using `react-router-dom`'s `navigate()`. A brief delay between navigation and step highlight ensures DOM is ready.

### Tooltip Design

- Dark background (`bg-foreground text-background`) matching the existing app style
- Spotlight: semi-transparent overlay with a rounded cutout around the target element
- Placement: auto-detect best position (top/bottom/left/right) based on viewport space
- Mobile-friendly: on mobile, tooltips anchor to bottom of screen if target is near top, and vice versa
- Skip link always visible, Back button from step 2 onward

### Integration Points

- **`AppLayout.tsx`**: Wrap children with `<TourOverlay />` 
- **`Onboarding.tsx`**: On final step completion, set a flag to trigger the welcome tour
- **`Roster.tsx`**: Add `data-tour` attributes to key elements (search bar, add artist button, folder section)
- **`ArtistDetail.tsx`**: Add `data-tour` attributes to tab buttons, banner area, budget section
- **`Overview.tsx`**: Add `data-tour` attributes to tab switcher, KPI cards, widgets
- **`MyWork.tsx`**: Add `data-tour` attributes to task list, notes panel, filters
- **`ARList.tsx`**: Add `data-tour` attributes to pipeline board
- **`Settings.tsx`**: Add `data-tour` attributes to section nav, "Restart Tour" button added here
- **`AppSidebar.tsx`**: Add `data-tour` attributes to nav items and team switcher

### Files to Create
- `src/contexts/TourContext.tsx`
- `src/components/tour/TourOverlay.tsx`
- `src/components/tour/TourStep.tsx`
- `src/lib/tourSteps.ts`

### Files to Modify
- `src/App.tsx` — add TourProvider
- `src/components/AppLayout.tsx` — render TourOverlay
- `src/pages/Onboarding.tsx` — trigger welcome tour on completion
- `src/pages/Roster.tsx` — add data-tour attributes, trigger roster-tour
- `src/pages/ArtistDetail.tsx` — add data-tour attributes, trigger artist-detail-tour
- `src/pages/Overview.tsx` — add data-tour attributes, trigger overview-tour
- `src/pages/MyWork.tsx` — add data-tour attributes, trigger my-work-tour
- `src/pages/ARList.tsx` — add data-tour attributes, trigger ar-tour
- `src/pages/Settings.tsx` — add data-tour attributes, add "Restart Tour" button
- `src/components/AppSidebar.tsx` — add data-tour attributes
- `src/components/MobileBottomNav.tsx` — add data-tour attributes

### Implementation Order
1. Database migration (tour_progress table)
2. Tour context + overlay components
3. Tour step definitions
4. Wire up welcome tour (auto-trigger after onboarding, cross-page navigation)
5. Add data-tour attributes across all pages
6. Wire up per-page mini-tours
7. Add "Restart Tour" in Settings

