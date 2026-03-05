import { useState } from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";


const JOB_TITLE_DEPARTMENTS: { department: string; roles: string[] }[] = [
  {
    department: "A&R",
    roles: [
      "A&R Coordinator", "A&R Administrator", "A&R Manager", "A&R Director",
      "Senior Director of A&R", "VP of A&R", "SVP of A&R", "EVP of A&R", "Head of A&R",
    ],
  },
  {
    department: "Management",
    roles: [
      "Assistant Manager", "Day-to-Day Manager", "Artist Manager", "Senior Manager",
      "Tour Manager", "Business Manager", "Head of Management",
    ],
  },
  {
    department: "Marketing",
    roles: [
      "Marketing Coordinator", "Marketing Associate", "Marketing Manager",
      "Senior Marketing Manager", "Director of Marketing", "VP of Marketing",
      "Head of Digital Marketing", "Head of Marketing",
    ],
  },
  {
    department: "Creative & Content",
    roles: [
      "Graphic Designer", "Content Creator", "Videographer", "Content Manager",
      "Art Director", "Creative Director", "Head of Creative",
    ],
  },
  {
    department: "Legal & Business Affairs",
    roles: [
      "Paralegal", "Business Affairs Coordinator", "Business Affairs Manager",
      "Director of Business Affairs", "VP of Legal", "General Counsel",
    ],
  },
  {
    department: "Finance & Accounting",
    roles: [
      "Accounting Clerk", "Royalty Analyst", "Accountant", "Senior Accountant",
      "Controller", "VP of Finance", "CFO",
    ],
  },
  {
    department: "Operations & Admin",
    roles: [
      "Executive Assistant", "Office Manager", "Operations Manager", "Chief of Staff", "COO",
    ],
  },
  {
    department: "Promotion",
    roles: [
      "Regional Promoter", "Radio Promoter", "National Director of Promotion",
      "VP of Promotion", "Head of Promotion",
    ],
  },
];

interface JobTitleSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function JobTitleSelect({
  value,
  onChange,
  placeholder = "Select job title",
  triggerClassName,
}: JobTitleSelectProps) {
  const [open, setOpen] = useState(false);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const handleSelect = (role: string) => {
    onChange(role);
    setOpen(false);
    setExpandedDept(null);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setExpandedDept(null); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="max-h-72 overflow-y-auto py-1">
          {JOB_TITLE_DEPARTMENTS.map((dept) => {
            const isExpanded = expandedDept === dept.department;
            return (
              <div key={dept.department}>
                <button
                  type="button"
                  onClick={() => setExpandedDept(isExpanded ? null : dept.department)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-accent/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {dept.department}
                </button>
                {isExpanded && dept.roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleSelect(role)}
                    className={cn(
                      "flex w-full items-center gap-2 px-4 pl-9 py-2 text-sm hover:bg-accent transition-colors",
                      value === role && "bg-accent"
                    )}
                  >
                    {value === role && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    <span className={value === role ? "" : "pl-[22px]"}>{role}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { JOB_TITLE_DEPARTMENTS };
