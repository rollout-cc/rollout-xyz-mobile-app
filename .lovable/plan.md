

## Plan: Add Public Privacy Policy & Terms of Service Pages

### What we'll build
Two new public pages at `/privacy` and `/terms` — no auth required, clean minimal layout with Rollout branding, containing standard SaaS legal language tailored to Rollout (a music industry management platform).

### Routes
- `app.rollout.cc/privacy` — Privacy Policy
- `app.rollout.cc/terms` — Terms of Service

### Implementation

**1. Create `src/pages/PrivacyPolicy.tsx`**
- Public page (no `ProtectedRoute` wrapper)
- Clean layout: Rollout logo at top linking to `/`, centered prose content, footer
- Standard privacy policy language covering: data collection, usage, cookies, third-party services (Google OAuth, Stripe, analytics), data retention, user rights (access/delete), contact info
- Tailored to Rollout as a music label/artist management platform
- Last updated date shown

**2. Create `src/pages/TermsOfService.tsx`**
- Same layout pattern as Privacy Policy
- Standard ToS language covering: acceptance of terms, account responsibilities, acceptable use, intellectual property, payment/billing, termination, limitation of liability, governing law, contact info

**3. Update `src/App.tsx`**
- Add lazy imports for both pages
- Add two public routes (no auth wrapper):
  - `/privacy` → `<PrivacyPolicy />`
  - `/terms` → `<TermsOfService />`

**4. Optional: Add footer links**
- Add links to Privacy Policy and Terms on the Login page so they're discoverable

### URLs for Google
Once deployed, you'll paste these into Google's OAuth consent screen:
- **Privacy Policy**: `https://app.rollout.cc/privacy`
- **Terms of Service**: `https://app.rollout.cc/terms`

