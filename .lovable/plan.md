

# Full App Flow Plan

This plan integrates your flowchart with the onboarding and bulk-add decisions we discussed. It covers the complete data model and all pages/features.

---

## What Already Exists

- Authentication (login/signup), AuthContext
- Teams, team_memberships, team switcher in sidebar
- Artists table with Spotify search + manual creation
- Initiatives, tasks, budgets tables with RLS
- Profiles table (full_name, phone_number, job_role, avatar_url)
- Roster page with add artist dialog

## What Needs to Be Built

### Phase 1: Onboarding Flow

After signup, redirect new users (who have no teams) to an onboarding page:

1. **Onboarding page** (`/onboarding`) -- collects:
   - User name (saved to `profiles.full_name`)
   - Team name (creates team + team_membership)
2. Redirect to `/roster` after completion
3. Update `ProtectedRoute` to detect "no teams" and redirect to `/onboarding`

### Phase 2: Bulk Add Artist Dialog

Update the existing Add Artist dialog:
- After clicking "Add" on a Spotify result, show a checkmark on that artist instead of closing the dialog
- Track which `spotify_id`s are already in the roster to prevent duplicates
- User closes dialog manually when done
- Reset search state on close

### Phase 3: Artist Detail Page

New route: `/roster/:artistId`

**Artist profile page with 5 tabs** matching your flowchart:

**Tab 1 -- Artist Information** (the highlighted yellow box in your diagram)
- Upload Information (avatar, banner -- uses file storage)
- Personal Information (name, genres, goals, focus areas -- already in `artists` table)
- Contacts (new `artist_contacts` table: name, role, email, phone)
- Travel Information (new `artist_travel_info` table: passport name, dietary needs, etc.)
- Clothing Preference (new `artist_clothing` table: sizes, preferences)

**Tab 2 -- Campaigns** (called "Initiatives" in current DB)
- List campaigns with name, date range, description
- Create/edit/delete campaigns
- Uses existing `initiatives` table (rename display label to "Campaigns")

**Tab 3 -- Tasks**
- List tasks filtered by this artist
- Create/edit/complete tasks
- Uses existing `tasks` table

**Tab 4 -- Links**
- Organized into folders
- New tables: `artist_link_folders` and `artist_links`
- Shareable folder view (public URL)

**Tab 5 -- Timelines**
- Milestones on a visual timeline
- New table: `artist_milestones` (title, date, description, artist_id)
- Shareable timeline view (public URL)

### Phase 4: Navigation Updates

- Clicking an artist card on the Roster page navigates to `/roster/:artistId`
- Sidebar already has Roster and Tasks links
- Add Settings link to sidebar

---

## New Database Tables Needed

| Table | Key Columns |
|---|---|
| `artist_contacts` | artist_id, name, role, email, phone |
| `artist_travel_info` | artist_id, passport_name, dietary_restrictions, notes |
| `artist_clothing` | artist_id, shirt_size, pant_size, shoe_size, notes |
| `artist_link_folders` | artist_id, name, is_public, public_token |
| `artist_links` | folder_id, title, url, description |
| `artist_milestones` | artist_id, title, date, description, is_public |

All tables will have RLS policies matching existing patterns (team members can view, owners/managers can write).

---

## Implementation Order

1. Onboarding page + redirect logic
2. Bulk add dialog improvements
3. Database migration for new tables
4. Artist detail page with all 5 tabs
5. Links shared view + Timeline shared view (public routes)

---

## Technical Details

### Files to create:
- `src/pages/Onboarding.tsx` -- team creation step
- `src/pages/ArtistDetail.tsx` -- tabbed artist profile
- `src/components/artist/ArtistInfoTab.tsx`
- `src/components/artist/CampaignsTab.tsx`
- `src/components/artist/TasksTab.tsx`
- `src/components/artist/LinksTab.tsx`
- `src/components/artist/TimelinesTab.tsx`
- Hooks: `useArtistDetail.ts`, `useArtistContacts.ts`, `useArtistLinks.ts`, `useArtistMilestones.ts`

### Files to modify:
- `src/App.tsx` -- add new routes (`/onboarding`, `/roster/:artistId`, `/shared/links/:token`, `/shared/timeline/:token`)
- `src/pages/Roster.tsx` -- bulk add behavior, click-to-navigate on artist cards
- `src/components/AppLayout.tsx` -- onboarding redirect logic

### Database:
- One migration with all new tables + RLS policies

