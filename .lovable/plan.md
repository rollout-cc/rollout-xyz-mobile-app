

# Updated Cleanup Plan — Add Company Finance Reset

## Addition to Previous Plan

On top of deleting Cool Guy Records and wiping Club Hous artist dummy data, also reset company finance for Club Hous:

### What gets reset
- **`teams.annual_budget`** → set to `NULL` (currently $500,000)
- **`company_budget_categories`** → delete all 6 rows for Club Hous team
- **`company_expenses`** → already empty, no action needed

### Implementation
Add these statements to the same database migration:

```sql
-- Reset Club Hous company finance
DELETE FROM company_budget_categories WHERE team_id = 'c6bed68e-7740-4b31-af16-b619126d1fe6';
UPDATE teams SET annual_budget = NULL WHERE id = 'c6bed68e-7740-4b31-af16-b619126d1fe6';
```

This goes into the single migration alongside the Cool Guy Records deletion and Club Hous artist data wipe from the previously approved plan.

