

## Plan: Move Plan Mode Q&A into the Chat Panel

Currently, when Plan Mode is activated and a brief is submitted, the PlanWizard takes over the **workspace** (right panel). The user wants the wizard questions to appear **inline in the chat panel** (left side, replacing the "Hey, I'm ROLLY" empty state), keeping the workspace visible so they can watch work happen after the plan completes.

### Changes

**1. `src/pages/Rolly.tsx`**
- Remove PlanWizard from the workspace content — workspace always shows `<RollyWorkspace />`
- Pass `wizardActive`, `wizardContext`, `onWizardComplete`, `onWizardCancel` props down to `RollyChat`
- Remove the mobile tab-switching logic that sends users to workspace during wizard

**2. `src/components/rolly/RollyChat.tsx`**
- Accept new props: `wizardActive`, `wizardContext`, `onWizardComplete`, `onWizardCancel`
- When `wizardActive` is true, render `<PlanWizard />` **in place of** the messages area (replacing the "Hey, I'm ROLLY" hero and quick actions)
- The input bar stays visible but disabled/hidden during wizard Q&A (the wizard has its own Next button)
- Once wizard completes, it calls `onWizardComplete` which sends the summary prompt to the chat and the workspace becomes visible with work being done

**3. `src/components/rolly/PlanWizard.tsx`**
- Remove the outer header/chrome (back button, "Plan Mode" title) since it's now embedded in the chat panel — use a simpler inline style
- Keep the Q&A cards, brief banner, and Next button

### Desktop Flow After Change
```text
Chat panel (left)              Workspace (right)
─────────────────              ──────────────────
[Plan Mode Q&A]                [Dashboard — always visible]
  Brief banner
  Q1, Q2, Q3...
  [Next] button
                               
After completion:
[Chat messages]                [Dashboard shows new tasks/budgets]
  Rolly executing...
```

### Mobile Flow
- Plan Mode Q&A shows in the Chat tab (no tab switch needed)
- After completion, user can tap Workspace tab to see results

### Files to Edit

| File | Change |
|------|--------|
| `src/pages/Rolly.tsx` | Remove PlanWizard from workspace, pass wizard state to RollyChat |
| `src/components/rolly/RollyChat.tsx` | Render PlanWizard inline when wizard is active |
| `src/components/rolly/PlanWizard.tsx` | Remove standalone header/chrome, adapt for embedded layout |

