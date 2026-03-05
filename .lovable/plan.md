

## Fix Artist Info Tab Crash + Add Error Boundaries + Harden Database Access

### Investigation Results

I navigated to an artist profile and clicked Info — it loaded fine for "Cigarettes After Sex." This suggests the crash is **data-dependent**: a specific artist's `artist_travel_info` row likely has a value that causes a runtime error (e.g., `date-fns` `parse()` crashing on malformed date, or a component receiving `undefined` where it expects a string).

Since there's **no Error Boundary** anywhere in the app, any thrown error in any component results in a full white screen crash with no recovery.

### Plan

#### 1. Add React Error Boundary component

Create `src/components/ErrorBoundary.tsx` — a class component that catches render errors and shows a recovery UI with a "Reload" button instead of a white screen.

#### 2. Wrap key views in Error Boundaries

In `ArtistDetail.tsx`, wrap each view panel (`ArtistInfoTab`, `FinanceTab`, `WorkTab`, etc.) in an `<ErrorBoundary>` so one tab crashing doesn't kill the whole page.

In `App.tsx`, wrap `<AppRoutes>` in a top-level `<ErrorBoundary>` as a safety net.

#### 3. Add global `unhandledrejection` handler

In `App.tsx`, add a `useEffect` that listens for `unhandledrejection` events and shows a toast instead of crashing.

#### 4. Harden `ArtistInfoTab` against bad data

- **`DateField`**: Wrap `parse(value, "yyyy-MM-dd", new Date())` in a try/catch — malformed date strings crash `date-fns`
- **`MemberCard`**: Add null guards for all `member` properties accessed directly
- **`PROSelectField`**: Already guarded via `useTeamRegion` defaults, but add fallback if `getPROsForRegion` returns empty arrays

#### 5. Move `toast` import to top of `ArtistDetail.tsx`

The `import { toast } from "sonner"` is at line 327 (mid-file, before `ObjectivesPanel`). While ES module hoisting makes this technically work, it's bad practice and could cause confusion. Move it to the top imports block. Same for `import { Plus } from "lucide-react"` at line 313 and `import { InlineField }` at line 328.

### Files to create/modify

| File | Change |
|------|--------|
| `src/components/ErrorBoundary.tsx` | **New** — React error boundary with recovery UI |
| `src/App.tsx` | Wrap routes in ErrorBoundary, add `unhandledrejection` handler |
| `src/pages/ArtistDetail.tsx` | Wrap each view in ErrorBoundary, move imports to top |
| `src/components/artist/ArtistInfoTab.tsx` | try/catch in DateField parse, null guards |

