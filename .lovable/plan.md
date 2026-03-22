


# Rolly Intelligence Upgrade — IMPLEMENTED

## What was built

### 1. Session Memory (Internal)
- New `rolly_session_summaries` table — service-role only, no user RLS
- After every conversation, Rolly auto-summarizes using gemini-2.5-flash-lite and stores it
- Last 5 summaries injected into system prompt every request as passive context
- Rolly references past sessions naturally without announcing it has memory

### 2. Proactive Milestone Alerts
- Every request, fetches milestones within 14 days for all team artists
- For each milestone, counts tasks within ±7 days to assess coverage density
- Thin coverage (< 3 tasks) flagged in system prompt context
- Rolly mentions it naturally when relevant — no forced alerts

### 3. Artist Tone Profiles (Auto-generated)
- New `rolly_profile` text column on `artists` table
- After each conversation, AI auto-generates/updates the profile based on what it learned
- Profiles injected into system prompt so Rolly calibrates tone per artist
- No UI — fully backend/AI-managed

### 4. Five New Read Tools
- `get_artist_milestones` — fetch upcoming/recent milestones
- `get_artist_campaigns` — fetch active initiatives
- `get_artist_tasks` — fetch open tasks (non-done)
- `get_artist_budgets` — fetch budget categories
- `search_knowledge` — query industry knowledge base

### 5. System Prompt Upgrades
- DATA AWARENESS: Read before write, check existing data, avoid duplicates
- ARTIST PROFILES: Calibrate tone per artist stage/priority
- SESSION CONTINUITY: Use past context naturally
- MILESTONE AWARENESS: Surface thin coverage when relevant

## Files Changed
- `supabase/functions/rolly-chat/index.ts` — Full intelligence upgrade
- DB migration: `rolly_session_summaries` table + `artists.rolly_profile` column
