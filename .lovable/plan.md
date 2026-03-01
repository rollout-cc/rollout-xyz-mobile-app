

# Add Layout Toggle to Label View

## Overview
Add a layout mode toggle (single column vs. two columns) to the Label dashboard header, persisted in localStorage. The current CSS masonry approach (`columns-1 xl:columns-2`) will be replaced with a user-controlled toggle.

## Changes

### 1. `src/components/overview/useOverviewSections.ts`
- Add a `layout` state: `"single" | "two-column"`, defaulting to `"single"`
- Persist to localStorage under key `overview-layout-mode`
- Expose `layout` and `setLayout` from the hook

### 2. `src/pages/Overview.tsx`
- Add a layout toggle control in the header area (between the welcome text and the first section), using a minimal segmented button style matching the app's existing pattern (like the List/Calendar toggle in Timelines):
  - Single column icon (Rows3) and two-column icon (Columns2)
- Update the masonry grid container to conditionally apply:
  - Single: `columns-1`
  - Two-column: `columns-1 lg:columns-2`
- Import `Columns2` and `Rows3` icons from lucide-react

### Technical Details
- The toggle will be a small icon-only segmented control placed at the top-right of the welcome section
- Active state uses `bg-accent text-foreground`, inactive uses `text-muted-foreground`
- Layout preference persists across sessions via localStorage

