

## Combined Plan: Adaptive Depth + Smart Assignment + Knowledge Base

Three approved-but-unimplemented features rolled into one implementation pass.

---

### 1. Adaptive Depth Plan Mode

**Current state**: Fixed 8-question backend cap, 10-question frontend cap, basic "quick"/"detailed" depth detection from answer keywords. No preview plans, no checkpoints, no refinement loop.

**What changes**:

#### Edge function (`supabase/functions/rolly-plan-question/index.ts`)

- Replace `SYSTEM_PROMPT` depth calibration section:
  - Q2 must always ask pace: "Need this quick or want to really think it through?"
  - Quick mode: 4-6 questions, then `plan_ready`
  - Deep mode: 8-12 questions, then `plan_ready` with `preview: true`. After user reviews preview, 3-4 refinement questions per round, max 2 rounds. Hard cap: 20 questions.
  - Add knowledge-first rules: ROLLY infers standard costs ($1-3K music video, $300-800 lyric video, $500-1500/mo social content, etc.), promo windows (6-8 weeks pre-save, 2-3 weeks press), budget splits — never asks these.

- Add `preview` boolean param to `plan_ready` tool schema
- Accept new request fields: `is_post_preview`, `preview_plan`, `refinement_feedback`
- When `is_post_preview` is true, inject refinement context into the user message (draft plan summary + feedback)
- Update backend hard caps: quick=8, deep=20, default=8

#### Frontend (`src/components/rolly/PlanWizard.tsx`)

- New state: `previewItems`, `isCheckpoint`, `checkpointFeedback`, `refinementRound`, `isPostPreview`
- Depth detection: add "deep"/"think it through"/"chat"/"time" → `"deep"` mode
- Update `fetchNextQuestion`:
  - Quick cap stays at 10
  - Deep cap at 22
  - When API returns `complete` with `preview: true`: generate plan, store as `previewItems`, show checkpoint phase
- Checkpoint UI: Rolly summary + text input for feedback + two buttons ("Looks good — build it" / "Let's refine")
- "Let's refine" sends `refinement_feedback` + `preview_plan` in next API call, increments `refinementRound`
- Add `onPreviewPlan` callback to send preview items to workspace

#### Workspace (`src/pages/Rolly.tsx` + `src/components/rolly/RollyWorkspace.tsx`)

- Wire `previewItems` state through from PlanWizard → Rolly → RollyWorkspace
- RollyWorkspace: when `previewItems` is set, render read-only draft cards at top with "Draft Preview" label alongside normal workspace content

---

### 2. Smart Task Assignment

**Current state**: Round-robin assignment across team members with artist access. Ignores job titles and history.

**What changes**:

#### Generate function (`supabase/functions/rolly-generate-plan/index.ts`)

- Add `assign_to_role` field to task schema in the `generate_plan` tool: enum `["marketing", "ar", "finance", "operations", "creative", "legal", "general"]`
- Update system prompt to instruct AI to categorize each task by role

#### Execute function (`supabase/functions/rolly-execute-plan/index.ts`)

- Expand team members query to include `job_title` from `team_memberships`
- Fetch last 200 tasks per team for historical keyword matching
- Replace `getAssignee()` with `getBestAssignee(artistId, taskTitle, assignToRole)` scoring function:
  - Job title keyword match: +3
  - Historical task keyword overlap: +1 per match
  - Workload balance: -0.5 per task already assigned in current plan
  - Artist access: required filter
  - Fallback: round-robin among owners/managers

#### Frontend (`src/components/rolly/PlanDraft.tsx`)

- Add `assign_to_role?: string` to `DraftItem` type
- Pass through from generate → review → execute

---

### 3. Knowledge Base Content

The user indicated they want to paste new knowledge base content. This is a separate action — once they share it, we'll insert it into the `rolly_knowledge` table. No code changes needed for this; just awaiting the content.

---

### Files to modify

| File | Changes |
|------|---------|
| `supabase/functions/rolly-plan-question/index.ts` | System prompt, preview flag, refinement context, depth caps, knowledge-first rules |
| `src/components/rolly/PlanWizard.tsx` | Adaptive caps, checkpoint phase, preview flow, refinement loop, deep mode detection |
| `src/pages/Rolly.tsx` | Wire `previewItems` state |
| `src/components/rolly/RollyWorkspace.tsx` | Render preview draft cards |
| `supabase/functions/rolly-generate-plan/index.ts` | `assign_to_role` in task schema + prompt |
| `supabase/functions/rolly-execute-plan/index.ts` | Smart assignment scoring logic |
| `src/components/rolly/PlanDraft.tsx` | Add `assign_to_role` to DraftItem type |

