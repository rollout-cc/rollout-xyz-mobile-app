

# Rolly Intelligence Upgrade — Final Revised Plan

## Changes from feedback

1. **Session summaries** — Internal only, no user-facing RLS. Service-role read/write only.
2. **Milestone alerts + summaries** — Not fetched "at conversation start" as a separate step. Instead, injected into the system prompt context so Rolly is passively **aware** and weaves them into conversation naturally when relevant.
3. **Artist tone profiles** — No UI. Rolly auto-generates/updates them after conversations based on what it learns. Stored on `artists.rolly_profile`, written by the post-conversation summary step.

---

## Database Migration

```sql
-- Session summaries (service-role only, no RLS policies for users)
CREATE TABLE public.rolly_session_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES public.artists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rolly_session_summaries ENABLE ROW LEVEL SECURITY;

-- Artist tone profile (auto-populated by Rolly, not user-facing)
ALTER TABLE public.artists ADD COLUMN rolly_profile text;
```

---

## Edge Function Changes (`supabase/functions/rolly-chat/index.ts`)

### A. Five new read tools

| Tool | What it queries |
|------|----------------|
| `get_artist_milestones` | `artist_milestones` joined with `artist_timelines` — titles, dates, timeline names |
| `get_artist_campaigns` | `initiatives` — names, date ranges, descriptions |
| `get_artist_tasks` | `tasks` where status != done — titles, due dates |
| `get_artist_budgets` | `budgets` — labels, amounts |
| `search_knowledge` | `search_rolly_knowledge` RPC — exposes knowledge base as a callable tool |

All take `artist_name` except `search_knowledge` which takes `query`. Added to `TOOLS` array and `executeTool` switch.

### B. Context injection (before AI call, every request)

At the point where we already fetch artist names and team members (lines 522-534), add three parallel queries:

1. **Session summaries**: Fetch last 5 from `rolly_session_summaries` for this user + team, ordered by `created_at desc`
2. **Upcoming milestones**: Fetch milestones within next 14 days for all team artists. For each, count tasks with due dates within ±7 days. Flag any with < 3 nearby tasks.
3. **Artist profiles**: Change artist query from `.select("name")` to `.select("name, rolly_profile")`

All three are injected into the system prompt as passive context:

```
## Previous Sessions
- [Mar 20, The Palace]: "Discussed Palace rollout timeline being behind. Created 4 tasks for video pre-production."
- [Mar 18, Pote Baby]: "Set up budgets for single release. $2k video, $500 marketing."

## Upcoming Milestones
- The Palace — "Shoot music video" in 5 days (only 1 task nearby — may need more)
- Pote Baby — "Single release" in 12 days (4 tasks nearby — on track)

## Artist Profiles
- The Palace: "Developing act, first EP cycle. Needs instructional guidance."
- Pote Baby: "Active campaign, execution-focused."
```

Rolly sees this context and naturally references it when relevant — no special fetch timing logic needed.

### C. Post-stream: summarize conversation + update artist profile

After the response stream completes (inside the `ReadableStream.start` after the while loop), make a non-blocking call:

1. **Summarize**: Call `gemini-2.5-flash-lite` with the full conversation to generate a 2-3 sentence summary. Insert into `rolly_session_summaries` with resolved `artist_id` (if any artist was discussed).

2. **Update artist profile**: In the same summary call, ask the model to also output an updated `rolly_profile` string based on what it learned about the artist in this session (stage, priorities, communication needs). Upsert into `artists.rolly_profile`. This means Rolly builds and refines profiles automatically over time — no manual input needed.

The summary+profile call uses a structured tool-call response format to get both fields cleanly.

### D. System prompt additions

Add to `SYSTEM_PROMPT`:

```
DATA AWARENESS — Read Before You Write:
- When asked to work with existing data (release plans, milestones, campaigns),
  ALWAYS use read tools first. Never invent items that may already exist.
- After reading, use search_knowledge to look up industry best practices.
- Infer additional tasks from knowledge (e.g. "Shoot music video" → 
  pre-production, crew, locations, wardrobe).
- Check existing tasks to avoid duplicates.

ARTIST PROFILES:
- When an artist has a profile in context, calibrate your tone.
- Developing acts: more explanation, instructional, options.
- Active campaigns: direct, execution-focused, time-sensitive.

SESSION CONTINUITY:
- Reference previous session context when relevant.
- Don't announce that you have memory — just use it naturally.

MILESTONE AWARENESS:
- If you see an upcoming milestone with thin task coverage, mention it
  naturally in your response when relevant. Don't force it every time.
```

---

## Implementation order

| Step | What | File |
|------|------|------|
| 1 | Migration: `rolly_session_summaries` table + `rolly_profile` column | DB migration |
| 2 | Add 5 read tool definitions to TOOLS array | `rolly-chat/index.ts` |
| 3 | Add 5 cases to `executeTool` | `rolly-chat/index.ts` |
| 4 | Add context injection: session summaries, milestone alerts, artist profiles | `rolly-chat/index.ts` |
| 5 | Add post-stream summary + profile auto-generation | `rolly-chat/index.ts` |
| 6 | Update SYSTEM_PROMPT with data awareness + profile + continuity instructions | `rolly-chat/index.ts` |

One migration, one edge function. No frontend changes.

