

# Plan: Fix Platform Scrolling + Seed Comprehensive Dummy Data + Two-Column Spending Layout

## 1. Fix Platform-Wide Scrolling (Critical)

The root cause of the scrolling issue is that the app layout uses `min-h-screen` on the outer container, which allows the flex container to grow beyond the viewport instead of constraining it. This means `overflow-y-auto` on `<main>` has no bounded height to scroll within.

**Fix in `src/components/AppLayout.tsx`:**
- Change outer div from `min-h-screen` to `h-screen overflow-hidden`
- Ensure the inner content column has `overflow-hidden` so the `<main>` element becomes the scroll boundary
- `<main>` already has `overflow-y-auto` from the previous fix, which will now work correctly because it has a bounded parent

**Fix in `index.html`:**
- Remove `user-scalable=no` from the viewport meta tag — this can interfere with trackpad gestures on desktop browsers

## 2. Two-Column Layout for Spending Per Act

**File: `src/components/overview/SpendingPerActSection.tsx`**
- When `artistBreakdown.length > 1`, render the artist cards in a responsive two-column grid (`grid grid-cols-1 sm:grid-cols-2 gap-4`) instead of a single-column `space-y-4` stack

## 3. Seed Comprehensive Dummy Data via Database Migration

Insert realistic data across all platform areas for the existing artists. This will be done via a SQL migration that:

**Budgets & Transactions (expand existing):**
- Ensure every artist has 3-5 budget categories with varying amounts
- Add 5-10 expense transactions per artist across categories
- Add 3-6 revenue transactions per artist with varied `revenue_category` values (royalty, live, merch, brand_deal, show_fee, etc.)

**Initiatives (Campaigns/Objectives):**
- Insert 2-3 initiatives per artist with date ranges and descriptions

**Tasks (Work Items):**
- Insert 5-10 tasks per artist with varying statuses (completed/incomplete), due dates, and budget linkages

**Artist Links:**
- Insert 3-5 links per artist (Spotify, Instagram, press kit, etc.)

**Artist Milestones (Release Plans/Timelines):**
- Create 1-2 timelines per artist
- Add 3-5 milestones per timeline with dates and descriptions

**Artist Information (Travel/Member Info):**
- Insert 2-3 band member records per artist with clothing sizes, travel info, dietary restrictions

**Splits:**
- Create 1 split project per artist with 2-3 songs and 2-4 contributor entries

**Artist Contacts:**
- Add 2-3 contacts per artist (manager, lawyer, publicist)

All data will reference existing artist IDs queried dynamically via CTEs in the migration SQL.

## Files to Edit
1. `index.html` — remove `user-scalable=no`
2. `src/components/AppLayout.tsx` — fix scroll container hierarchy
3. `src/components/overview/SpendingPerActSection.tsx` — two-column grid
4. Database migration — comprehensive seed data across all tables

