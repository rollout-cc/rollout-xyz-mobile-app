

# Meeting Transcript → Tasks

## Summary
Add an "Import Transcript" button next to the Completed toggle on each artist's Work tab. Users select a source (Otter, Zoom, Google Meet, Granola, or Manual), paste/upload a transcript, and AI extracts tasks that get reviewed and bulk-created for that artist.

## What Gets Built

### 1. Database: `meeting_transcripts` table
- `id`, `team_id`, `artist_id` (nullable), `source` (otter/zoom/google_meet/granola/manual), `title`, `raw_text`, `extracted_tasks` (jsonb), `status` (pending/processed), `created_by`, `created_at`
- RLS: team members can read/write via `is_team_member()`

### 2. Edge Function: `extract-meeting-tasks`
- Accepts `{ transcript, source, artist_id, team_id }`
- Fetches artist name + team member names for context matching
- Calls Lovable AI Gateway (Gemini 2.5 Flash) with structured extraction prompt
- Returns JSON array: `[{ title, assignee_hint, due_date, campaign_hint }]`
- Uses existing anonClient + JWT validation pattern from other edge functions

### 3. UI: `ImportTranscriptDialog.tsx`
A dialog with 3 steps:

**Step 1 — Source & Input**
- 5 source chips: Otter, Zoom AI Companion, Google Meet, Granola, Manual
- Per-source instruction card:
  - Otter: "Open conversation → Share → Copy transcript"
  - Zoom: "Go to zoom.us → Recordings → open meeting → copy transcript or download .vtt"
  - Google Meet: "Open the meeting notes doc in Google Docs → Select All → Copy"
  - Granola: "Open meeting in Granola → transcript tab → Select All → Copy"
  - Manual: "Paste any meeting transcript or notes"
- Textarea for paste + file upload button (.txt, .vtt, .srt)
- Client-side VTT/SRT → plain text parser

**Step 2 — Extracting** (loading state)

**Step 3 — Review & Create**
- Checklist of extracted tasks (toggle on/off)
- Editable title per task
- Campaign dropdown (pre-filled from AI hint, populated from artist's initiatives)
- Assignee dropdown (team members)
- "Create Selected" → bulk insert into `tasks` table with `artist_id` pre-set

### 4. Integration Points

**Desktop (ArtistDetail.tsx, line ~465-473):** Add an "Import Transcript" button next to the "Completed" switch, matching existing control styling.

**Mobile (ArtistDetail.tsx, line ~489-498):** Add "Import Transcript" as a menu item in the existing `DropdownMenu`.

## Files

| File | Action |
|------|--------|
| DB migration | Create `meeting_transcripts` table + RLS |
| `supabase/functions/extract-meeting-tasks/index.ts` | Create — AI extraction edge function |
| `src/components/meetings/ImportTranscriptDialog.tsx` | Create — full dialog component |
| `src/components/meetings/TaskReviewList.tsx` | Create — review/edit/bulk-create component |
| `src/pages/ArtistDetail.tsx` | Add import button next to Completed toggle (desktop + mobile menu) |

