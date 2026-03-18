

# Performance Audit: Speed & Flow Improvements

After reviewing the full codebase, here are the bottlenecks and concrete fixes ranked by impact.

---

## 1. Waterfall Query Chains (HIGH IMPACT)

**Problem:** Several pages chain queries sequentially -- each waits for the previous to finish before starting. This creates "waterfall" loading where the page takes 3-4x longer than necessary.

**Where it happens:**
- **Overview.tsx**: Fetches `artists` first, then waits for that result before fetching `budgets`, `transactions`, and `initiatives` (all use `enabled: artists.length > 0`). That's 3 sequential hops.
- **FinanceContent.tsx**: Same pattern -- `artists` -> `budgets`, `transactions`, `company_expenses`, etc. Plus `staffEmployment` -> `staffProfiles` is another waterfall.
- **StaffContent.tsx**: `memberships` -> `memberProfiles`, and `artists` -> `transactions`.

**Fix:** Create a single database function (RPC) that returns all needed data for the Overview and Finance pages in one call. Alternatively, restructure queries to use the team_id directly (budgets, transactions can be fetched via joins or team_id filter) so they all fire in parallel.

---

## 2. `useTeamPlan()` Calls an Edge Function Every 60 Seconds (HIGH IMPACT)

**Problem:** `useTeamPlan()` invokes the `check-subscription` edge function (cold-start latency ~200-800ms) on every page load and re-polls every 60s. This is called from at least 8 different components. While React Query deduplicates, the edge function call itself is slow and blocks UI decisions (feature gating).

**Fix:**
- Increase `staleTime` to 5 minutes (from 30s) and `refetchInterval` to 5 minutes (from 60s)
- Cache the result in `localStorage` as a fallback so the first render doesn't block on network

---

## 3. `useTeams()` Called 14+ Times Across Components (MEDIUM IMPACT)

**Problem:** `useTeams()` is called in 14 places. React Query deduplicates the network call, but each call triggers the hook logic and context lookups. More importantly, the `role` check pattern (`teams.find(t => t.id === teamId)?.role`) is repeated everywhere.

**Fix:** Move `role` into `TeamContext` so components just read `const { role } = useSelectedTeam()` instead of re-querying teams and filtering.

---

## 4. Duplicate Data Fetching Between Pages (MEDIUM IMPACT)

**Problem:** Overview.tsx, FinanceContent.tsx, and StaffContent.tsx all fetch the same data (artists, transactions, tasks, memberships, profiles) with different query keys (`overview-artists` vs `finance-artists` vs `staff-artists`). This means navigating between tabs re-fetches everything from scratch.

**Fix:** Unify query keys. Use `["artists", teamId]` everywhere instead of `["overview-artists", teamId]`, `["finance-artists", teamId]`, `["staff-artists", teamId]`. This lets React Query share the cache across all views.

---

## 5. Heavy `useMemo` Computations on Every Render (MEDIUM IMPACT)

**Problem:** `staffMembers` computation in Overview.tsx has an O(n*m) loop inside it (for each member, it iterates all other members to compute `maxRevenue`). With more staff, this becomes expensive.

**Fix:** Pre-compute `maxRevenue` once outside the map, then pass it in. Single pass instead of quadratic.

---

## 6. Missing Prefetching on Navigation (LOW-MEDIUM IMPACT)

**Problem:** When a user clicks an artist card, it navigates to ArtistDetail which then starts fetching from scratch. No data is prefetched on hover or anticipation.

**Fix:** Add `queryClient.prefetchQuery` on artist card hover/mouse-enter for the artist detail data. This makes the transition feel instant.

---

## 7. Large Bundle: DnD Library Loaded on Every Page (LOW IMPACT)

**Problem:** `@hello-pangea/dnd` (~45KB gzipped) is imported in Roster.tsx and Overview.tsx. It's lazy-loaded via React.lazy, but it's still a significant chunk for pages that may not need drag-and-drop.

**Fix:** No immediate action needed since pages are already lazy-loaded. Could consider dynamic import of the DnD wrapper only when folders exist.

---

## 8. Edge Function Cold Starts (LOW IMPACT, Infrastructure)

**Problem:** `spotify-artist`, `check-subscription`, `scrape-chartmasters` all have cold-start latency. The Spotify artist data is fetched via edge function on every artist detail page load (30min staleTime helps but first visit is slow).

**Fix:** Already mitigated by staleTime. Could add a background sync job instead of on-demand fetching.

---

## Implementation Plan (Ordered by Impact)

### Step 1: Unify query keys across Overview/Finance/Staff
- Change all `["finance-artists", teamId]`, `["overview-artists", teamId]`, `["staff-artists", teamId]` to `["artists-summary", teamId]`
- Same for transactions, budgets, tasks, memberships, profiles
- Instant cache sharing = no re-fetch when switching tabs

### Step 2: Remove waterfall queries
- Fetch budgets and transactions using `team_id` joins instead of waiting for artist IDs
- Create an RPC function `get_team_finance_summary` that returns artists + budgets + transactions in one call

### Step 3: Optimize useTeamPlan caching
- Increase staleTime to 5min, refetchInterval to 5min
- Add localStorage fallback for instant first render

### Step 4: Move role into TeamContext
- Eliminate 14 redundant `useTeams()` calls for role checking

### Step 5: Fix quadratic staffMembers computation
- Pre-compute maxRevenue in a single pass

### Step 6: Add prefetching on artist card hover
- `onMouseEnter` triggers `queryClient.prefetchQuery` for artist detail

### Files to Edit
1. `src/pages/Overview.tsx` -- unify query keys, remove waterfalls
2. `src/components/overview/FinanceContent.tsx` -- unify query keys, remove waterfalls
3. `src/components/overview/StaffContent.tsx` -- unify query keys
4. `src/hooks/useTeamPlan.ts` -- increase cache times
5. `src/contexts/TeamContext.tsx` -- add role to context
6. `src/components/roster/ArtistCard.tsx` -- add prefetch on hover
7. Database migration -- create RPC function for combined finance data

