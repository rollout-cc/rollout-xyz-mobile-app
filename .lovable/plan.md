

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

### Stripe IDs
- Icon 5: prod_U5CIvGZDhdaGnx / price_1T71uJQqzrroFM17NVp8fmBj ($45/mo)
- Icon 10: prod_U5CZIYD0Nmn0ty / price_1T72AKQqzrroFM17maKFYrCj ($70/mo)
- Icon 15: prod_U5CfH5aXZPJHUm / price_1T72GIQqzrroFM17uRdMfC30 ($120/mo)

### Implementation Steps

1. ✅ **Enable Stripe** via Lovable's Stripe tool
2. ✅ **Create Stripe products/prices**: Icon 5 ($45), Icon 10 ($70), Icon 15 ($120) -- all with 30-day trial
3. ✅ **Database migration**: `team_subscriptions` + `contact_requests` tables with RLS
4. ✅ **Edge functions**: `check-subscription`, `create-checkout`, `customer-portal`, `stripe-webhook`, `create-contact-request`
5. ✅ **`useTeamPlan()` hook**: Returns plan, seat limit, trial status; enforces feature gates
6. ✅ **Settings restructure**: Plan tab (pricing cards), Billing tab, Team tab hidden for Rising
7. 🔲 **Wire feature gates**: Artist/prospect creation, task creation, splits tab, team invites, finance tools
8. ✅ **Legend contact form**: Dialog submitting to `contact_requests` + notification email
9. 🔲 **Send trial reminder**: Day 20 cron email (future)
