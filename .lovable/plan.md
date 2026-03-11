

# Bug Fixes, Rolly Token Limits, and AI Cost Info

## Critical Bug: Permissions Broken for All Existing Users

The recent change to `TeamContext.tsx` reads permission flags directly from the database:
```
canViewFinance: !!membershipPerms?.perm_view_finance,
```

But **every existing `team_memberships` row has all `perm_*` columns set to `false`**, including team owners. This means:
- Team owners can't see finance, A&R, roster, billing, or edit artists
- Managers can't see anything either
- The app is effectively locked down for all existing users

**Fix:** Restore role-based defaults as the baseline in `TeamContext.tsx`, with stored flags as overrides. The logic should be:
- `team_owner` always gets all permissions (hardcoded, ignore stored flags)
- `manager` gets role defaults OR stored flags (whichever is true — union/additive)
- `artist`/`guest` use stored flags only

Additionally, run a data migration to set existing team_owner records to all-true so future logic stays clean.

## Rolly Token Limits

No usage tracking exists yet. Need to build:

1. **Database**: Create `rolly_usage` table with columns: `team_id`, `month` (text, e.g. "2026-03"), `message_count` (int), unique on (team_id, month)
2. **Edge Function** (`rolly-chat`): Before processing, check the team's plan. If Rising tier, query `rolly_usage` for current month. If count >= 10, return error. Increment count after successful response.
3. **Frontend** (`useRollyChat`): Handle the new "limit reached" error with a user-friendly message and upgrade prompt.
4. **Limits**: Rising = 10 messages/month, Icon = unlimited, Legend = unlimited

## AI Cost via Lovable

Regarding your question about LLM costs: The Lovable AI gateway (`ai.gateway.lovable.dev`) is included with your Lovable workspace. Costs are billed through your Lovable subscription/credits — you don't pay per-token to a separate provider. The models used (Gemini Flash for nudges, Gemini 3 Flash Preview for chat) are among the more cost-efficient options. Your users' Rolly usage consumes your Lovable AI credits. If usage scales significantly, you'd monitor credit consumption in your Lovable workspace settings. The 10-message free cap for Rising tier is a good safeguard against runaway costs.

## Implementation Steps

1. **Fix TeamContext permissions** — restore role-based defaults as baseline, stored flags as additive overrides
2. **Data migration** — set all `perm_*` to true for existing `team_owner` memberships, and set role defaults for existing `manager` memberships  
3. **Create `rolly_usage` table** — track monthly message counts per team
4. **Update `rolly-chat` edge function** — check plan tier, enforce 10-message limit for Rising, increment usage
5. **Update frontend** — show limit-reached UI with upgrade prompt in Rolly chat

