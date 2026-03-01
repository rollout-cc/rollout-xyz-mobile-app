
## Update Assignee Filter to Multi-Select with "Select All"

### What Changes
The "All Members" dropdown on the Agenda page will be converted from a single-select to a multi-select dropdown. "Select All" will toggle all members on/off, and individual members can be selected or deselected independently. The member list will be scoped to those who have permissions for the currently selected artist.

### How It Works
- Default state: all members selected (equivalent to current "All Members" behavior)
- Clicking "Select All" toggles between all selected and none selected
- Clicking an individual member toggles them on/off
- When all members are selected, the trigger shows "All Members"
- When a subset is selected, it shows the count (e.g., "2 Members") or a single name
- The task list filters to show tasks assigned to any of the selected members

### Technical Details

**File: `src/pages/Agenda.tsx`**

1. Replace `selectedAssignee: string` state with `selectedAssignees: string[]` (array of user IDs)

2. Add a query to fetch artist-specific team members using the `artist_permissions` table, filtered by the selected `artistId`. Fall back to all team members if no permissions are configured.

3. Replace the Radix `Select` component with a `Popover` + checkbox list pattern (since Radix Select doesn't support multi-select):
   - A trigger button styled like the current select
   - A popover with:
     - "Select All" checkbox at the top
     - Individual member checkboxes below
   - Checkmark indicators matching the screenshot style

4. Update task filtering logic:
   - When `selectedAssignees` includes all members (or is empty = all), show all tasks
   - Otherwise, filter tasks to only those where `assigned_to` is in the `selectedAssignees` array

5. Reset `selectedAssignees` to all when the artist changes (so switching artists doesn't carry over stale member selections)
