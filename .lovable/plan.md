

## Redesign: Spending Per Act Section

### Problem
The current layout is visually cluttered -- each artist row shows a header, 4 financial metrics, a variable grid of category progress bars, AND an overall utilization bar. This creates a dense wall of information that's hard to scan.

### Design Direction (inspired by references)
Shift to a **table-like card layout** per artist that is scannable, with clear visual hierarchy:

1. **Artist header row**: Avatar, name, campaign count, task completion pill -- all on one line with an arrow to navigate
2. **Financial summary row**: Budget, Spent, Revenue, P&L in a clean 4-column grid with proper spacing and color coding
3. **Category bars**: Show as a compact 3-column grid of mini progress bars (label + spent/budget + bar) -- same as now but tighter
4. **Overall utilization**: A single full-width bar at the bottom with percentage -- simplified styling
5. **Dividers**: Clean bottom borders between artists, more generous vertical spacing

### Specific Changes

**File: `src/components/overview/SpendingPerActSection.tsx`**

- Increase avatar from 40px to 44px with a border for definition
- Make artist name `text-base font-bold` (currently `text-sm font-semibold`) for better hierarchy
- Move campaign count and task count into a single subtle caption line beneath the name
- Financial metrics row: use `text-base font-bold` for values (currently `text-sm`) with `caption` labels above -- bigger numbers are easier to scan
- Category progress bars: keep the 3-column grid but use slightly thicker bars (`h-2` instead of `h-1.5`) and add a small gap between rows
- Overall utilization bar: thicker (`h-2`), with the percentage displayed more prominently
- Add `px-2` padding to each artist row for better breathing room on hover
- Remove the "View Full Roster" button at the bottom (the arrow on each row already navigates)
- Tighten vertical spacing between sections within each artist card

### Visual Hierarchy (top to bottom per artist)
```text
[Avatar 44px]  Artist Name (bold, base)
               4 campaigns  ·  2/12 tasks         [->]

Budget         Spent          Revenue        P&L
$75,000        $26,050        $10,100        -$15,950

Recording   $8,500/$25,000  | Travel    $750/$10,000  | Content  $11,500/$8,000
[===-----]                  | [=-------]              | [========] (red)

Overall Utilization                                              35%
[===============--------------------------------]
───────────────────────────────────────────────────
```

This is a purely front-end styling change to `SpendingPerActSection.tsx`. No data model or query changes needed.

