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
    <div className="space-y-4 sm:space-y-8">
      <header className="space-y-2 sm:space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Set your company budget
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Define your annual budget and select the categories you'd like to track.
        </p>
      </header>

      <section className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="annual-budget" className="text-sm font-semibold">
          Annual Company Budget
        </Label>
        <Input
          id="annual-budget"
          type="number"
          inputMode="decimal"
          value={annualBudget}
          onChange={(e) => setAnnualBudget(e.target.value)}
          placeholder="e.g. 500000"
          className="min-h-11 rounded-xl px-3.5 text-base sm:min-h-12 sm:px-4 sm:text-lg"
        />
      </section>

      <section className="space-y-3 sm:space-y-4">
        <div className="space-y-1 sm:space-y-2">
          <Label className="text-sm font-semibold">Budget Categories</Label>
          <p className="text-sm leading-snug text-muted-foreground">
            Select the categories relevant to your business. You can customize
            amounts later.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {DEFAULT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.has(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onToggleCategory(cat)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition-all [-webkit-tap-highlight-color:transparent] active:opacity-90 sm:min-h-[3.25rem] sm:px-3.5 sm:py-3.5",
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
