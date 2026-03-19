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
  perm_distribution: boolean;
}

export const defaultPermissions: PermissionFlags = {
  perm_view_finance: false,
  perm_manage_finance: false,
  perm_view_staff_salaries: false,
  perm_view_ar: false,
  perm_view_roster: false,
  perm_edit_artists: false,
  perm_view_billing: false,
  perm_distribution: false,
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
        perm_distribution: true,
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
        perm_distribution: false,
      };
    default:
      return defaultPermissions;
  }
}

/** Returns permission defaults based on job title */
export function jobTitlePermissions(jobTitle: string): PermissionFlags {
  const perms = { ...defaultPermissions };

  // A&R titles
  if (["A&R Coordinator", "A&R Manager", "Head of A&R"].includes(jobTitle)) {
    perms.perm_view_ar = true;
  }

  // Finance titles
  if (["Accountant", "Controller", "CFO"].includes(jobTitle)) {
    perms.perm_view_finance = true;
    perms.perm_manage_finance = true;
  }
  if (["Controller", "CFO"].includes(jobTitle)) {
    perms.perm_view_staff_salaries = true;
    perms.perm_view_billing = true;
  }

  // Management titles
  if (["Artist Manager", "Senior Manager", "Tour Manager", "Business Manager"].includes(jobTitle)) {
    perms.perm_view_roster = true;
    perms.perm_edit_artists = true;
    perms.perm_view_finance = true;
  }
  if (jobTitle === "Business Manager") {
    perms.perm_view_staff_salaries = true;
  }

  // Legal titles
  if (["Business Affairs Manager", "General Counsel"].includes(jobTitle)) {
    perms.perm_distribution = true;
    perms.perm_view_finance = true;
  }

  // Operations
  if (["Operations Manager", "Chief of Staff"].includes(jobTitle)) {
    perms.perm_view_finance = true;
    perms.perm_manage_finance = true;
    perms.perm_view_staff_salaries = true;
    perms.perm_edit_artists = true;
  }

  // COO — all true
  if (jobTitle === "COO") {
    return {
      perm_view_finance: true,
      perm_manage_finance: true,
      perm_view_staff_salaries: true,
      perm_view_ar: true,
      perm_view_roster: true,
      perm_edit_artists: true,
      perm_view_billing: true,
      perm_distribution: true,
    };
  }

  // Executive Assistant
  if (jobTitle === "Executive Assistant") {
    perms.perm_view_roster = true;
  }

  // Content Creator / Marketing Coordinator
  if (["Content Creator", "Marketing Coordinator"].includes(jobTitle)) {
    perms.perm_view_roster = true;
  }

  // Marketing Manager / Head of Marketing / Head of Promotion / Creative Director
  if (["Marketing Manager", "Head of Marketing", "Head of Promotion", "Creative Director"].includes(jobTitle)) {
    perms.perm_view_roster = true;
    perms.perm_view_ar = true;
  }

  return perms;
}

/** Map job title to persona */
export function jobTitleToPersona(jobTitle: string): string | null {
  if (jobTitle === "Executive Assistant") return "ea";
  if (["A&R Coordinator", "A&R Manager", "Head of A&R"].includes(jobTitle)) return "ar";
  if (["Accountant", "Controller", "CFO"].includes(jobTitle)) return "finance";
  if (["Artist Manager", "Senior Manager", "Tour Manager", "Business Manager"].includes(jobTitle)) return "management";
  if (["Marketing Coordinator", "Marketing Manager", "Head of Marketing", "Head of Promotion"].includes(jobTitle)) return "marketing";
  if (["Content Creator", "Creative Director"].includes(jobTitle)) return "creative";
  if (["Business Affairs Manager", "General Counsel"].includes(jobTitle)) return "legal";
  if (["Executive Assistant", "Operations Manager", "Chief of Staff", "COO"].includes(jobTitle)) return "operations";
  return null;
}

/** Map job title to appropriate access level / role */
export function jobTitleToRole(jobTitle: string): string {
  // High-level roles that should be owners/managers
  if (["COO", "CFO", "General Counsel", "Head of A&R", "Head of Marketing", "Head of Promotion", "Chief of Staff", "Creative Director"].includes(jobTitle)) {
    return "manager";
  }
  // Standard manager-level
  if (["Artist Manager", "Senior Manager", "Business Manager", "Tour Manager", "A&R Manager", "Marketing Manager", "Operations Manager", "Business Affairs Manager", "Controller"].includes(jobTitle)) {
    return "manager";
  }
  // Everyone else is artist-level (team member)
  return "artist";
}

const PERM_ITEMS: { key: keyof PermissionFlags; label: string; description: string }[] = [
  { key: "perm_view_finance", label: "View Finance", description: "See financial data & budgets" },
  { key: "perm_manage_finance", label: "Manage Finance", description: "Edit budgets & approve transactions" },
  { key: "perm_view_staff_salaries", label: "View Staff Salaries", description: "See salary & payroll info" },
  { key: "perm_view_ar", label: "View A&R", description: "Access the A&R pipeline" },
  { key: "perm_view_roster", label: "View Roster", description: "See all artists on the roster" },
  { key: "perm_edit_artists", label: "Edit Artists", description: "Modify artist profiles & data" },
  { key: "perm_view_billing", label: "View Billing", description: "See subscription & billing info" },
  { key: "perm_distribution", label: "Distribution", description: "Access distribution & splits" },
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
