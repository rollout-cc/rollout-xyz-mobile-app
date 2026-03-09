

# Full Implementation Plan: ROLLY + Splits + Calendar + Performance Optimizations

## Overview

This plan covers four major feature areas:
1. **ROLLY** — AI music business advisor with streaming chat
2. **Split Sheet Email Consolidation** — Project-level approvals via Resend
3. **Calendar Sync** — iCal subscription feed for milestones
4. **Performance Optimizations** — Query consolidation, cache improvements, prefetching

---

## 1. Critical Blocker: TypeScript Build Error

**File**: `supabase/functions/send-notification/index.ts`, line 268

**Current code**:
```typescript
if (!pref || !(pref as Record<string, unknown>)[payload.pref_key]) {
```

**Fix**: Cast through `unknown` first:
```typescript
if (!pref || !(pref as unknown as Record<string, unknown>)[payload.pref_key]) {
```

---

## 2. Performance Optimizations

### 2.1 Query Keys Already Unified ✓
Overview.tsx and FinanceContent.tsx both use `["artists-summary", teamId]`, `["budgets", teamId]`, `["transactions", teamId]`, `["tasks", teamId]`. This is already implemented correctly.

### 2.2 Waterfall Queries — Still Present
**Problem**: `budgets` and `transactions` queries depend on `artists.length > 0`, creating sequential fetches.

**Fix**: Fetch budgets/transactions directly using team_id via a database function or JOIN:
```sql
CREATE FUNCTION get_team_finance_data(p_team_id UUID)
RETURNS TABLE (
  artists JSONB,
  budgets JSONB,
  transactions JSONB
) AS $$
  SELECT
    (SELECT jsonb_agg(row_to_json(a)) FROM artists a WHERE team_id = p_team_id),
    (SELECT jsonb_agg(row_to_json(b)) FROM budgets b 
     JOIN artists a ON b.artist_id = a.id WHERE a.team_id = p_team_id),
    (SELECT jsonb_agg(row_to_json(t)) FROM transactions t 
     JOIN artists a ON t.artist_id = a.id WHERE a.team_id = p_team_id)
$$ LANGUAGE sql STABLE;
```

This collapses 3 sequential queries into 1 RPC call.

### 2.3 useTeamPlan Caching ✓
Already optimized: 5-minute staleTime/refetchInterval + localStorage cache.

### 2.4 Role in TeamContext ✓
Already implemented: `role` and `canManage` provided via context.

### 2.5 Artist Card Prefetching ✓
Already implemented in `ArtistCard.tsx` line 39-49 with `onMouseEnter` prefetch.

### 2.6 Staff Computation ✓
Already optimized with single-pass `maxRevenue` calculation (lines 308-316 in Overview.tsx).

---

## 3. ROLLY — AI Music Business Advisor

### Database Schema
```sql
-- Conversations
CREATE TABLE rolly_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE rolly_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES rolly_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Education content
CREATE TABLE education_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  simple_explanation TEXT NOT NULL,
  detailed_explanation TEXT,
  related_concepts TEXT[],
  example TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies for user-scoped access
ALTER TABLE rolly_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rolly_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own conversations" ON rolly_conversations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage messages in own conversations" ON rolly_messages FOR ALL 
  USING (conversation_id IN (SELECT id FROM rolly_conversations WHERE user_id = auth.uid()));
```

### Edge Function: `rolly-chat/index.ts`
- Uses `LOVABLE_API_KEY` to call Lovable AI Gateway
- Model: `google/gemini-2.5-flash` (fast, cost-effective)
- Streaming SSE response for real-time rendering
- System prompt includes music business knowledge (recoupment, splits, commissions, publishing, etc.)
- Accepts conversation history for context

### Frontend Components
- `src/pages/Rolly.tsx` — Full-page chat interface
- `src/components/rolly/RollyChat.tsx` — Chat UI with input and message list
- `src/components/rolly/RollyMessage.tsx` — Message bubble with markdown
- `src/hooks/useRollyChat.ts` — Streaming state management

### Routing
Add `/rolly` route to `App.tsx` and sidebar nav item.

---

## 4. Split Sheet Email Consolidation

### Current State
`send-split-approval/index.ts` accepts `song_id` and processes per-song. Email sending via Resend is stubbed but not implemented.

### Changes Required

**Edge Function Refactor**:
1. Accept `project_id` instead of `song_id`
2. Fetch ALL songs in the project
3. Fetch ALL pending entries across all songs
4. Group by contributor (one consolidated email per person)
5. Send via Resend with branded template showing all tracks

**Database Addition**:
```sql
ALTER TABLE split_entries ADD COLUMN project_approval_token TEXT;
```

**Email Template**:
```text
Subject: Split Approval Request — {Project Name}

{Contributor Name},

You've been added to the following tracks on "{Project Name}" by {Artist}:

• "Track 1" — Producer 50%, Writer 25%
• "Track 3" — Writer 15%

[Approve All]  [View Details]
```

**UI Changes**:
- Add "Send for Approval" button to `SplitProjectCard.tsx` footer
- Show confirmation dialog with contributor count
- Disable if any split totals > 100%

**ApproveSplit.tsx Enhancement**:
- Support bulk approval when token maps to multiple entries
- Show all tracks with checkboxes for selective approval

---

## 5. Calendar Sync — iCal Feed

### Edge Function: `milestone-ical/index.ts`
Serves subscribable `.ics` feed using artist's `timeline_public_token`.

**Endpoint**: `GET /functions/v1/milestone-ical?token={token}`

**Response**:
```ical
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ROLLOUT//Milestones//EN
BEGIN:VEVENT
DTSTART:20250315
SUMMARY:Single Release — "Track Name"
DESCRIPTION:Milestone for Artist Name
UID:milestone-{id}@rollout.cc
END:VEVENT
END:VCALENDAR
```

### UI Changes: `TimelinesTab.tsx`
Add "Calendar Sync" button next to share button:
- Click → Popover with options:
  - **Google Calendar**: Opens `https://calendar.google.com/calendar/r?cid=webcal://...`
  - **Apple/Other**: Copy `webcal://` URL to clipboard

---

## 6. Implementation Order

### Phase 1: Blockers & Foundation
1. Fix TypeScript error in `send-notification/index.ts` (line 268)
2. Create database migration for ROLLY tables
3. Create database migration for `project_approval_token` column

### Phase 2: ROLLY
4. Create `rolly-chat` edge function with streaming
5. Create `Rolly.tsx` page and chat components
6. Add routing and sidebar navigation
7. Seed `education_content` with 20-30 music business concepts

### Phase 3: Split Consolidation
8. Refactor `send-split-approval` to accept `project_id`
9. Add Resend email sending with branded template
10. Update `SplitProjectCard.tsx` with project-level send button
11. Enhance `ApproveSplit.tsx` for bulk approval

### Phase 4: Calendar Sync
12. Create `milestone-ical` edge function
13. Add calendar sync button/popover to `TimelinesTab.tsx`

### Phase 5: Performance (Optional)
14. Create `get_team_finance_data` RPC function
15. Update Overview.tsx and FinanceContent.tsx to use single RPC call

---

## 7. Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/rolly-chat/index.ts` | AI chat edge function |
| `supabase/functions/milestone-ical/index.ts` | iCal feed endpoint |
| `src/pages/Rolly.tsx` | Chat page |
| `src/components/rolly/RollyChat.tsx` | Chat interface |
| `src/components/rolly/RollyMessage.tsx` | Message rendering |
| `src/hooks/useRollyChat.ts` | Streaming hook |

## 8. Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-notification/index.ts` | Fix line 268 cast |
| `supabase/functions/send-split-approval/index.ts` | Project-level + Resend |
| `src/App.tsx` | Add /rolly route |
| `src/components/AppSidebar.tsx` | Add ROLLY nav item |
| `src/components/artist/SplitProjectCard.tsx` | Add send button |
| `src/components/artist/TimelinesTab.tsx` | Add calendar sync |
| `src/pages/ApproveSplit.tsx` | Bulk approval support |

---

## Technical Notes

- **LOVABLE_API_KEY** is configured — ROLLY can use AI immediately
- **RESEND_API_KEY** is configured — Split emails can send immediately
- Streaming uses SSE with line-by-line parsing
- ROLLY system prompt: ~2000 tokens covering music business fundamentals
- iCal is read-only subscription — direct calendar writing requires OAuth (future phase)

