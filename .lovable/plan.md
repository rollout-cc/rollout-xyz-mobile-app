

# Updated Plan: Admin Console with Support Access Mode

Everything from the previous plan stays intact. This adds one new capability: **temporary support access** to a user's team.

## New Feature: Support Access Mode

When a user runs into an issue post-onboarding, you can request temporary access to their team from the Admin Console. The flow:

1. **You** select a team in the Admin Console and click "Request Support Access"
2. A `support_access_requests` record is created with status `pending` and an expiry (e.g. 2 hours)
3. The **team owner** sees a notification/prompt in their app: "Rollout Support is requesting temporary access to your team to help resolve an issue. Grant access?"
4. If they approve, your user ID is inserted into `team_memberships` with a special role or flag (`is_support_session = true`), and the request status becomes `active`
5. You can now view their team as if you were a member (read-only or full, depending on what they grant)
6. When you're done, you click "End Support Session" in the Admin Console — your membership is removed and the request status becomes `completed`
7. If the session expires (2-hour default) without being ended, a database function auto-removes your membership

### Safety guarantees
- Every support session is logged with timestamps (requested, approved, ended)
- The team owner must approve each time — no standing access
- Sessions auto-expire so you can't accidentally stay in their team
- Your membership is visibly marked so the team owner sees "Rollout Support" in their members list during the session

## Database additions

```text
TABLE: support_access_requests
  id              uuid PK
  team_id         uuid FK -> teams
  admin_user_id   uuid FK -> auth.users
  status          text (pending | approved | active | completed | expired | denied)
  reason          text (optional note you type when requesting)
  approved_by     uuid (the team owner who approved)
  approved_at     timestamptz
  started_at      timestamptz (when membership was inserted)
  ended_at        timestamptz
  expires_at      timestamptz (default: now() + 2 hours)
  created_at      timestamptz
```

RLS: platform admins can insert/select. Team owners can select/update (to approve/deny) their own team's requests.

## Edge function changes

Add actions to `admin-actions`:
- `request_support_access` — creates the request record
- `end_support_session` — removes the temporary membership, marks request completed

Add a new action callable by the team owner:
- `approve_support_access` — verifies the request is pending + not expired, inserts the admin into `team_memberships` with `is_support_session = true`, updates request to `active`

## Frontend changes

### Admin Console (`/admin`)
- New "Support Access" section showing all teams
- Search/select a team, type a reason, click "Request Access"
- Shows active sessions with an "End Session" button

### Team Owner experience
- When a support request is pending, show a banner/dialog: "Rollout Support has requested temporary access to help with your team. [Approve] [Deny]"
- During an active session, show a subtle banner: "Rollout Support is currently viewing your team" with a "Revoke Access" button

## Files summary

| File | Action |
|---|---|
| Migration SQL | `platform_admins`, `team_ownership_transfers`, `support_access_requests` tables + functions |
| `supabase/functions/admin-actions/index.ts` | New edge function (create user, create team, transfer ownership, grant trial, request/end support access) |
| `src/pages/Admin.tsx` | Admin console UI with all sections including support access |
| `src/pages/AcceptOwnership.tsx` | Public ownership acceptance page |
| `src/components/SupportAccessBanner.tsx` | Banner shown to team owners during pending/active support sessions |
| `src/App.tsx` | Add `/admin` and `/accept-ownership/:token` routes |
| Privacy Policy page | Add data access and ownership transfer policy language |

