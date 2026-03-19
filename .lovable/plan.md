

## Plan: Branded 404 & Error Pages

### Changes

**1. Redesign `src/pages/NotFound.tsx`**
- Dark `bg-background` centered layout
- Rollout flag SVG displayed large with a subtle waving CSS animation (gentle rotate + translateY, 3s loop)
- Large bold "404" below the flag
- Subtext: "f*ck, something went wrong"
- Smaller muted text: "a ROLLOUT team member just got an email because of this and will be fixing soon"
- "Back to Roster" button linking to `/roster`

**2. Redesign `src/components/ErrorBoundary.tsx`**
- Same branded layout with the flag logo (smaller, gentle pulse)
- Same copy: "f*ck, something went wrong" + team notification message
- Keep "Try Again" button and dev-only error stack trace
- Remove the AlertTriangle icon

**3. Add animation keyframes to `tailwind.config.ts`**
- `flag-wave`: 3s infinite ease-in-out, rotating -3deg to 3deg with slight vertical float

