

## Plan: Billing, Subscriptions & Feature Gating

### Updated Pricing

| Tier | Price | Seats |
|------|-------|-------|
| **Rising** | Free | 1 (solo, no invites) |
| **Icon 5** | $45/mo | Up to 5 |
| **Icon 10** | $70/mo | Up to 10 |
| **Icon 15** | $120/mo | Up to 15 |
| **Legend** | Custom | 15+, dedicated support, custom APIs |

### Free (Rising) Limits
- 3 roster artists, 2 A&R prospects, 10 tasks/user/month
- No splits, no team roles/permissions, no budgeting/finance tools
- No team invites (solo only)

### Icon (all tiers)
- All features unlocked, unlimited artists/prospects/tasks
- Only difference between tiers is seat count

### Implementation Steps

1. **Enable Stripe** via Lovable's Stripe tool (collects secret key)
2. **Create Stripe products/prices**: Icon 5 ($45), Icon 10 ($70), Icon 15 ($120) -- all with 30-day trial
3. **Database migration**: `team_subscriptions` table (plan, seat_limit, status, trial_ends_at, stripe IDs) + `contact_requests` table for Legend inquiries
4. **Edge functions**: `stripe-webhook`, `create-checkout-session`, `create-billing-portal`, `create-contact-request`, `send-trial-reminder` (day 20 cron)
5. **`useTeamPlan()` hook**: Returns plan, seat limit, trial status; enforces feature gates with upgrade prompts
6. **Settings restructure**: Add Plan tab (pricing cards) and Billing tab (invoices, payment method portal link); hide Team Settings for Rising users
7. **Wire feature gates**: Artist/prospect creation, task creation, splits tab, team invites, finance tools -- each shows branded upgrade dialog when blocked
8. **Legend contact form**: Dialog submitting to `contact_requests` + notification email

