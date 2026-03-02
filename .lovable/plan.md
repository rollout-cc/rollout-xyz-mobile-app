

## Roster Reordering, Remove-from-Category, and Splits Tab

This plan covers three areas: (1) drag-and-drop reordering inside folders, (2) removing artists from categories, and (3) a full Splits system with master/publishing side tracking and external approval.

---

### Part 1: Artist Reordering Within Category Folders

Add drag-and-drop reordering of artists inside the folder detail view, with persistent sort order saved to the database.

- Add a `folder_sort_order` integer column (default 0) to the `artists` table via migration
- In the folder detail view in `Roster.tsx`, wrap artist cards with `DragDropContext` + `Droppable` + `Draggable` from `@hello-pangea/dnd`
- On drag end, optimistically reorder the local list and batch-update `folder_sort_order` for affected artists
- Add a `useReorderArtistsInFolder` mutation to `useRosterFolders.ts`
- Update `useArtists.ts` to order by `folder_sort_order`

---

### Part 2: Remove Artist from Category

Add a quick "Remove from category" action when viewing artists inside a folder.

- Pass an `insideFolder` prop to `ArtistCard` when rendered in the folder detail view
- When `insideFolder` is true, show a "Remove from category" button/icon on the card that calls `setArtistFolder({ artistId, folderId: null })`
- One click to remove -- artist moves back to the uncategorized section

---

### Part 3: Splits Tab on Artist Profile

A complete system for managing recording split ownership per song, organized by project, with master and publishing side percentages tracked separately.

#### 3a. Database Schema (single migration)

**`split_projects`** -- Groups songs by release
- `id` uuid PK
- `artist_id` uuid (FK to artists)
- `name` text (e.g. "Love Gun II")
- `project_type` text ('single', 'ep', 'album')
- `created_at` timestamptz

**`split_songs`** -- Individual tracks
- `id` uuid PK
- `project_id` uuid (FK to split_projects)
- `title` text (e.g. "Howling At The Moon")
- `sort_order` integer (default 0)
- `created_at` timestamptz

**`split_contributors`** -- Remembered contacts across projects
- `id` uuid PK
- `team_id` uuid (FK to teams)
- `name` text
- `email` text (nullable)
- `phone` text (nullable)
- `pro_affiliation` text (nullable -- BMI, ASCAP, SESAC, SONY/ATV, etc.)
- `ipi_number` text (nullable -- IPI/CAE number)
- `pub_ipi_number` text (nullable -- publisher IPI, separate from writer IPI)
- `created_at` timestamptz

**`split_entries`** -- The actual split per song per contributor
- `id` uuid PK
- `song_id` uuid (FK to split_songs)
- `contributor_id` uuid (FK to split_contributors)
- `role` text ('producer', 'songwriter', 'performer', 'manager', 'publisher', 'engineer', 'mixer', 'featured_artist')
- `master_pct` numeric (nullable, 0-100 -- master side ownership)
- `producer_pct` numeric (nullable, 0-100 -- producer share on publishing side)
- `writer_pct` numeric (nullable, 0-100 -- writer share on publishing side)
- `approval_status` text ('pending', 'approved', 'rejected', default 'pending')
- `approved_at` timestamptz (nullable)
- `approval_token` text (unique, auto-generated)
- `created_at` timestamptz

This mirrors the real spreadsheet structure where each contributor row has Masters Share %, Producers Share %, and Writers Share % as separate columns. A contributor can participate on just the master side, just the publishing side (producer or writer), or both.

**RLS policies**: Team members can SELECT via `is_team_member`. Owners/managers can INSERT/UPDATE/DELETE. Public SELECT on `split_entries` scoped by `approval_token` for the external approval page.

**Helper function**: `get_split_project_team_id(p_project_id uuid)` to look up the team through split_projects -> artists -> team_id for RLS.

#### 3b. Artist Profile -- Splits Tab

- Add "Splits" to the capsule tab row in `ArtistDetail.tsx` (alongside Tasks, Links, Release Plans)
- New `SplitsTab.tsx` component showing:
  - List of split projects as collapsible cards
  - "New Project" button (name + type: single/ep/album)
  - Each project shows its songs; click a song to expand and see/edit contributors inline
- New `SplitSongEditor.tsx` for inline editing per song:
  - Three percentage columns: Masters %, Producer %, Writer %
  - Each can be left blank (shown as "-") if the contributor doesn't participate on that side
  - Role dropdown, contributor name with autocomplete from known `split_contributors`
  - PRO affiliation and IPI numbers as optional inline fields
  - Running totals for each column that turn red if they exceed 100%
  - "Send for Approval" button per song

#### 3c. External Approval System

**Edge Function: `send-split-approval`**
- Accepts a `song_id`, looks up all contributors with pending approval
- Groups all of a contributor's entries across songs in the same project into one notification
- Sends an email (and SMS link if phone is available) to each contributor with a unique approval link
- The email shows ALL of their splits in one view -- song name, their master %, producer %, writer % for each song -- so they can review everything at once

**Edge Function: `approve-split`**
- Public endpoint (no auth required)
- Accepts a token, returns full song context (song title, project name, artist name, all contributors with their splits)
- Handles approve or reject actions per entry

**Public Approval Page (`ApproveSplit.tsx`)**
- Clean branded page (similar to the invite page pattern)
- Shows: Artist name, project name, song title
- Table of ALL contributors on that song with columns: Name, Role, Masters %, Producer %, Writer %, PRO
- Highlights the approver's own row
- "Approve" and "Decline" buttons
- Confirmation state after action

**Route**: `/splits/approve/:token` added to `App.tsx` as a public route

#### 3d. Contributor Memory

When a contributor is added to any song, they're saved to `split_contributors` with their contact info. Autocomplete suggests known contributors next time, pre-filling email, phone, PRO, and IPI data for speed.

#### 3e. SMS with Link (Y/N Reply as Follow-up)

Initial build sends SMS with a link to the approval page. Y/N reply support via Twilio webhook is a future enhancement.

---

### Technical Summary

**Database migration (single)**:
1. Add `folder_sort_order` to `artists` (default 0)
2. Create `split_projects`, `split_songs`, `split_contributors`, `split_entries` with RLS
3. Create `get_split_project_team_id` helper function

**New files**:
- `src/components/artist/SplitsTab.tsx`
- `src/components/artist/SplitProjectCard.tsx`
- `src/components/artist/SplitSongEditor.tsx`
- `src/hooks/useSplits.ts`
- `src/pages/ApproveSplit.tsx`
- `supabase/functions/send-split-approval/index.ts`
- `supabase/functions/approve-split/index.ts`

**Modified files**:
- `src/pages/ArtistDetail.tsx` -- Add "Splits" tab
- `src/pages/Roster.tsx` -- DnD reordering in folder view, pass `insideFolder` prop
- `src/components/roster/ArtistCard.tsx` -- "Remove from category" action
- `src/hooks/useRosterFolders.ts` -- Add reorder mutation
- `src/hooks/useArtists.ts` -- Order by `folder_sort_order`
- `src/App.tsx` -- Add `/splits/approve/:token` public route

