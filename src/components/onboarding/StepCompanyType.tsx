import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPANY_TYPES = [
  { value: "label", label: "Record Label", description: "Sign, develop, and release music for artists" },
  { value: "distribution", label: "Distribution", description: "Distribute and deliver music to platforms and retailers" },
  { value: "management", label: "Management", description: "Manage careers, bookings, and strategy for artists" },
  { value: "publishing", label: "Publishing", description: "Administer songwriting rights and collect royalties" },
  { value: "multi_service", label: "Multi-Service", description: "Operate across multiple areas of the music business" },
];

interface Props {
  selected: string | null;
  setSelected: (v: string) => void;
}

export function StepCompanyType({ selected, setSelected }: Props) {
  return (
    <>
      <h2 className="text-2xl font-bold text-foreground mb-2">What type of company are you?</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        We'll tailor your dashboard and tools to match your workflow.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {COMPANY_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setSelected(type.value)}
            className={cn(
              "relative text-left rounded-xl border-2 p-4 transition-all duration-200",
              "hover:border-primary/50 hover:bg-accent/50",
              selected === type.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card"
            )}
          >
            {selected === type.value && (
              <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <p className="font-semibold text-sm text-foreground">{type.label}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{type.description}</p>
          </button>
        ))}
      </div>
    </>
  );
}
