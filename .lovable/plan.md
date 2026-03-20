

## Plan: Fix Welcome Email Subject + Remove A&R Route (Keep A&R Feature)

### 1. Fix Welcome Email Subject Line
**File:** `supabase/functions/admin-actions/index.ts`

The subject currently says: `Welcome to Rollout — ${team_name}` (e.g., "Welcome to Rollout — Slatersworld").

Change to: `Welcome to Rollout, ${full_name.split(' ')[0]}!` (e.g., "Welcome to Rollout, Donny!") — uses the person's first name instead of the company name.

### 2. Fix Welcome Email Logo (broken image)
Upload the rollout flag image to the `email-assets` storage bucket so the `<img>` tag in the email resolves correctly. Update the `src` URL if needed.

### 3. Replace Footer Plain-Text "ROLLOUT" with Logo Image
Replace the text-based "ROLLOUT" footer with an `<img>` tag pointing to the hosted wordmark (same logo used in the admin console header).

### 4. Remove `/ar` Route from App.tsx — Keep All A&R Components
**File:** `src/App.tsx`
- Remove the `ARList` lazy import (line 38)
- Remove the `/ar` route (line 128) and `/ar/:prospectId` route (line 129)

**File:** `src/pages/ARList.tsx` — Delete this file (it just redirects to `/roster?tab=ar`)

**Keep everything else:** All A&R components (`ARContent`, `PipelineBoard`, `ProspectTable`, `ProspectDrawer`, `NewProspectDialog`, `DealTermsCard`), the `useProspects` hook, and the A&R tab inside the Roster page remain fully intact.

### 5. Clean Up Unused Import
**File:** `src/components/AppSidebar.tsx`
- Remove `Radar` from the lucide-react import if it's no longer used anywhere.

### Summary of What's Preserved
- A&R Signings tab inside the Artists (Roster) page — fully functional
- All prospect CRUD, pipeline board, Spotify search, deal terms
- The `/roster?tab=ar` URL still works to deep-link to the A&R tab

