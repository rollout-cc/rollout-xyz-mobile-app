
# Plan: Platform Consolidation and Finance UX Improvements

This is a significant restructuring that consolidates navigation, improves finance workflows, and adds staff task management. Here's the breakdown:

---

## 1. Finance Tab UX Improvements (FinanceTab.tsx)

### Hover trash icon (replaces 3-dot menu)
- Remove the `DropdownMenu` on each transaction row
- Add a `Trash2` icon button with `opacity-0 group-hover:opacity-100` that triggers soft-delete

### 10-second undo snackbar
- Track `pendingDelete` state with the deleted item's data and a timeout ref
- Optimistically hide the item from the list
- Render a fixed bottom-right snackbar with "Undo" button and a 10s fade-out progress bar
- On undo: cancel timeout, restore item; on timeout expiry: execute actual Supabase delete

### Budget categories in category dropdown
- Query `budgets` table for the current artist
- Merge budget labels into the category `Select` dropdown alongside `finance_categories`
- When a budget label is selected that doesn't have a matching finance_category, auto-create one

### Enter-to-save and continue (both Expenses and Revenue)
- Add `onKeyDown` (Enter) handler on the new item form inputs
- On successful save, reset form fields but keep `showNewItem = true` and refocus the amount input
- This "save and continue" behavior applies to both expense and revenue item forms

---

## 2. Consolidate Roster + A&R into "Artists" Section

### Rename Roster to Artists
- Update sidebar nav label from "Roster" to "Artists"
- Update mobile bottom nav label
- Update `AppLayout` title from "Roster" to "Artists"
- Route stays `/roster` (no DB changes needed -- this is purely a UI label change)

### Add tabs: "Current Roster" and "A&R Signings"
- Add pill-style tabs at the top of the Artists page
- "Current Roster" tab shows the existing roster view (folders, artist cards, drag-drop)
- "A&R Signings" tab embeds the full ARList content (board/table view toggle, prospect drawer)
- Extract ARList's core content into a reusable component so it can render inside the tab without its own `AppLayout` wrapper

---

## 3. Consolidate Company + Agenda + Staff into Company Section

### Add local tabs to Overview page
- Add three pill-style tabs: "Dashboard", "Agenda", "Staff"
- "Dashboard" shows the current Overview content (widgets, budget, KPIs)
- "Agenda" embeds the Agenda page content (artist picker, budget summary, tasks, milestones)
- "Staff" embeds the Staff page content (member metrics, employment drawers)
- All tabs render within the same `/overview` route -- no URL changes

### Update sidebar
- Remove "Agenda", "Staff", and "A&R" from sidebar nav items
- Keep: Company, Artists, My Work
- Update mobile bottom nav similarly (remove Agenda, Staff, A&R from "More" menu)

---

## 4. Staff Task Management

### Staff detail page
- Create a new route `/staff/:memberId` with a detail page for each staff member
- Include tabs: "Tasks" (assigned work items), "Info" (profile, employment details)
- Tasks tab allows managers to create, assign, and manage tasks for the staff member
- These tasks may or may not be linked to an artist but are assigned to the staff member's user ID
- Assigned tasks appear in the staff member's "My Work" section

### Inline quick-assign on Staff tab
- Add a quick "Assign Task" action on staff member cards/rows
- Opens a dialog to create a task and assign it to that member

---

## 5. Financial Audit (Code Verification)

- Review salary/retainer calculations in StaffMetricsSection and StaffEmploymentDrawer
- Verify that W-2 employer tax calculations feed into company-level staff expenses
- Confirm artist transaction totals (expenses, revenue, net) are computed correctly
- Ensure budget utilization calculations match actual transaction sums
- Check that company budget remaining balance properly subtracts artist allocations, staff payroll, and business expenses
- Report any discrepancies found

---

## Technical Details

### Files to create:
- `src/components/ar/ARContent.tsx` -- extracted AR content (no AppLayout wrapper) for embedding in Artists tab
- `src/components/overview/AgendaContent.tsx` -- extracted Agenda content for embedding in Company tab  
- `src/components/overview/StaffContent.tsx` -- extracted Staff content for embedding in Company tab
- `src/pages/StaffDetail.tsx` -- new staff member detail page

### Files to modify:
- `src/components/artist/FinanceTab.tsx` -- all finance UX changes
- `src/pages/Roster.tsx` -- add tabs, embed AR content, rename to Artists
- `src/pages/Overview.tsx` -- add tabs, embed Agenda and Staff content
- `src/components/AppSidebar.tsx` -- remove Agenda, Staff, A&R nav items; rename Roster to Artists
- `src/components/MobileBottomNav.tsx` -- update nav items
- `src/App.tsx` -- add StaffDetail route, keep old routes as redirects for bookmarks

### Database changes:
- No schema changes needed for navigation consolidation (purely UI)
- Tasks table already supports `assigned_to` user IDs, so staff task assignment works with existing schema
- Budget label to finance_category auto-creation uses existing tables
