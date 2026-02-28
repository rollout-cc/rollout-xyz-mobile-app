

# Unified Item Components for Tasks, Timelines, and Links

## Goal

Refactor the Work (tasks), Timelines (milestones), and Links tabs to share a unified component family. Replace plain `<input>` fields with Tiptap-powered inline editors that support smart shortcuts. Match the design language shown in the reference screenshots.

## Design Insights from Screenshots

The screenshots reveal a consistent card-based editing pattern across Links and Timelines:

**Links (image-18, image-19, image-20):**
- Collapsible folder sections ("Unsorted", "Marketing Materials") with count badges -- already matches current `CollapsibleSection`
- Link rows show: large favicon (rounded square), bold title, domain subtitle, folder badge, and hover actions (copy, external link)
- "New Folder" and "+ Add Link" buttons in the top-right header area
- **Add Link card** (image-19): bordered card with "Enter Title" and "Link URL" as separate lines, a folder icon, a Folder dropdown selector at bottom-left, and Cancel/Save buttons at bottom-right
- **New Folder inline** (image-20): bordered card with folder name input, Cancel/Save buttons

**Timelines (image-21):**
- Milestones inside a campaign-like collapsible section ("Album Release" with count 5)
- "+ New Milestone" inline trigger
- **Editing card**: bordered card with calendar icon + bold title, description below in muted text, metadata badges row (calendar icon, link icon, colored folder/link badges), "Select Date or Range" picker at bottom-left, Cancel/Save at bottom-right
- **Read-only rows**: bookmark icon, bold title, description, then a row of small icon badges (person, calendar date, #campaign, $, link)

## What This Means for Unified Components

All three item types share the same visual pattern:
1. A **read-only row** with icon + title + description + metadata badges
2. An **editing card** (bordered, slightly elevated) with inline title/description editing, metadata pickers at bottom-left, and Cancel/Save at bottom-right
3. They all live inside `CollapsibleSection` wrappers

## Plan

### 1. Create `ItemCard` -- unified read/edit item component

**New file**: `src/components/ui/ItemCard.tsx`

A single component that handles both display and edit modes for tasks, milestones, and links:

**Read mode (default):**
- Left icon slot (checkbox for tasks, calendar for milestones, favicon for links)
- Title (bold, inline-editable on click)
- Description (muted text below title)
- Metadata badges row: assignee, date, campaign/folder, budget, attached links -- rendered as small `bg-muted/80` pills
- Hover actions on the right (delete, more menu)

**Edit mode (when creating new or editing):**
- Bordered card container (`border border-border rounded-lg p-4`)
- Tiptap editor for title (bold, single-line, with `@`, `#`, `$`, `due` triggers)
- Tiptap editor for description (optional, muted placeholder)
- Icon toolbar row: small buttons for metadata that isn't set via shortcuts
- Bottom bar: left side has context-specific picker (Folder dropdown for links, Date picker for milestones), right side has Cancel + Save buttons (Save is black/dark with checkmark)

### 2. Create `ItemEditor` -- Tiptap-powered inline input

**New file**: `src/components/ui/ItemEditor.tsx`

Replaces all plain `<input>` fields for creating/editing items:

- Uses `@tiptap/react` + `@tiptap/starter-kit` (already installed)
- Single-line mode (Enter submits, Shift+Enter for newline in description)
- Smart trigger extensions using `@tiptap/suggestion` (new dependency):
  - `@` -- team member dropdown (from existing team_memberships query)
  - `#` -- campaign/folder dropdown (from initiatives or link_folders)
  - `$` -- budget amount inline entry
  - `due` -- natural language date parsing (today, tomorrow, MM/DD)
- On trigger selection, structured data is extracted and stored as item fields (not as rich editor content)
- Placeholder text matches context: "Enter Title", "What's happening on this date?", "Paste URL"

### 3. Create `ItemPickers` -- shared metadata pickers

**New file**: `src/components/ui/ItemPickers.tsx`

Bottom-bar picker components matching the screenshot design:

- **FolderPicker**: Select dropdown showing available folders (for links)
- **DateRangePicker**: "Select Date or Range" button with calendar popover (for milestones)
- **MemberPicker**: team member search/select (for task assignee icon)
- **CampaignPicker**: campaign/initiative search (for task # shortcut)

### 4. Refactor WorkTab

- Replace `InlineTaskInput` with `ItemCard` in edit mode, configured for tasks
- Replace `TaskRow` with `ItemCard` in read mode with checkbox icon
- Task metadata badges: assignee, due date, campaign, expense amount
- Keep `CollapsibleSection` wrappers for campaigns and "Unsorted"
- Keep empty state, campaign creation, and "Show Completed" toggle
- Smart shortcuts (`@`, `#`, `$`, `due`) continue to work via Tiptap triggers instead of manual regex parsing

### 5. Refactor TimelinesTab

- Replace `InlineMilestoneInput` with `ItemCard` in edit mode, configured for milestones
- Replace `MilestoneRow` with `ItemCard` in read mode with calendar icon
- Edit card shows: title, description, attached folder/link badges (colored, clickable), date picker at bottom-left, Cancel/Save at bottom-right
- Read row shows: bookmark icon, title, description, then metadata badges (date, attached folders as blue links, attached links as blue links)
- Calendar view remains unchanged
- Attachment dropdowns (folder picker, link picker) move into the edit card's icon toolbar

### 6. Refactor LinksTab

- Replace `InlineLinkInput` with `ItemCard` in edit mode, configured for links
- Edit card shows: "Enter Title" field, "Link URL" field, folder icon, Folder dropdown at bottom-left, Cancel/Save at bottom-right
- Replace `LinkRow` with `ItemCard` in read mode with favicon
- Read row shows: large rounded favicon, bold title, domain label, folder badge
- Keep `CollapsibleSection` for folders and folder CRUD
- Move "New Folder" and "+ Add Link" to top-right header buttons

### 7. Update consuming pages

- `MyWork.tsx` and `Tasks.tsx`: use `ItemCard` read mode for task rendering
- Minimal changes -- just swap the inline div markup for the shared component

## Technical Details

**New dependency**: `@tiptap/suggestion` for trigger-based dropdowns

**New files:**
- `src/components/ui/ItemCard.tsx`
- `src/components/ui/ItemEditor.tsx`
- `src/components/ui/ItemPickers.tsx`

**Modified files:**
- `src/components/artist/WorkTab.tsx` -- use ItemCard/ItemEditor
- `src/components/artist/TimelinesTab.tsx` -- use ItemCard/ItemEditor
- `src/components/artist/LinksTab.tsx` -- use ItemCard/ItemEditor
- `src/pages/MyWork.tsx` -- use ItemCard for tasks
- `src/pages/Tasks.tsx` -- use ItemCard for tasks

**Unchanged:**
- `CollapsibleSection` remains as the section wrapper
- All database tables and mutations stay the same
- Calendar view in TimelinesTab stays as-is
- Tiptap is used for editing UX only; item titles/descriptions are stored as plain text

**Implementation order:**
1. Create ItemCard, ItemEditor, ItemPickers
2. Refactor WorkTab (largest, validates the pattern)
3. Refactor LinksTab
4. Refactor TimelinesTab
5. Update MyWork and Tasks pages

