import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEFAULT_CATEGORIES = [
  "Marketing & Promotion",
  "A&R",
  "Legal & Business Affairs",
  "Travel & Touring",
  "Production",
  "Distribution",
  "PR & Communications",
  "Merchandise",
  "Office & Operations",
  "Creative & Design",
];

interface Props {
  annualBudget: string;
  setAnnualBudget: (v: string) => void;
  selectedCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
}

export function StepBudget({
  annualBudget,
  setAnnualBudget,
  selectedCategories,
  onToggleCategory,
}: Props) {
  return (
    <>
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Set your company budget
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        Define your annual budget and select the categories you'd like to track.
      </p>

      <div className="mb-6">
        <Label className="font-semibold text-sm mb-2 block">
          Annual Company Budget
        </Label>
        <Input
          type="number"
          value={annualBudget}
          onChange={(e) => setAnnualBudget(e.target.value)}
          placeholder="e.g. 500000"
          className="text-lg"
        />
      </div>

      <div>
        <Label className="font-semibold text-sm mb-3 block">
          Budget Categories
        </Label>
        <p className="text-xs text-muted-foreground mb-3">
          Select the categories relevant to your business. You can customize
          amounts later.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => onToggleCategory(cat)}
                className={cn(
                  "text-left rounded-lg border p-3 text-sm transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{cat}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
