

# Provision Super Admin Account with Permanent Legend Tier

## What we're doing

This is a data provisioning task — no code changes needed. Using the existing infrastructure to set up the accounts@rollout.cc super admin account with the highest permanent access.

## Steps

1. **Insert your current account as platform admin** — add `e4dbccd1-221f-467c-ac87-edce2bf8e6db` to `platform_admins` so you can access `/admin` now

2. **Create accounts@rollout.cc user** — via `admin-actions` edge function (`create_user` action), password as specified, email auto-confirmed

3. **Add accounts@rollout.cc to `platform_admins`** — full super admin privileges

4. **Create "Rollout Demo Label" team** — owned by accounts@rollout.cc via `admin-actions` `create_team`

5. **Set team subscription to Legend tier permanently** — instead of a trial, the team_subscriptions row will be:
   - `plan`: `legend`
   - `seat_limit`: `999` (unlimited)
   - `status`: `active` (not `trialing`)
   - `trial_ends_at`: `null`
   - `is_grandfathered`: `true`
   
   This gives the demo team the highest tier with no expiration.

6. **Add 2-3 sample artists** to the demo team for testing

## Technical details

- Steps 1, 3, 5, 6: Direct DB inserts/updates via the insert tool
- Steps 2, 4: Call the deployed `admin-actions` edge function
- No schema changes or code changes required — everything uses existing infrastructure

