

## Plan: Real-Time Natural Language Date Parsing with Visual Chips

### What's Changing

Right now, dates are only parsed from text **on submit**. The user wants Todoist-style behavior: as you type "this weekend" or "next Friday", the system should **live-detect** the date and display it as a **visual chip/pill** (e.g., `📅 Saturday ×`) below the input, removing the date text from the title automatically.

### Changes

#### 1. Expand `parseDateFromText` in `src/lib/utils.ts`
Add support for more natural language patterns:
- **Relative days**: "today", "tomorrow", "tonight"
- **Day names**: "monday", "tuesday", "friday", etc. (resolves to next occurrence)
- **Relative phrases**: "next week", "next monday", "this weekend" (→ Saturday), "next weekend"
- **Standalone patterns**: just "today", "tomorrow" (currently requires "due" prefix)
- Remove the requirement for "due" prefix on today/tomorrow

#### 2. Add live date detection to `ItemEditor` (`src/components/ui/ItemEditor.tsx`)
- Run `parseDateFromText` on every keystroke (debounced or on space)
- When a date is detected, show a **chip pill** below the input: `📅 Saturday ×`
- Store the parsed date in local state and expose it via a new `onDateParsed?: (date: Date | null) => void` callback
- When the chip appears, strip the date text from the input value automatically
- The `×` button on the chip clears the parsed date

#### 3. Update `MyWork.tsx` task creation
- Use the `onDateParsed` callback from `ItemEditor` instead of parsing on submit
- Show the date chip alongside existing metadata pills (artist, expense)
- Pass the parsed date to `createTask.mutate`

#### 4. Update `TimelinesTab.tsx` milestone creation
- Same pattern: use `onDateParsed` from `ItemEditor`
- The auto-detected date chip replaces the current "Auto: Aug 15, 2026" text with a proper pill
- Still allow manual date picker override

#### 5. Update `TasksTab.tsx` (artist work tab)
- Add date parsing support to the task creation form there as well, using the same `ItemEditor` + `onDateParsed` pattern

### Files to Modify
- `src/lib/utils.ts` — expand `parseDateFromText` with more patterns
- `src/components/ui/ItemEditor.tsx` — add live date detection + chip UI
- `src/pages/MyWork.tsx` — wire `onDateParsed`, show date chip in metadata pills
- `src/components/artist/TimelinesTab.tsx` — use `onDateParsed` for milestone dates
- `src/components/artist/TasksTab.tsx` — add ItemEditor with date parsing to task creation

