

# Platform Bug Audit

## 1. Google Sign-In Not Working (CRITICAL)

The Login code is correct — it uses `lovable.auth.signInWithOAuth("google")` with the managed Lovable Cloud OAuth. The code itself has no bugs. The issue is likely that Google OAuth needs to be enabled/configured in the Lovable Cloud authentication settings.

**Fix:** Open the Lovable Cloud backend settings and verify Google OAuth is enabled. If it's already enabled, check redirect URL configuration includes `https://app.rollout.cc` and `https://rollout-cc.lovable.app`.

No code change needed — this is a configuration issue.

## 2. `useState` Misused as `useEffect` in PlanWizard (BUG)

```typescript
// Line 283 — PlanWizard.tsx
useState(() => {
  fetchNextQuestion([]);
});
```

`useState` with an initializer is NOT the same as `useEffect`. This runs during render (not after mount), and `fetchNextQuestion` calls `setIsLoadingQuestion` etc. — calling setState during render is a React violation that causes unpredictable behavior. This could cause the plan wizard to double-fire or silently fail.

**Fix:** Replace with `useEffect(() => { fetchNextQuestion([]); }, [])`.

## 3. Five Edge Functions Missing from `config.toml` (BUG)

These functions exist but have no `verify_jwt = false` entry, so they default to `verify_jwt = true`. With the ES256 JWT issue on Lovable Cloud, these will reject valid tokens:

- `get-stripe-config`
- `invite-preview`
- `milestone-ical`
- `scrape-link-metadata`
- `spotify-artist`

**Fix:** Add all five to `config.toml` with `verify_jwt = false`.

## 4. Plan Execution Failures — `rolly-generate-plan` Not Setting `artist_name` (LIKELY ROOT CAUSE)

The `rolly-execute-plan` function uses `resolveArtistId(item.artist_name)` to match items to artists. If the AI model returns an `artist_name` that doesn't match any artist on the roster (e.g. slightly different casing or spelling), it falls back to the first artist. But if NO artists exist on the team, `resolveArtistId` returns `null`, and the item fails with "Artist not found".

Additionally, in `PlanWizard.tsx` the draft items use field `artist_name` from the generate-plan response, but when passing to execute-plan, the items go through as-is. If the AI produces names that differ from the DB (e.g. "Pote Baby" vs "POTE BABY"), the fuzzy match may fail for some items.

**Fix:** Add more robust matching (normalize whitespace, trim, case-insensitive exact match before substring match) and add a fallback log showing which artist name failed to match.

## 5. `CompanyBudgetSection` Uses `(supabase as any)` (LOW)

Multiple components cast `supabase as any` to access tables not in the generated types (`company_budget_categories`, `company_expenses`, `staff_employment`, `vendor_invoices`, etc.). This bypasses TypeScript safety. Not a runtime bug per se, but means schema mismatches won't be caught at compile time.

**No code change needed** — this is a known pattern for tables added after type generation.

## 6. Manager Permission Logic Has Dead Code (LOW)

In `TeamContext.tsx` lines 134-141, expressions like `true || !!membershipPerms?.perm_view_finance` — the `true ||` means the stored permission flag is never checked. Intentional (managers always get these), but the `||` branch is dead code that adds confusion.

**Fix:** Remove the dead `|| !!membershipPerms?.perm_xxx` branches for clarity.

---

## Implementation Plan

### Step 1: Fix PlanWizard useState → useEffect
- `src/components/rolly/PlanWizard.tsx` line 283: Replace `useState(() => { fetchNextQuestion([]); })` with `useEffect(() => { fetchNextQuestion([]); }, [])` and add the import.

### Step 2: Add missing functions to config.toml
- Add `get-stripe-config`, `invite-preview`, `milestone-ical`, `scrape-link-metadata`, `spotify-artist` with `verify_jwt = false`.

### Step 3: Improve artist name matching in rolly-execute-plan
- Normalize names (trim, lowercase) before matching.
- Add exact match → includes match → Levenshtein-like fallback.
- Log the unmatched name clearly.

### Step 4: Clean up dead permission logic in TeamContext
- Remove `true ||` prefixes in manager permission block.

### Step 5: Google OAuth — verify configuration
- No code change. Needs configuration check via backend settings.

