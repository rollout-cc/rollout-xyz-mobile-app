import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { StepCompanyType } from "./StepCompanyType";
import { StepCompanyProfile } from "./StepCompanyProfile";
import { StepAddArtists } from "./StepAddArtists";
import { StepInviteMembers } from "./StepInviteMembers";
import { StepBudget } from "./StepBudget";

const TOTAL_STEPS = 6;

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
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [companyType, setCompanyType] = useState<string | null>(null);
  // Step 2
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  // Step 3
  const [addedArtists, setAddedArtists] = useState<OnboardingArtist[]>([]);
  // Step 5
  const [annualBudget, setAnnualBudget] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );

  const canGoNext = () => {
    if (step === 1) return !!companyType;
    if (step === 2) return !!companyName.trim();
    return true;
  };

  const handleLogoUpload = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${teamId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error(uploadError.message);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    setLogoUrl(url);
    await supabase.from("teams").update({ avatar_url: url }).eq("id", teamId);
  };

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
      const { error } = await supabase
        .from("teams")
        .update({ company_type: companyType } as any)
        .eq("id", teamId);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
    }

    if (step === 2) {
      setSaving(true);
      const { error } = await supabase
        .from("teams")
        .update({ name: companyName.trim() } as any)
        .eq("id", teamId);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
    }

    if (step === 5) {
      setSaving(true);
      // Save annual budget
      if (annualBudget) {
        await supabase
          .from("teams")
          .update({ annual_budget: parseFloat(annualBudget) } as any)
          .eq("id", teamId);
      }
      // Save budget categories
      if (selectedCategories.size > 0) {
        const rows = Array.from(selectedCategories).map((name) => ({
          team_id: teamId,
          name,
          annual_budget: 0,
        }));
        await supabase.from("company_budget_categories").insert(rows);
      }
      setSaving(false);
    }

    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("teams")
      .update({ onboarding_completed: true } as any)
      .eq("id", teamId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("You're all set!");
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 w-full">
      {step > 1 && (
        <button
          onClick={() => setStep(step - 1)}
          className="self-start flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}

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
            <StepCompanyType
              selected={companyType}
              setSelected={setCompanyType}
            />
          )}
          {step === 2 && (
            <StepCompanyProfile
              companyName={companyName}
              setCompanyName={setCompanyName}
              logoUrl={logoUrl}
              onLogoUpload={handleLogoUpload}
            />
          )}
          {step === 3 && (
            <StepAddArtists
              teamId={teamId}
              addedArtists={addedArtists}
              onArtistAdded={(a) =>
                setAddedArtists((prev) => [...prev, a])
              }
            />
          )}
          {step === 4 && (
            <StepInviteMembers
              teamId={teamId}
              userId={user!.id}
              addedArtists={addedArtists}
            />
          )}
          {step === 5 && (
            <StepBudget
              annualBudget={annualBudget}
              setAnnualBudget={setAnnualBudget}
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
            />
          )}
          {step === 6 && (
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                You're all set!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your company is ready. Explore your dashboard, manage your
                roster, and start building.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-8">
            <span className="text-sm text-muted-foreground">
              {step} of {TOTAL_STEPS}
            </span>
            {step < TOTAL_STEPS ? (
              <div className="flex gap-2">
                {step >= 3 && step <= 5 && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (step === 5) {
                        // Save budget before skipping
                        handleNext();
                        return;
                      }
                      setStep(step + 1);
                    }}
                  >
                    Skip
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={saving || !canGoNext()}
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
                {saving ? "Saving..." : "Let's go"}
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
