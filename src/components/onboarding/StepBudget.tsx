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
    <div className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Set your company budget
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Define your annual budget and select the categories you'd like to track.
        </p>
      </header>

      <section className="space-y-2">
        <Label htmlFor="annual-budget" className="font-semibold text-sm">
          Annual Company Budget
        </Label>
        <Input
          id="annual-budget"
          type="number"
          inputMode="decimal"
          value={annualBudget}
          onChange={(e) => setAnnualBudget(e.target.value)}
          placeholder="e.g. 500000"
          className="text-lg min-h-12 rounded-xl px-4"
        />
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <Label className="font-semibold text-sm">Budget Categories</Label>
          <p className="text-sm text-muted-foreground leading-snug">
            Select the categories relevant to your business. You can customize
            amounts later.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {DEFAULT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.has(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onToggleCategory(cat)}
                className={cn(
                  "text-left rounded-xl border min-h-[3.25rem] px-3.5 py-3.5 text-sm transition-all [-webkit-tap-highlight-color:transparent] active:opacity-90",
                  isSelected
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="leading-snug">{cat}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
