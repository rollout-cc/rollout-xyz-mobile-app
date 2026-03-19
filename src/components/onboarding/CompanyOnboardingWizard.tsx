import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { StepBudget } from "./StepBudget";

export interface OnboardingArtist {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Props {
  teamId: string;
  onComplete: () => void;
}

export function CompanyOnboardingWizard({ teamId, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [annualBudget, setAnnualBudget] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleNext = async () => {
    if (step === 1) {
      setSaving(true);
      if (annualBudget) {
        await supabase
          .from("teams")
          .update({ annual_budget: parseFloat(annualBudget) } as any)
          .eq("id", teamId);
      }
      if (selectedCategories.size > 0) {
        const rows = Array.from(selectedCategories).map((name) => ({
          team_id: teamId,
          name,
          annual_budget: 0,
        }));
        await supabase.from("company_budget_categories").insert(rows);
      }
      setSaving(false);
      setStep(2);
    }
  };

  const handleFinish = async () => {
    toast.success("Budget saved!");
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg"
        >
          {step === 1 && (
            <StepBudget
              annualBudget={annualBudget}
              setAnnualBudget={setAnnualBudget}
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
            />
          )}
          {step === 2 && (
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Budget configured!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your company budget is set. You can always adjust it later in settings.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 mt-10 pt-2">
            <span className="text-sm text-muted-foreground">
              {step} of 2
            </span>
            {step === 1 ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={handleFinish}
                >
                  Skip
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={saving}
                  className="bg-foreground text-background hover:bg-foreground/90 rounded-lg px-6"
                >
                  {saving ? "Saving..." : "Next"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={saving}
                className="bg-foreground text-background hover:bg-foreground/90 rounded-lg px-6"
              >
                Done
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
