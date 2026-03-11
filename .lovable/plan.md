

## Combined Plan: Deep Plan Wizard + Expanded Workspace

Two changes shipping together:

### 1. Deep Plan Wizard (~30 conditional steps)

**File: `src/components/rolly/PlanWizard.tsx`**

Expand `PLAN_STEPS` from 8 to ~30 steps with `showIf` branching. Helper function `hasVertical(answers, v)` checks if `answers.verticals` array includes a value.

New steps after the existing 8 core steps:

| Step ID | Question | Type | Condition |
|---|---|---|---|
| `era_theme` | "What's the story or theme of this era?" | Text | Not weekly |
| `visual_direction` | "What's the visual direction?" | Single | Not weekly |
| `music_ready` | "Is the music done?" | Single | Music vertical |
| `distributor` | "Do you have a distributor locked in?" | Single | Music vertical |
| `playlist_strategy` | "What's your playlist strategy?" | Multi | Music vertical |
| `radio_plans` | "Any radio plans?" | Single | Music vertical |
| `merch_designs` | "Do you have merch designs ready?" | Single | Merch vertical |
| `merch_fulfillment` | "How will merch be fulfilled?" | Single | Merch vertical |
| `merch_link` | "Drop the link to designs or store" | Text | Merch & designs != "No" |
| `merch_drop_strategy` | "Limited drops or ongoing collection?" | Single | Merch vertical |
| `live_type` | "What live events are planned?" | Multi | Touring vertical |
| `booking_agent` | "Do you have a booking agent?" | Single | Touring vertical |
| `sync_cleared` | "Is the music cleared for sync?" | Single | Sync vertical |
| `sync_pitches` | "Any active sync pitches?" | Single | Sync vertical |
| `content_types` | "What content is planned?" | Multi | Not weekly |
| `content_team` | "Who's handling content?" | Single | Not weekly |
| `has_publicist` | "Does the artist have a publicist?" | Single | Not weekly |
| `publicist_invited` | "Have they been invited to Rollout?" | Single | publicist = Yes |
| `press_targets` | "Any press targets?" | Multi | Not weekly |
| `team_roles` | "Who else is working on this?" | Multi | Not weekly |
| `team_invited` | "Have these team members been invited?" | Single | team_roles has selections |
| `seeding_strategy` | "How do you want to build anticipation?" | Multi | Not weekly |
| `additional_context` | "Anything else ROLLY should know?" | Text | Always |

The `isTextOnly` check expands to cover `era_theme`, `merch_link`, `additional_context`.

### 2. Expanded Workspace (Release Plans, Expenses, Links)

**File: `src/components/rolly/RollyWorkspace.tsx`**

Add 3 new queries using the existing `artists` array for IDs:
- **Initiatives** (`initiatives` table) — active campaigns, join `artists(name)`, filter `is_archived = false`
- **Transactions** (`transactions` table) — recent expenses, filter `type = 'expense'`, join `artists(name)`, limit 10
- **Links** (`artist_links` table) — recent links, join `artists(name)`, limit 10

Update stats bar: replace "Artists" with "Campaigns" (count of active initiatives).

Add 3 new Card sections:
- **Release Plans** (`CalendarRange` icon) — name, artist, date range
- **Recent Expenses** (`Receipt` icon) — description, artist, amount, date
- **Links** (`Link` icon) — title, artist, truncated URL

Each with contextual empty states.

### 3. Updated Prompt Compilation

**File: `src/pages/Rolly.tsx`**

Expand `compilePlanPrompt` to structure all new wizard answers into sections: Core, Narrative, Distribution, Merch Ops, Live/Touring, Sync, Content, PR & Team, Seeding, Additional Context. Include actionable instructions like "Create a task to invite publicist as Guest" when `publicist_invited` is "Not yet".

### Files modified
- `src/components/rolly/PlanWizard.tsx` — expand steps
- `src/components/rolly/RollyWorkspace.tsx` — add initiatives, expenses, links sections
- `src/pages/Rolly.tsx` — expand `compilePlanPrompt`

