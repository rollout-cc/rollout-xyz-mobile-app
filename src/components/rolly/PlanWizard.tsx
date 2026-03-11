import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";

export type PlanAnswers = Record<string, string | string[]>;

type PlanOption = {
  label: string;
  description?: string;
};

type PlanStep = {
  id: string;
  question: string;
  header: string;
  options: PlanOption[];
  multiSelect?: boolean;
  allowOther?: boolean;
  /** Only show this step if a condition on previous answers is met */
  showIf?: (answers: PlanAnswers) => boolean;
};

const PLAN_STEPS: PlanStep[] = [
  {
    id: "plan_type",
    question: "What are you planning?",
    header: "Plan type",
    options: [
      { label: "Release rollout", description: "Plan a single, EP, or album release from start to finish" },
      { label: "Marketing campaign", description: "Build a focused campaign with goals, budget, and timeline" },
      { label: "Budget setup", description: "Set up budget categories and allocations for an artist" },
      { label: "Weekly planning", description: "Plan out the week with tasks, priorities, and milestones" },
    ],
    allowOther: true,
  },
  {
    id: "artist",
    question: "Which artist is this for?",
    header: "Artist",
    options: [], // populated dynamically from roster
    allowOther: true,
  },
  {
    id: "release_type",
    question: "What type of release?",
    header: "Release type",
    options: [
      { label: "Single", description: "One track release" },
      { label: "EP", description: "3-6 tracks" },
      { label: "Album", description: "7+ tracks, full project" },
    ],
    showIf: (a) => a.plan_type === "Release rollout",
  },
  {
    id: "project_name",
    question: "What's the project name?",
    header: "Project name",
    options: [],
    allowOther: true,
    showIf: (a) => a.plan_type === "Release rollout",
  },
  {
    id: "goals",
    question: "What does success look like?",
    header: "Goals",
    multiSelect: true,
    options: [
      { label: "Streaming growth", description: "Increase monthly listeners and streams" },
      { label: "Revenue targets", description: "Hit specific income goals from music + merch" },
      { label: "Fan engagement", description: "Build deeper connection with existing fans" },
      { label: "Brand awareness", description: "Get the artist's name in front of new audiences" },
    ],
    allowOther: true,
    showIf: (a) => a.plan_type !== "Weekly planning",
  },
  {
    id: "verticals",
    question: "Which business verticals are in play?",
    header: "Verticals",
    multiSelect: true,
    options: [
      { label: "Music / Streaming", description: "DSPs, radio, playlisting" },
      { label: "Merch / Clothing", description: "Apparel, physical goods, drops" },
      { label: "Touring / Live", description: "Shows, tours, pop-ups, festivals" },
      { label: "Sync / Licensing", description: "Film, TV, brand placements" },
    ],
    allowOther: true,
    showIf: (a) => a.plan_type === "Release rollout" || a.plan_type === "Marketing campaign",
  },
  {
    id: "timeline",
    question: "What's the target timeline?",
    header: "Timeline",
    options: [
      { label: "2 weeks", description: "Quick turnaround sprint" },
      { label: "1 month", description: "Standard campaign window" },
      { label: "3 months", description: "Full rollout with phases" },
      { label: "6 months", description: "Extended rollout with pre-release buildup" },
    ],
    allowOther: true,
    showIf: (a) => a.plan_type !== "Weekly planning",
  },
  {
    id: "budget",
    question: "What's the budget range?",
    header: "Budget",
    options: [
      { label: "$0 – $1,000", description: "Bootstrapped, organic focus" },
      { label: "$1,000 – $5,000", description: "Targeted spend on key areas" },
      { label: "$5,000 – $15,000", description: "Serious campaign budget" },
      { label: "$15,000+", description: "Full-scale operation" },
    ],
    allowOther: true,
    showIf: (a) => a.plan_type !== "Weekly planning",
  },
];

interface PlanWizardProps {
  onComplete: (answers: PlanAnswers) => void;
  onCancel: () => void;
}

export function PlanWizard({ onComplete, onCancel }: PlanWizardProps) {
  const { selectedTeamId } = useSelectedTeam();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<PlanAnswers>({});
  const [otherText, setOtherText] = useState("");

  // Fetch artists for dynamic step
  const { data: artists = [] } = useQuery({
    queryKey: ["plan-wizard-artists", selectedTeamId],
    queryFn: async () => {
      const { data } = await supabase
        .from("artists")
        .select("id, name")
        .eq("team_id", selectedTeamId!)
        .order("name");
      return data ?? [];
    },
    enabled: !!selectedTeamId,
  });

  // Build visible steps based on current answers
  const visibleSteps = PLAN_STEPS.filter(
    (step) => !step.showIf || step.showIf(answers)
  );

  const step = visibleSteps[currentStep];

  // Dynamically inject artist options
  const stepOptions: PlanOption[] =
    step
      ? step.id === "artist"
        ? artists.map((a) => ({ label: a.name }))
        : step.options
      : [];

  // For project_name step, just show an "Other" input
  const isTextOnly = step.id === "project_name";

  const currentAnswer = answers[step.id];
  const isMulti = step.multiSelect;
  const selectedValues: string[] = isMulti
    ? (Array.isArray(currentAnswer) ? currentAnswer : [])
    : [];
  const selectedValue: string = !isMulti && typeof currentAnswer === "string" ? currentAnswer : "";

  const isOtherSelected = isMulti
    ? selectedValues.some((v) => !stepOptions.some((o) => o.label === v))
    : !!selectedValue && !stepOptions.some((o) => o.label === selectedValue);

  const canProceed = isTextOnly
    ? !!otherText.trim()
    : isMulti
    ? selectedValues.length > 0
    : !!selectedValue;

  const isLastStep = currentStep === visibleSteps.length - 1;

  const handleSingleSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [step.id]: value }));
    setOtherText("");
  };

  const handleMultiToggle = (label: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[step.id]) ? [...(prev[step.id] as string[])] : [];
      const idx = current.indexOf(label);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(label);
      return { ...prev, [step.id]: current };
    });
  };

  const handleOtherToggle = () => {
    if (isMulti) {
      // Remove any non-option value, or add placeholder
      const cleaned = selectedValues.filter((v) => stepOptions.some((o) => o.label === v));
      if (isOtherSelected) {
        setAnswers((prev) => ({ ...prev, [step.id]: cleaned }));
        setOtherText("");
      } else {
        setOtherText("");
      }
    } else {
      if (isOtherSelected) {
        setAnswers((prev) => ({ ...prev, [step.id]: "" }));
        setOtherText("");
      } else {
        setAnswers((prev) => ({ ...prev, [step.id]: "" }));
        setOtherText("");
      }
    }
  };

  const handleOtherTextChange = (value: string) => {
    setOtherText(value);
    if (isMulti) {
      const optionValues = selectedValues.filter((v) => stepOptions.some((o) => o.label === v));
      if (value.trim()) {
        setAnswers((prev) => ({ ...prev, [step.id]: [...optionValues, value.trim()] }));
      } else {
        setAnswers((prev) => ({ ...prev, [step.id]: optionValues }));
      }
    } else {
      setAnswers((prev) => ({ ...prev, [step.id]: value.trim() }));
    }
  };

  const handleNext = () => {
    if (isTextOnly && otherText.trim()) {
      setAnswers((prev) => ({ ...prev, [step.id]: otherText.trim() }));
    }
    if (isLastStep) {
      const finalAnswers = { ...answers };
      if (isTextOnly) finalAnswers[step.id] = otherText.trim();
      onComplete(finalAnswers);
    } else {
      setCurrentStep((s) => s + 1);
      setOtherText("");
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      onCancel();
    } else {
      setCurrentStep((s) => s - 1);
      setOtherText("");
    }
  };

  // Reset otherText when step changes
  useEffect(() => {
    if (isTextOnly) {
      setOtherText(typeof answers[step.id] === "string" ? (answers[step.id] as string) : "");
    } else if (isOtherSelected && !isMulti) {
      setOtherText(selectedValue);
    } else if (isOtherSelected && isMulti) {
      const otherVal = selectedValues.find((v) => !stepOptions.some((o) => o.label === v));
      setOtherText(otherVal || "");
    } else {
      setOtherText("");
    }
  }, [currentStep]);

  const progress = ((currentStep + 1) / visibleSteps.length) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              Plan Mode — Step {currentStep + 1} of {visibleSteps.length}
            </span>
          </div>
          <span className="text-xs font-medium text-primary">{step.header}</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <h2 className="text-xl font-bold text-foreground mb-6">{step.question}</h2>

        {isTextOnly ? (
          <div className="space-y-2">
            <Input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Enter project name..."
              className="text-base"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && otherText.trim()) handleNext();
              }}
            />
          </div>
        ) : isMulti ? (
          <div className="space-y-2">
            {stepOptions.map((option) => {
              const checked = selectedValues.includes(option.label);
              return (
                <label
                  key={option.label}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                    checked
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => handleMultiToggle(option.label)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{option.label}</p>
                    {option.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                    )}
                  </div>
                </label>
              );
            })}
            {step.allowOther && (
              <label
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                  isOtherSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <Checkbox
                  checked={isOtherSelected || otherText.length > 0}
                  onCheckedChange={handleOtherToggle}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  {isOtherSelected || otherText.length > 0 ? (
                    <Input
                      value={otherText}
                      onChange={(e) => handleOtherTextChange(e.target.value)}
                      placeholder="Type your answer..."
                      className="h-8 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent"
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">Other</p>
                  )}
                </div>
              </label>
            )}
          </div>
        ) : (
          <RadioGroup
            value={isOtherSelected ? "__other__" : selectedValue}
            onValueChange={(val) => {
              if (val === "__other__") {
                handleSingleSelect("");
                setOtherText("");
              } else {
                handleSingleSelect(val);
              }
            }}
            className="space-y-2"
          >
            {stepOptions.map((option) => (
              <label
                key={option.label}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                  selectedValue === option.label
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <RadioGroupItem value={option.label} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{option.label}</p>
                  {option.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                  )}
                </div>
              </label>
            ))}
            {step.allowOther && (
              <label
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                  isOtherSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <RadioGroupItem value="__other__" className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  {isOtherSelected ? (
                    <Input
                      value={otherText}
                      onChange={(e) => handleOtherTextChange(e.target.value)}
                      placeholder="Type your answer..."
                      className="h-8 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent"
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">Other</p>
                  )}
                </div>
              </label>
            )}
          </RadioGroup>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {currentStep === 0 ? "Cancel" : "Back"}
        </Button>
        <Button size="sm" onClick={handleNext} disabled={!canProceed}>
          {isLastStep ? (
            <>
              <Sparkles className="h-4 w-4 mr-1" />
              Generate Plan
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
