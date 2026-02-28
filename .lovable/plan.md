

# Overview Page: Collapsible & Draggable Sections

## Goal
Make every section on the Overview page collapsible, and allow sections to be reordered via drag-and-drop. Also support adding/removing sections from a menu.

## Current State
The Overview page has 4 hardcoded sections: KPI Cards, Budget Utilization, Quarterly P&L, and Spending Per Act. None are collapsible or reorderable. A `CollapsibleSection` component already exists and is used in other tabs.

## Plan

### 1. Create a reusable `DraggableSection` component
**New file**: `src/components/overview/DraggableSection.tsx`

- Wraps `CollapsibleSection` with drag-and-drop handles
- Uses **framer-motion** (already installed) with `Reorder` API for smooth drag-and-drop reordering -- no new dependencies needed
- Adds a grip/drag handle icon to each section header via the `actions` slot
- Each section gets a unique `id` string for ordering

### 2. Create section configuration and state management
**New file**: `src/components/overview/useOverviewSections.ts`

- Custom hook that manages:
  - **Section order**: array of section IDs persisted to `localStorage`
  - **Section visibility**: which sections are shown/hidden, also persisted
  - **Collapse state**: which sections are open/closed
- Default sections: `["kpis", "budget-utilization", "quarterly-pnl", "spending-per-act"]`
- Provides `reorder()`, `toggleVisibility()`, `toggleCollapse()` functions

### 3. Create "Add Section" menu
- A dropdown button (using existing `DropdownMenu` component) that lists hidden sections
- Rendered at the bottom of the overview or in the page header
- Each hidden section appears as a menu item; clicking it re-adds it to the visible list
- Sections can be hidden via a small "x" or eye icon in each section's action area

### 4. Refactor Overview.tsx
- Extract each section's content into standalone components within `src/components/overview/`:
  - `KpiCardsSection.tsx` -- the 4 KPI cards
  - `BudgetUtilizationSection.tsx` -- the progress bar
  - `QuarterlyPnlSection.tsx` -- the P&L table
  - `SpendingPerActSection.tsx` -- the artist breakdown list
- The main `Overview.tsx` will:
  - Use `useOverviewSections()` for order/visibility/collapse state
  - Render a `<Reorder.Group>` from framer-motion containing `<Reorder.Item>` wrappers
  - Each item renders the appropriate section component inside a `CollapsibleSection` with a drag handle
  - Map section IDs to components via a registry object
- The `KpiCard` helper stays as-is but moves into `KpiCardsSection.tsx`

### 5. Section header enhancements
Each section header will have:
- Chevron for collapse/expand (from `CollapsibleSection`)
- Section title and optional count badge
- Drag handle icon (GripVertical from lucide)
- Hide/remove button (EyeOff or X icon) to remove section from view

## Technical Details

**Drag-and-drop approach**: `framer-motion`'s `Reorder` API
- `<Reorder.Group axis="y" values={orderedSections} onReorder={setOrder}>`
- `<Reorder.Item value={sectionId} dragListener={false} dragControls={controls}>`
- Drag is initiated only from the grip handle via `dragControls`

**Persistence**: `localStorage` key like `overview-section-order` and `overview-section-visibility`

**Files created**:
- `src/components/overview/useOverviewSections.ts`
- `src/components/overview/DraggableSection.tsx`
- `src/components/overview/KpiCardsSection.tsx`
- `src/components/overview/BudgetUtilizationSection.tsx`
- `src/components/overview/QuarterlyPnlSection.tsx`
- `src/components/overview/SpendingPerActSection.tsx`

**Files modified**:
- `src/pages/Overview.tsx` -- refactored to use section system

