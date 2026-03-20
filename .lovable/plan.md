

## Plan: Membership Application Flow + Critical Bug Fixes

### Overview
Self-signups become "membership applications" — users register with minimal info, see a holding page ("Your team account is being set up"), and admins review requests in the Admin Console. Plus fix 4 bugs: manager permissions, job title toggle sync, Google/Apple auth for new users, and logo on dark backgrounds.

### 1. Database: New `team_applications` Table

```sql
CREATE TABLE team_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  company_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
ALTER TABLE team_applications ENABLE ROW LEVEL SECURITY;

-- Users can insert their own
CREATE POLICY "Users can insert own applications" ON team_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Users can view their own
CREATE POLICY "Users can view own applications" ON team_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Platform admins can view all
CREATE POLICY "Admins can view all applications" ON team_applications
  FOR SELECT TO authenticated USING (is_platform_admin(auth.uid()));

-- Platform admins can update
CREATE POLICY "Admins can update applications" ON team_applications
  FOR UPDATE TO authenticated USING (is_platform_admin(auth.uid()));
```

### 2. Login Page — Signup Becomes "Request Access"
**File:** `src/pages/Login.tsx`

- Change signup heading from "Try for free" to "Request Access"
- Change copy to "Tell us about your company and we'll get you set up."
- Add a "Company Name" field
- On submit: `signUp()` → insert into `team_applications` → show toast "Application submitted!"
- Change button text from "Start Free Trial" to "Request Access"
- Remove Google/Apple OAuth from signup mode (keep them on sign-in mode only)

### 3. Onboarding Page — Holding Page for Applicants
**File:** `src/pages/Onboarding.tsx`

Replace the 7-step team creation wizard with this logic:
- Query `team_applications` for current user
- If `status = 'pending'`: show branded holding page with Rollout logo, message "Your team account is being set up and we will reach out to onboard you shortly", and a sign-out button
- If user has teams already: redirect to `/roster` (existing behavior)
- If no application and no teams: redirect to `/login?mode=signup`

### 4. Post-Google/Apple OAuth Guard
**File:** `src/pages/Onboarding.tsx`

When a user signs in via Google/Apple on the main login page but has no team, they hit `/onboarding`. The new logic above handles this — they'll see "no application found" and be redirected to signup to fill in company name. Alternatively, if they already submitted an application, they see the holding page.

### 5. Admin Console — Applications Section
**File:** `src/pages/Admin.tsx`

Add a new card at the top: "Pending Applications"
- Query `team_applications WHERE status = 'pending'` ordered by `created_at DESC`
- Show table: Name, Email, Company, Date
- "Approve" button → updates `status = 'approved'`, `reviewed_at = now()`, `reviewed_by = admin_id` — admin then uses existing "Create User" flow to onboard them
- "Dismiss" button → updates `status = 'dismissed'`

### 6. Fix Manager Permissions (Issue 2)
**File:** `src/contexts/TeamContext.tsx` lines 158-170

Change hardcoded `true` values to use stored flags:
```typescript
if (isManager) {
  return {
    canViewCompany: true,
    canViewFinance: !!membershipPerms?.perm_view_finance,
    canManageFinance: !!membershipPerms?.perm_manage_finance || isFinanceJobTitle,
    canViewStaffSalaries: !!membershipPerms?.perm_view_staff_salaries,
    canViewAR: !!membershipPerms?.perm_view_ar,
    canViewRoster: !!membershipPerms?.perm_view_roster,
    canEditArtists: !!membershipPerms?.perm_edit_artists,
    canViewBilling: !!membershipPerms?.perm_view_billing,
    canDistribute: !!membershipPerms?.perm_distribution,
  };
}
```

### 7. Fix Job Title → Permission Toggle Sync (Issue 4)
**File:** `src/components/settings/InviteMemberDialog.tsx` line 229

Change `onChange={setJobTitle}` to:
```typescript
onChange={(title) => {
  setJobTitle(title);
  const titlePerms = jobTitlePermissions(title);
  const rPerms = roleDefaults(inviteRole);
  setPermissions({
    perm_view_finance: rPerms.perm_view_finance || titlePerms.perm_view_finance,
    perm_manage_finance: rPerms.perm_manage_finance || titlePerms.perm_manage_finance,
    perm_view_staff_salaries: rPerms.perm_view_staff_salaries || titlePerms.perm_view_staff_salaries,
    perm_view_ar: rPerms.perm_view_ar || titlePerms.perm_view_ar,
    perm_view_roster: rPerms.perm_view_roster || titlePerms.perm_view_roster,
    perm_edit_artists: rPerms.perm_edit_artists || titlePerms.perm_edit_artists,
    perm_view_billing: rPerms.perm_view_billing || titlePerms.perm_view_billing,
    perm_distribution: rPerms.perm_distribution || titlePerms.perm_distribution,
  });
}}
```

### 8. Fix Logo on Dark Background (Issue 1)
**File:** `src/pages/JoinTeam.tsx` line 289

Remove `opacity-90` from the logo `<img>` class to ensure full visibility on the dark background.

### Files Modified
- **Database:** 1 new table (`team_applications`) + RLS
- `src/pages/Login.tsx` — signup becomes "Request Access" with company name field
- `src/pages/Onboarding.tsx` — replace wizard with holding page
- `src/pages/Admin.tsx` — add Applications section
- `src/contexts/TeamContext.tsx` — fix manager permission flags
- `src/components/settings/InviteMemberDialog.tsx` — job title syncs toggles
- `src/pages/JoinTeam.tsx` — logo opacity fix

