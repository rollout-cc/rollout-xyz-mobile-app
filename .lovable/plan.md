

# Fix Three Pre-Launch Issues

## Issue 1: Black Logo on Dark Background
The JoinTeam page imports `rollout-logo-white.png` from `src/assets/`, but the current file may be the black version. Replace `src/assets/rollout-logo-white.png` with the uploaded white logo (`Rollout_Logo_Flag_white-2.png`).

**File**: Copy `user-uploads://Rollout_Logo_Flag_white-2.png` to `src/assets/rollout-logo-white.png`

## Issue 2: Redundant Name Entry
The user enters their name on the signup form (step "auth"), then is asked to "Confirm your profile" with a name field again (step "profile"). 

**Fix**: When the user already provided a name during signup (stored in `fullName` state which is pre-populated from the invite), skip the "profile" step entirely and go straight to "personal" details. The logic in the `useEffect` at line 85-103 partially does this but only when `invitePreview?.invitee_name` is set. We need to also skip when `fullName` is already populated from the signup form.

**File**: `src/pages/JoinTeam.tsx`
- In the `useEffect` that fires when user authenticates (line 85-103), after checking the profile, if `fullName` is already set (from signup form or invite), skip the profile step and go directly to accepting the invite then the personal details step.

## Issue 3: Showing All Artists Instead of Assigned Ones
The `accept-invite` edge function queries ALL artists on the team roster and returns them, rather than only the ones assigned to the invited user via `artist_permissions`.

**Fix**: Change the artist query in `accept-invite/index.ts` to only return artists that the user was given explicit permissions to via the `artist_permissions` table.

**File**: `supabase/functions/accept-invite/index.ts` (lines 188-192)
- Replace the broad `artists` query with a query that joins `artist_permissions` to only return artists the user has access to:
```sql
SELECT a.id, a.name, a.avatar_url 
FROM artists a 
JOIN artist_permissions ap ON ap.artist_id = a.id 
WHERE ap.user_id = <user_id>
```

Additionally, in the "artists" step of JoinTeam.tsx (lines 506-535), if the user has no assigned artists, skip this step entirely instead of showing "No specific artist assignments yet."

## Technical Details

| Change | File | Type |
|--------|------|------|
| Replace logo asset | `src/assets/rollout-logo-white.png` | Asset copy |
| Skip redundant name step | `src/pages/JoinTeam.tsx` | Frontend logic |
| Filter artists to assigned only | `supabase/functions/accept-invite/index.ts` | Edge function |
| Skip empty artists step | `src/pages/JoinTeam.tsx` | Frontend logic |

