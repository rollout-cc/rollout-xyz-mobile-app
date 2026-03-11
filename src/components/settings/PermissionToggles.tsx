import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface PermissionFlags {
  perm_view_finance: boolean;
  perm_manage_finance: boolean;
  perm_view_staff_salaries: boolean;
  perm_view_ar: boolean;
  perm_view_roster: boolean;
  perm_edit_artists: boolean;
  perm_view_billing: boolean;
}

export const defaultPermissions: PermissionFlags = {
  perm_view_finance: false,
  perm_manage_finance: false,
  perm_view_staff_salaries: false,
  perm_view_ar: false,
  perm_view_roster: false,
  perm_edit_artists: false,
  perm_view_billing: false,
};

/** Returns role-based defaults; toggles are additive on top of these */
export function roleDefaults(role: string): PermissionFlags {
  switch (role) {
    case "team_owner":
      return {
        perm_view_finance: true,
        perm_manage_finance: true,
        perm_view_staff_salaries: true,
        perm_view_ar: true,
        perm_view_roster: true,
        perm_edit_artists: true,
        perm_view_billing: true,
      };
    case "manager":
      return {
        perm_view_finance: true,
        perm_manage_finance: false,
        perm_view_staff_salaries: false,
        perm_view_ar: true,
        perm_view_roster: true,
        perm_edit_artists: true,
        perm_view_billing: false,
      };
    default:
      return defaultPermissions;
  }
}

const PERM_ITEMS: { key: keyof PermissionFlags; label: string; description: string }[] = [
  { key: "perm_view_finance", label: "View Finance", description: "See financial data & budgets" },
  { key: "perm_manage_finance", label: "Manage Finance", description: "Edit budgets & approve transactions" },
  { key: "perm_view_staff_salaries", label: "View Staff Salaries", description: "See salary & payroll info" },
  { key: "perm_view_ar", label: "View A&R", description: "Access the A&R pipeline" },
  { key: "perm_view_roster", label: "View Roster", description: "See all artists on the roster" },
  { key: "perm_edit_artists", label: "Edit Artists", description: "Modify artist profiles & data" },
  { key: "perm_view_billing", label: "View Billing", description: "See subscription & billing info" },
];

interface Props {
  role: string;
  permissions: PermissionFlags;
  onChange: (perms: PermissionFlags) => void;
  disabled?: boolean;
}

export function PermissionToggles({ role, permissions, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Permissions</Label>
      <p className="text-[11px] text-muted-foreground mb-2">
        Control what this member can access. Role defaults are pre-set but can be changed.
      </p>
      <div className="space-y-1.5">
        {PERM_ITEMS.map(({ key, label, description }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-md border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium leading-tight">{label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
            </div>
            <Switch
              checked={permissions[key]}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChange({ ...permissions, [key]: checked })
              }
              className="shrink-0 ml-3"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
