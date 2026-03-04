

## Replace 3-dot menus with direct hover icons across the app

The 3-dot (MoreVertical/MoreHorizontal) dropdown menus will be replaced with direct hover-visible action icons: Pencil (edit) and Trash (delete). This applies to every card and list item across the platform.

### Affected components and changes

**1. ArtistCard** (`src/components/roster/ArtistCard.tsx`)
- Remove DropdownMenu with MoreVertical
- Add `onDelete` and `onEdit` props
- Show Pencil + Trash icons on hover (opacity-0 → group-hover:opacity-100)
- Trash triggers delete with AlertDialog confirmation
- Pencil navigates to artist detail (or triggers edit callback)
- Keep "Remove from category" as a secondary action if `insideFolder`

**2. Roster page** (`src/pages/Roster.tsx`)
- Add `useDeleteArtist` hook usage
- Pass `onDelete` and `onEdit` to ArtistCard
- Add delete artist mutation to `useArtists.ts`

**3. useArtists hook** (`src/hooks/useArtists.ts`)
- Add `useDeleteArtist` mutation that deletes from `artists` table and invalidates queries

**4. WorkItemRow** (`src/components/work/WorkItemRow.tsx`)
- Replace DropdownMenu + MoreHorizontal with direct Trash2 icon button on hover
- Remove dropdown entirely since the only action is delete

**5. FinanceTab** (`src/components/artist/FinanceTab.tsx`)
- Replace MoreVertical dropdown on budget categories with direct Trash2 icon on hover

**6. WorkTab campaigns** (`src/components/artist/WorkTab.tsx`)
- Replace MoreHorizontal dropdown on campaigns with Pencil + Trash icons on hover
- Keep AlertDialog for delete confirmation (destructive action)
- The MoreHorizontal used as a delete button (line 480-482) → replace with Trash2 icon

**7. LinksTab folders** (`src/components/artist/LinksTab.tsx`)
- Replace MoreHorizontal dropdown on link folders with direct Trash2 icon on hover

**8. TimelinesTab milestones** (`src/components/artist/TimelinesTab.tsx`)
- This one is more complex — the dropdown has "Move to Timeline", "Attach Folder", and delete actions. Keep dropdown here since it has multi-action context menus, but replace the MoreVertical trigger with a more contextual approach, or keep as-is since it's not a simple edit/delete pattern.

### Excluded from changes
- **MobileBottomNav** — "More" button is navigation, not a card action
- **NotesPanel** — dropdowns are text formatting toolbars, not card actions
- **TimelinesTab milestone dropdown** — has complex multi-action menus (move to timeline, attach folder) that need a dropdown

### Technical approach
- Use `AlertDialog` for all delete confirmations on destructive actions (artists, campaigns)
- Direct delete without confirmation for lightweight items (work items, budget categories) — matching existing behavior
- Pencil icon uses `Pencil` from lucide-react
- Both icons: `h-7 w-7` ghost buttons, `opacity-0 group-hover:opacity-100`

