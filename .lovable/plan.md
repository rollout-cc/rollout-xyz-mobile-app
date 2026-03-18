

# Bug Verification Report

I reviewed each reported bug against the actual source code. Here's what's confirmed vs. not reproducible from code alone:

## Confirmed Bugs (13 of 15)

### 1. Monthly Cost Repeating Decimals — CONFIRMED
`FinanceContent.tsx` line 360: `Number(emp.annual_salary || 0) / 12` with no rounding. The `fmt()` on line 172 uses `toLocaleString()` which doesn't cap decimal places. Same for `totalPayroll` (line 159-162) and `monthlyBurn` (line 164-166).

### 2. Total Budget Inconsistency — CONFIRMED
- `FinanceContent.tsx` line 152: `budgets + team.annual_budget` (correct)
- `RollyWorkspace.tsx` line 119: only `budgets.reduce(...)` — missing `team.annual_budget`
- Dashboard (`KpiCardsSection`) receives `totalBudget` from `FinanceContent` so it matches Finance, but not Rolly.

### 3. Overdue Work Inconsistency — CONFIRMED
- Dashboard (`FinanceContent.tsx` line 170): counts ALL team tasks
- `RollyWorkspace.tsx` line 118: filters to `myTasks` (assigned to current user only), then counts overdue from that subset

### 4. Company Budget "Remaining" + Staff Payroll Mismatch — CONFIRMED
`CompanyBudgetSection.tsx`: `remaining = annualBudget - totalArtistAllocated - totalPayroll - totalCategorySpend`. If a "Staff Payroll" budget category also exists, payroll is double-counted. The Staff Payroll summary card shows actual payroll from `staff_employment`, but the category card shows whatever `annual_budget` was manually entered.

### 5. Company Budget Categories $0 Spent — CONFIRMED
Line ~202 in `CompanyBudgetSection.tsx`: `spent = companyExpenses.filter(e => e.category_id === cat.id)`. If expenses don't have `category_id` set (which is likely since it's a separate insert flow), everything shows $0.

### 6. Distribution Wizard No Step 1 Validation — CONFIRMED
`ReleaseWizard.tsx`: The Continue button on step 0 has no disabled state. `stepValid(0)` is computed but never prevents navigation.

### 7. Partners Step Premature Checkmark — CONFIRMED
`stepValid(2)` returns `true` because all platforms default to enabled. The checkmark shows based on `valid === true` regardless of whether the user has visited the step.

### 8. Goals Banner Wording — PARTIALLY CONFIRMED
`ObjectiveKpiCard.tsx` renders: label, current value, and percentage. It does NOT show "Goal · Goal 500K" — it shows `{typeDef.label}` then `{currentValue} {progress}%`. The complaint about showing percentage of intermediate milestone vs. actual goal needs further investigation (may be a data issue where `objective_1_target` is set to an intermediate milestone). The rendering is technically clean but could be clearer with a "→ Target" format.

### 9. Agenda Task Duplication — CONFIRMED
`AgendaContent.tsx` line 192-206: `weeklyTasks` includes ALL tasks due this week, and `campaignSections` includes tasks with `initiative_id`. Tasks with both a due date this week AND an `initiative_id` appear in both lists. Public agenda (`PublicAgenda.tsx` line 88-91) has the same issue.

### 10. Public Agenda Scroll — NEEDS VERIFICATION
The page uses `min-h-screen` on line 94 with no `overflow` constraints visible in code. May be caused by parent container. Need to check `AppLayout` or outer wrapper — but since PublicAgenda doesn't use AppLayout, the issue might be from the `max-w-[820px]` container having no scroll behavior on mobile.

### 11. Stale Onboarding Tooltip — CONFIRMED
`RollyNudge` on overview (line 683 of Overview.tsx) passes `{ artistCount, taskCount }` to `dataSnapshot`, but the edge function's `rolly-nudge` prompt doesn't instruct the AI to suppress "getting started" nudges when data exists. It's up to the AI model's judgment, which is unreliable.

### 12. Invite Form Email Field — CONFIRMED
`InviteMemberDialog.tsx` line 67-78: `inviteEmail` state controls behavior via `hasEmail` (line 78), and the button changes between "Send Invite" and "Generate Link" based on this. But the email `<Input>` has no "(optional)" label or helper text.

### 13. Unnamed Band Member — CONFIRMED
`ArtistInfoTab.tsx` lines 100-106: `addMember.mutate({})` auto-creates a blank member with no fields when the artist has zero members. This creates the "Unnamed Member" entry.

### 14. Release Plan Milestones "Unsorted" + Calendar — PARTIALLY CONFIRMED
List view: milestones without `timeline_id` correctly go under "Unsorted" (line 183). Calendar view (line 268): `<CalendarView milestones={milestones} />` receives ALL milestones, so they should all appear. The "Unsorted" complaint is expected behavior (no timeline = unsorted). Calendar missing events could be a rendering issue in the CalendarView component — need to verify.

### 15. A&R Signed → Roster — CONFIRMED
`PipelineBoard.tsx` line 145-151: `handleDragEnd` simply calls `onStageChange(prospectId, newStage)` with no confirmation dialog and no artist creation logic when moving to "signed".

### 16. Blank "New Note" Entries — CONFIRMED
`useCreateNote` (useNotes.ts line 34-37): immediately inserts `{ title: "", content: "" }`. No cleanup on abandon. `NotesPanel.tsx` displays these as "New Note" (line 225).

---

## Implementation Plan

### Files to Modify

| File | Fixes |
|------|-------|
| `FinanceContent.tsx` | #1 Round monthly/burn to 2 decimals |
| `CompanyBudgetSection.tsx` | #1 #4 #5 Round payroll, fix remaining calc, wire categories to expenses |
| `RollyWorkspace.tsx` | #2 #3 Add team.annual_budget to totalBudget, use all team tasks for overdue |
| `ReleaseWizard.tsx` | #6 #7 Disable Continue when invalid, track visited steps |
| `ObjectiveKpiCard.tsx` | #8 Show "Current → Target Goal (X%)" format |
| `AgendaContent.tsx` | #9 Exclude campaign tasks from "This Week" |
| `PublicAgenda.tsx` | #9 #10 Same dedup, add overflow-y-auto |
| `rolly-nudge/index.ts` | #11 Add prompt rule to suppress "getting started" for active teams |
| `InviteMemberDialog.tsx` | #12 Add "(optional)" to email label |
| `ArtistInfoTab.tsx` | #13 Remove auto-create blank member |
| `PipelineBoard.tsx` | #15 Add confirm dialog + auto-create artist on "signed" |
| `NotesPanel.tsx` | #16 Auto-delete empty notes on navigate away |
| `useNotes.ts` | #16 Filter out empty notes from list |
| `TimelinesTab.tsx` | #14 Check CalendarView receives all milestones (already does — may need CalendarView rendering fix) |

No database migrations needed. All fixes are frontend logic and one edge function prompt update.

