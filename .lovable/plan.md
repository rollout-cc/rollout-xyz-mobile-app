

# Distribution Section

## What We're Building
A new **Distribution** page between "Artists" and "My Work" in the nav. It's a 6-step release wizard that pulls from existing split projects, validates PRO/MLC registration data, requires contributor emails for approval, and tracks platform distribution status.

## Database Changes (1 migration)

Three new tables:

**`releases`** — Core release record
- `id`, `team_id` (FK teams), `artist_id` (FK artists), `name`, `release_type` (single/ep/album), `release_date`, `artwork_url`, `genre`, `secondary_genre`, `record_label`, `upc_code`, `status` (draft/ready/submitted), `split_project_id` (nullable FK split_projects), `pro_registration_status` (not_started/in_progress/completed), `mlc_registration_status` (not_started/in_progress/completed), `created_at`

**`release_tracks`** — Tracks within a release
- `id`, `release_id` (FK releases), `title`, `isrc_code`, `song_id` (nullable FK split_songs), `sort_order`, `duration_seconds`, `is_explicit`, `created_at`

**`release_platforms`** — Which DSPs to distribute to
- `id`, `release_id` (FK releases), `platform` (text), `enabled` (boolean default true)

RLS: team member SELECT via `is_team_member(team_id)`, owner/manager INSERT/UPDATE/DELETE via `is_team_owner_or_manager(team_id)`. Helper function `get_release_team_id(release_id)` for child tables.

## Wizard Flow (6 steps)

### Step 1 — Tracks
- Select artist from roster dropdown
- Optionally link an existing split project → auto-populate tracks from `split_songs`
- Add tracks manually, reorder via drag
- Each track row shows title + explicit toggle

### Step 2 — Details
- Artwork upload (to `artist-assets` bucket)
- Release name, genre, secondary genre, record label, release date picker
- UPC code field, per-track ISRC fields

### Step 3 — Partners (DSPs)
- Checkbox grid: Spotify, Apple Music, Tidal, Amazon Music, YouTube Music, Deezer, Pandora, iHeartRadio
- "Select All" toggle

### Step 4 — Rights Registration (ROLLOUT-unique)
- **PRO section**: For each contributor on linked split entries, show name, PRO affiliation (ASCAP/BMI/SESAC), IPI number. Red flags for missing PRO or IPI data.
- **MLC section**: Checklist per song — has it been registered with The MLC for mechanical royalties? Toggle per track.
- **Copyright**: Optional prompt for US Copyright Office registration.
- All data pulled from `split_contributors` via linked `split_project_id`.

### Step 5 — Split Approval
- If split project linked: show read-only split summary per track (master/producer/writer/publisher %).
- **Key addition**: Each contributor row shows their email. If email is missing, show a red warning — they MUST have an email to receive the approval request.
- Inline email input for contributors missing emails → updates `split_contributors.email`.
- "Send Approval Requests" button triggers `send-split-approval` edge function for all pending contributors.
- Status badges per contributor: pending / approved / rejected.
- If no split project linked: prompt to create one or link existing.

### Step 6 — Review
- Summary of all steps with ✓/✗ status badges
- "Save as Draft" and "Mark Ready" actions
- Shows warnings (missing emails, incomplete splits, unregistered PRO)

## Navigation Changes
- **AppSidebar.tsx**: Add `{ to: "/distribution", icon: Disc3, label: "Distribution" }` between Artists and My Work (line 87, for owner/manager nav)
- **MobileBottomNav.tsx**: Add Distribution between Artists and My Work (line 33)
- **App.tsx**: Add route with `RoleGate allow={["team_owner", "manager"]}`

## New Files
- `src/pages/Distribution.tsx` — Release list + "New Release" button
- `src/components/distribution/ReleaseWizard.tsx` — 6-step wizard container with progress bar
- `src/components/distribution/StepTracks.tsx`
- `src/components/distribution/StepDetails.tsx`
- `src/components/distribution/StepPlatforms.tsx`
- `src/components/distribution/StepRightsRegistration.tsx`
- `src/components/distribution/StepSplitApproval.tsx`
- `src/components/distribution/StepReview.tsx`
- `src/hooks/useReleases.ts` — CRUD hooks for releases, tracks, platforms

## Design
- Follows existing `SplitWizard` step-based pattern
- Numbered progress indicator at top (like screenshots)
- Reuses existing UI components (Card, Input, Select, Checkbox, Badge, Button)
- Consistent with platform styling (muted backgrounds, border-border, etc.)

