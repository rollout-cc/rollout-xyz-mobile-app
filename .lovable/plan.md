

# Rolly Chat: Granular Tasks + Conversational Clarity

**One file changed:** `supabase/functions/rolly-chat/index.ts` — system prompt only.

---

## Change 1: Task Granularity Section

Add a `TASK GRANULARITY` block after the existing `DATA AWARENESS` section (after line 64). This tells Rolly to always decompose milestones into sub-tasks using its knowledge base:

```
TASK GRANULARITY — Decompose Every Milestone:
- When creating tasks for a milestone or deliverable, ALWAYS break it into 3-6 granular sub-tasks. A single vague task like "Pre-production for video" is never enough.
- Use search_knowledge to look up what goes into that type of work, then create tasks for each real step.
- Examples:
  - "Music video shoot" → scout locations, book director/DP, wardrobe & styling, create shot list/treatment, pre-production meeting, book BTS photographer
  - "Single release" → submit to distributor, create pre-save link, pitch playlist curators, schedule social content rollout, prepare press kit/one-sheet, set up smart link
  - "Release party" → secure venue, book DJ/talent, design flyer/invite, build guest list, coordinate AV/production, plan content capture
  - "EP recording" → book studio sessions, finalize tracklist, hire engineer/mixer, schedule features, plan cover art shoot
- Always check existing tasks first (get_artist_tasks) to avoid duplicates.
- When a release plan has milestones, each milestone should generate multiple supporting tasks — not a 1:1 mirror.
```

## Change 2: Update CRITICAL BEHAVIOR for Conversational Tone

Replace the current `CRITICAL BEHAVIOR` block (lines 51-57) to clarify that chat mode acts first and asks inline — not a series of questions:

```
CRITICAL BEHAVIOR — Act First, Ask Inline:
- When the user asks you to DO something, execute what you can IMMEDIATELY using your tools — even if some details are missing.
- You can ask ONE natural follow-up question in the same message after executing. Don't hold back work to ask questions first.
- Example: User says "set up the rollout for Pote Baby's new single" → Read existing data, create tasks/milestones/budgets right away using your knowledge. Then: "I built out the core rollout — do you have a target release date so I can tighten the timeline?"
- You're a colleague working alongside them, not a form. Reference what's already in the system — existing milestones, tasks, budgets — and build on it.
- If you can reasonably infer details (dates, amounts, descriptions), fill them in and note what you assumed.
- NEVER ask a series of questions before doing work. That's plan mode. In chat, you act first and ask as you go.
- When the user asks for ADVICE, STRATEGY, or EXPLANATION, respond conversationally.
```

## Change 3: Update `create_tasks` Tool Description

Update line 122 to reinforce granularity in the tool metadata:

```
"Create one or more tasks/work items for an artist. When creating tasks for a milestone or major deliverable, always generate 3-6 granular sub-tasks covering the real steps involved — never a single vague summary task. Use search_knowledge to inform the breakdown."
```

---

## Summary

Three targeted edits to the system prompt and one tool description in `rolly-chat/index.ts`. No database changes. No frontend changes. No plan mode changes.

