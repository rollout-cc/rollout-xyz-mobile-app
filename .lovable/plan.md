

# Artist Role Access Control — Implementation Plan

## What We're Fixing

Artists currently see the full roster list, A&R Signings tab, and "Company" in mobile nav. They should only see: **Home** (their artist profile), **My Work**, **Outreach**, and **Rolly**.

## Changes

### 1. Sidebar — Update artist nav items
**File**: `src/components/AppSidebar.tsx`

- Rename "My Artist" to **"Home"** (keep `Building2` icon or switch to `Home` icon)
- Add **"Outreach"** nav item linking to `/roster?tab=outreach` with `Globe` icon

### 2. Mobile Bottom Nav — Fix artist items
**File**: `src/components/MobileBottomNav.tsx`

Replace current artist items with:
- **My Work** → `/my-work`
- **Home** → `/roster/:artistId` (their profile)
- **Outreach** → `/roster?tab=outreach`
- **Rolly**

### 3. Roster Page — Hide tabs for artist role
**File**: `src/pages/Roster.tsx`

When `isArtistRole`:
- Force `activeTab` to `"outreach"`
- Hide the tab bar entirely
- Only render `<MarketingOutreach />`
- Show page title as "Outreach"

### Technical Details

- No database changes — purely UI/routing
- Uses existing `isArtistRole` and `assignedArtistIds` from `useSelectedTeam()`
- Import `Globe` and `Home` icons from `lucide-react`

