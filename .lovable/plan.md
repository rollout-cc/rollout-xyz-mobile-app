

# Plan Mode: Full Execution Pipeline

## Problem
After 8 wizard questions, the system produces a text summary sent to `rolly-chat` which responds conversationally ("sounds dope...") instead of executing. Users answered questions only to face more questions.

## Solution
Two major changes:

1. **Replace text summary with structured plan generation** -- when `plan_ready` fires, a new edge function (`rolly-generate-plan`) takes the full Q&A + brief and returns structured items (tasks, milestones, budgets, campaigns) using AI tool-calling.

2. **Show PlanDraft review, then batch-execute** -- the wizard displays the already-built `PlanDraft` component for review. On "Build Plan" click, a new `rolly-execute-plan` edge function batch-creates everything in the database.

## Architecture

```text
Wizard Q&A (up to 14 questions, AI-driven)
    ↓ plan_ready signal
rolly-generate-plan edge function
  → AI with tool-calling returns structured items
    ↓
PlanDraft review screen (edit/remove/confirm)
    ↓ "Build Plan" click
rolly-execute-plan edge function
  → batch-creates tasks, milestones, budgets, initiatives
    ↓
Workspace refreshes, confirmation toast
```

## Changes

### 1. Update `rolly-plan-question` edge function
- Raise question cap from 8 to 14
- Update prompt: "Ask 8-14 questions MAX. After question 10, strongly consider wrapping up."
- Add instruction to use knowledge base context to determine the most necessary questions (skip obvious ones, focus on execution-critical details)
- `plan_ready` summary remains text (used as input to the next step)

### 2. New `rolly-generate-plan` edge function
- Input: `{ brief, qa_history, team_id }`
- Fetches artist list and knowledge base context
- Uses AI with forced tool-calling to produce structured output:
  - `campaigns: [{ name, description, start_date, end_date, artist_name }]`
  - `tasks: [{ title, description, due_date, expense_amount, artist_name, campaign_name }]`
  - `milestones: [{ title, date, description, artist_name }]`
  - `budgets: [{ label, amount, artist_name }]`
- Returns the structured plan as JSON

### 3. New `rolly-execute-plan` edge function
- Input: `{ items: DraftItem[], team_id }`
- Authenticated, resolves artist IDs from names
- Creates initiatives first (for campaign linking), then tasks, milestones, budgets
- Returns summary of created items

### 4. Update `PlanWizard.tsx`
- On `plan_ready`, call `rolly-generate-plan` with the full Q&A history
- Parse response into `DraftItem[]` format
- Render `PlanDraft` component inline (already built with edit/delete/confirm UI)
- On confirm, call `rolly-execute-plan`
- On completion: exit wizard, show success toast, trigger workspace refresh

### 5. Update `Rolly.tsx` / `RollyChat.tsx`
- Change `onWizardComplete` to accept `void` (no more summary prompt to chat)
- After execution, add synthetic assistant message confirming what was created
- Invalidate workspace queries so items appear immediately
- Remove the `[PLAN MODE]` text-to-chat flow entirely

### 6. Update `PlanDraft.tsx`
- Add "campaign" type to `DraftItem` alongside task/milestone/budget
- Style to match the dark plan-mode theme
- Add campaign section with icon

## Knowledge Base Summary

Rolly's knowledge base contains **247 entries across 114 chapters** from **23 sources**:

| Source | Entries | Topics |
|--------|---------|--------|
| Industry insights (scraped articles) | 138 | Streaming strategy, artist development, release patterns, revenue, operations |
| Passman 11th Edition (music law textbook) | 37 | Record deals, advances, royalties, cross-collateralization, 360 deals, agents, managers, publishing, producer deals, copyright |
| Virgil Abloh "Free Game" | 14 | Brand building, e-commerce, design tools, naming, trademarks, screen printing, lookbooks |
| Venice Music rollout strategies | 5 | 4-phase release rollout, announce/tease, single drop, release week, post-release |
| Brent Faiyaz case study | 5 | Ownership, distribution, silence as strategy, creative narrative, post-release lifecycle |
| Christian Clancy interview (Rap Radar) | 4 | Brand equity, Odd Future development, Camp Flog Gnaw, manager-artist longevity |
| Godmode artist development | 4 | Licensing vs traditional deals, artist advocacy, creative freedom, world-building |
| Rollout deck templates | 4 | Business verticals, revenue targets, phase structure, touch points & costs |
| Shopify clothing guide | 4 | Business models, design & development, pricing & inventory, sales channels |
| Colture Playbook (DJBooth) | 4 | Equity partnerships, surviving on $30K, middle-class artist, cultural capital |
| OutKast Edge (Trapital) | 4 | OutKast Edge framework, Issa Rae/Tyler Perry, Tyler the Creator, losing the edge |
| Venice Music (activation) | 3 | Activation framework, activation types, rollout templates |
| LVRN / Amber Grimes | 3 | Album rollout, career building through assisting, marketing philosophy |
| SoundExchange | 3 | Registration guide, claiming recordings, submitting as rights owner |
| Split sheets guide | 3 | What split sheets are, how percentages work, quick reference |
| ASCAP cue sheets | 2 | Cue sheet registration, understanding cue sheets for film/TV |
| Distribution deals | 2 | Distribution explained, modern distribution landscape |
| + 6 more sources | 1 each | BMI registration, ASCAP registration, mechanical royalties, medium article |

**Top 5 chapters by volume:**
- Revenue & Deal Strategy: 40 entries
- Music Business Operations: 32 entries
- Artist Development Tactics: 28 entries
- Release Strategy Patterns: 22 entries
- Industry Strategy Insights: 16 entries

