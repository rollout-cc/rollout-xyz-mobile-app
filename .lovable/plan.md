

## A&R Section Refactoring Plan

### Overview
Refactor the A&R section from a multi-page layout (list page + separate detail page) into a single-page kanban experience with an inline detail drawer. Inspired by the Linear/Notion/Attio references: clean columns, compact cards, and a slide-in detail panel that keeps the board visible underneath.

### Key Design Changes

**1. Kanban Board (Primary View)**
- Cleaner column headers with colored stage dots (like Linear's status dots) and counts
- More compact prospect cards: avatar (smaller, 32px), name, priority dot, genre badge -- single tight row
- Monthly listeners shown as a subtle caption beneath the name
- Follow-up date shown as a small pill when due soon (amber) or overdue (red)
- Remove the vertical separators between columns; use subtle background differentiation or spacing instead
- Empty columns show a minimal dashed placeholder (already exists, keep it)
- "+" button at the bottom of each column to add a new prospect directly into that stage

**2. Detail Drawer (replaces ProspectProfile page)**
- Create a new `ProspectDrawer` component using the existing `Sheet` (right side, wider -- `sm:max-w-lg` or `sm:max-w-xl`)
- Opens when clicking a prospect card, instead of navigating to `/ar/:prospectId`
- Contains all the current ProspectProfile content reorganized into a scrollable drawer:
  - Header: Avatar + name + stage select + priority select (compact row)
  - Tabs: Details | Engagement | Deal (instead of collapsible sections, use tabs to reduce scroll)
  - Details tab: Artist info fields, socials, key songs, notes, team contacts
  - Engagement tab: Log form + timeline
  - Deal tab: Deal status/type + DealTermsCard
- Remove the `/ar/:prospectId` route from App.tsx (or keep as a redirect to `/ar?prospect=id`)

**3. Table View**
- Keep the existing table view but open the drawer on row click instead of navigating
- Add the same compact styling improvements

**4. Toolbar Refinements**
- Keep the search + view toggle + new prospect button
- Spotify search results overlay remains the same
- Move the metric cards into a more compact horizontal strip (smaller text, tighter padding)

### Technical Implementation

**Files to create:**
- `src/components/ar/ProspectDrawer.tsx` -- New drawer component containing all detail content from ProspectProfile, using Sheet + Tabs

**Files to modify:**
- `src/pages/ARList.tsx`
  - Add `selectedProspectId` state
  - Replace `navigate('/ar/:id')` calls with `setSelectedProspectId(id)`
  - Render `<ProspectDrawer>` at bottom of page
  - Tighten metric card styling (smaller padding, text-xl instead of text-2xl)
- `src/components/ar/PipelineBoard.tsx`
  - Redesign card layout: smaller avatar (h-8 w-8), tighter padding (p-2.5)
  - Replace vertical Separators with gap spacing
  - Add colored dots to column headers matching stage semantics
  - Add "+ New" button at bottom of each column
- `src/components/ar/ProspectTable.tsx`
  - Minor: ensure `onSelect` opens drawer, no navigation
- `src/App.tsx`
  - Remove or redirect the `/ar/:prospectId` route (keep redirect for backwards compatibility)
- `src/pages/ProspectProfile.tsx`
  - Can be kept as a thin redirect to `/ar?prospect=:id`, or removed entirely

**Component structure of ProspectDrawer:**
```text
Sheet (right, max-w-xl)
 +-- Header: Avatar | Name | Stage Select | Priority Select | Close
 +-- Tabs
      +-- "Details" tab
      |    +-- Artist Info (genre, city, listeners, follow-up)
      |    +-- Socials (spotify, ig, tiktok, youtube)
      |    +-- Key Songs
      |    +-- Notes
      |    +-- Team Contacts
      +-- "Engagement" tab
      |    +-- Log Engagement form
      |    +-- Engagement timeline
      +-- "Deal" tab
           +-- Deal status + type selects
           +-- DealTermsCard
```

**Card layout in board (simplified):**
```text
+----------------------------------+
| [Avatar] [*] Name        [Trash] |
|          Genre  |  123k          |
|          Follow up: Mar 5        |
+----------------------------------+
```

### What stays the same
- All data hooks (`useProspects`, `useProspect`, etc.) remain unchanged
- DealTermsCard component stays as-is
- NewProspectDialog stays as-is
- Drag-and-drop logic stays as-is (with existing optimistic updates)
- Delete confirmation dialog pattern stays

### Sequence
1. Create `ProspectDrawer` component (extract + reorganize from ProspectProfile)
2. Refactor `ARList` to use drawer state instead of navigation
3. Redesign `PipelineBoard` card and column styling
4. Update `App.tsx` routing
5. Clean up `ProspectProfile` page (redirect or remove)

