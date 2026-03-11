

# Rolly Plan Mode + Knowledge Base Expansion

## Overview

Three parallel workstreams to implement the approved plan plus the new Venice Music content:

1. **Plan Mode toggle button** next to the send button in Rolly chat
2. **Enhanced system prompt** with structured rollout planning framework
3. **Knowledge base inserts** — music rollout decks, Virgil Abloh guide, and Venice Music strategy template

---

## 1. Plan Mode Toggle (UI)

**File: `src/components/rolly/RollyChat.tsx`**
- Add a toggle button (e.g. clipboard icon) next to the send button
- When active: highlighted state + banner above input ("Plan Mode — Rolly will guide you step by step")
- Pass `planMode` flag to `useRollyChat` hook

**File: `src/hooks/useRollyChat.ts`**
- Accept `planMode` parameter
- When active, prefix user messages with a hidden system hint: `[PLAN MODE] ` so the edge function knows to enter guided mode

---

## 2. Enhanced System Prompt

**File: `supabase/functions/rolly-chat/index.ts`**

Update the SYSTEM_PROMPT planning section with the structured rollout framework derived from all three sources (your decks + Venice):

```text
ROLLOUT PLANNING FRAMEWORK (when in Plan Mode):
1. ARTIST & NARRATIVE — Who? What's the story/angle?
2. RELEASE TYPE — Single, EP, Album? Project name?
3. GOALS — Revenue targets, streaming goals, fan engagement
4. BUSINESS VERTICALS — Music, Clothing, Film/TV, Other
5. PHASE 1: SEEDING THE MYTH — Teasers, freestyles, pop-ups, brand launches
6. PHASE 2: SINGLE RELEASE — Radio/press, merch, listening experiences
7. PHASE 3: AUDIENCE BUILD — City activations, press runs, content series
8. PHASE 4: FULL PROJECT RELEASE — Album launch, events, brand expansions
9. PHASE 5: LONG-TERM GROWTH — Podcasts, clothing lines, remix projects, monetization
10. TIMELINE — Map phases to calendar
11. TEAM & BUDGET — Who's involved, cost per phase
```

Ask ONE question at a time through these sections. After gathering answers, batch-create all tasks, milestones, budgets, expenses, and split projects at once.

Also add a `create_budget` tool definition and handler to create budget categories from the plan.

---

## 3. Knowledge Base Inserts

Insert ~8-10 rows into `rolly_knowledge` via the database insert tool:

**A. From your rollout decks (Buddy + Ben Reilly):**
- Rollout phase structure (Seeding the Myth → Single → Audience Build → Project Release)
- Business verticals framework (Music, Clothing, Film/TV, Cannabis)
- Touch points per phase with cost ranges
- Revenue targets methodology

**B. From Virgil Abloh "Free Game":**
- How to build a clothing brand (naming, trademark, sourcing blanks, lookbooks, Shopify)
- Brand-building philosophy and creative process

**C. From Venice Music Strategy Report (new):**
- Generic rollout template structure: Artist Profile → Core Themes → Aesthetic DNA → Genre/Sound → Release Plan → Strategic Moves
- 4-phase activation framework: Phase 1 (Introduce Era / Discovery), Phase 2 (Second Single + Tease), Phase 3 (Full Project Rollout), Phase 4 (Long-Term Growth + Monetization)
- Each phase has 3 activations with Concept, How It Works, Why It Works, Metrics to Track
- Activation types as reference: teaser campaigns, live sessions, cinematic shorts, listening experiences, pop-ups, remix sessions, podcast series, clothing line drops, fan collaboration projects

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/rolly/RollyChat.tsx` | Plan mode toggle button next to send |
| `src/hooks/useRollyChat.ts` | Accept planMode flag, prefix messages |
| `supabase/functions/rolly-chat/index.ts` | Enhanced system prompt + `create_budget` tool |
| `rolly_knowledge` table (data insert) | ~8-10 new knowledge entries |

