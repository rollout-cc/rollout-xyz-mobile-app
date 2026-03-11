import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

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
  showIf?: (answers: PlanAnswers) => boolean;
};

const hasVertical = (answers: PlanAnswers, v: string) => {
  const verts = answers.verticals;
  return Array.isArray(verts) && verts.includes(v);
};

const notWeekly = (a: PlanAnswers) => a.plan_type !== "Weekly planning";
const isRolloutOrCampaign = (a: PlanAnswers) =>
  a.plan_type === "Release rollout" || a.plan_type === "Marketing campaign";

const PLAN_STEPS: PlanStep[] = [
  // ── CORE ──
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
    options: [],
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
    showIf: notWeekly,
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
    showIf: isRolloutOrCampaign,
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
    showIf: notWeekly,
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
    showIf: notWeekly,
  },

  // ── NARRATIVE & IDENTITY ──
  {
    id: "era_theme",
    question: "What's the story or theme of this era?",
    header: "Narrative",
    options: [],
    showIf: notWeekly,
  },
  {
    id: "visual_direction",
    question: "What's the visual direction?",
    header: "Visual DNA",
    options: [
      { label: "Dark / moody", description: "Cinematic, noir, heavy contrast" },
      { label: "Bright / colorful", description: "Bold palettes, high energy" },
      { label: "Minimal / clean", description: "Stripped-back, whitespace-driven" },
      { label: "Luxury / editorial", description: "High-fashion, glossy, editorial" },
    ],
    allowOther: true,
    showIf: notWeekly,
  },

  // ── MUSIC / DISTRIBUTION ──
  {
    id: "music_ready",
    question: "Is the music done?",
    header: "Music status",
    options: [
      { label: "Yes", description: "Final masters in hand" },
      { label: "Almost", description: "Mixing/mastering in progress" },
      { label: "Still recording", description: "Not yet finished" },
    ],
    showIf: (a) => hasVertical(a, "Music / Streaming"),
  },
  {
    id: "distributor",
    question: "Do you have a distributor locked in?",
    header: "Distribution",
    options: [
      { label: "Yes", description: "Distribution deal or platform set up" },
      { label: "Looking", description: "Evaluating options" },
      { label: "Self-distributing", description: "Using DistroKid, TuneCore, etc." },
    ],
    showIf: (a) => hasVertical(a, "Music / Streaming"),
  },
  {
    id: "playlist_strategy",
    question: "What's your playlist strategy?",
    header: "Playlisting",
    multiSelect: true,
    options: [
      { label: "Organic pitching", description: "Spotify for Artists, Apple Connect" },
      { label: "Paid playlist", description: "Playlist push services" },
      { label: "Editorial push", description: "PR-driven editorial placements" },
      { label: "Influencer seeding", description: "Get tastemakers playing it" },
    ],
    allowOther: true,
    showIf: (a) => hasVertical(a, "Music / Streaming"),
  },
  {
    id: "radio_plans",
    question: "Any radio plans?",
    header: "Radio",
    options: [
      { label: "Yes - indie radio", description: "College, community, online stations" },
      { label: "Yes - major radio promo", description: "Full promo campaign" },
      { label: "No radio", description: "Focusing on streaming & digital" },
      { label: "Not sure", description: "Need guidance" },
    ],
    showIf: (a) => hasVertical(a, "Music / Streaming"),
  },

  // ── MERCH / CLOTHING ──
  {
    id: "merch_designs",
    question: "Do you have merch designs ready?",
    header: "Merch designs",
    options: [
      { label: "Yes", description: "Designs are finalized" },
      { label: "In progress", description: "Working with a designer" },
      { label: "No - need help", description: "Haven't started yet" },
    ],
    showIf: (a) => hasVertical(a, "Merch / Clothing"),
  },
  {
    id: "merch_fulfillment",
    question: "How will merch be fulfilled?",
    header: "Fulfillment",
    options: [
      { label: "In-house", description: "Packing and shipping yourself" },
      { label: "Drop shipping", description: "Third-party handles everything" },
      { label: "Print-on-demand", description: "Items printed as ordered" },
      { label: "Manufacturing partner", description: "Bulk production runs" },
    ],
    allowOther: true,
    showIf: (a) => hasVertical(a, "Merch / Clothing"),
  },
  {
    id: "merch_link",
    question: "Drop the link to designs or store",
    header: "Merch link",
    options: [],
    showIf: (a) => hasVertical(a, "Merch / Clothing") && a.merch_designs !== "No - need help",
  },
  {
    id: "merch_drop_strategy",
    question: "Limited drops or ongoing collection?",
    header: "Drop strategy",
    options: [
      { label: "Limited drops", description: "Scarcity-driven, timed releases" },
      { label: "Ongoing store", description: "Always-available collection" },
      { label: "Both", description: "Core collection + limited exclusives" },
    ],
    showIf: (a) => hasVertical(a, "Merch / Clothing"),
  },

  // ── TOURING / LIVE ──
  {
    id: "live_type",
    question: "What live events are planned?",
    header: "Live events",
    multiSelect: true,
    options: [
      { label: "Headline shows", description: "Own ticketed events" },
      { label: "Pop-ups / listening events", description: "Intimate, experiential moments" },
      { label: "Festival slots", description: "Festival bookings" },
      { label: "College circuit", description: "University shows" },
    ],
    allowOther: true,
    showIf: (a) => hasVertical(a, "Touring / Live"),
  },
  {
    id: "booking_agent",
    question: "Do you have a booking agent?",
    header: "Booking",
    options: [
      { label: "Yes", description: "Agent is handling bookings" },
      { label: "No", description: "Self-booking" },
      { label: "Looking", description: "In conversations" },
    ],
    showIf: (a) => hasVertical(a, "Touring / Live"),
  },

  // ── SYNC / LICENSING ──
  {
    id: "sync_cleared",
    question: "Is the music cleared for sync?",
    header: "Sync clearance",
    options: [
      { label: "Yes", description: "Masters & publishing cleared" },
      { label: "Partially", description: "Some tracks cleared" },
      { label: "No", description: "Need to work on clearances" },
    ],
    showIf: (a) => hasVertical(a, "Sync / Licensing"),
  },
  {
    id: "sync_pitches",
    question: "Any active sync pitches or placements?",
    header: "Sync pitches",
    options: [
      { label: "Yes", description: "Active placements in pipeline" },
      { label: "No", description: "Nothing active yet" },
      { label: "Working on it", description: "Building relationships" },
    ],
    showIf: (a) => hasVertical(a, "Sync / Licensing"),
  },

  // ── CONTENT STRATEGY ──
  {
    id: "content_types",
    question: "What content is planned?",
    header: "Content",
    multiSelect: true,
    options: [
      { label: "Music video", description: "Full production video" },
      { label: "Visualizers", description: "Lyric videos, animated visuals" },
      { label: "Behind-the-scenes", description: "Studio sessions, process content" },
      { label: "Short film / documentary", description: "Long-form narrative content" },
    ],
    allowOther: true,
    showIf: notWeekly,
  },
  {
    id: "content_team",
    question: "Who's handling content creation?",
    header: "Content team",
    options: [
      { label: "In-house team", description: "Internal team handles it" },
      { label: "Freelancers", description: "Contracted creators" },
      { label: "Need to hire", description: "Looking for talent" },
      { label: "Not sure", description: "Need guidance" },
    ],
    showIf: notWeekly,
  },

  // ── PR & PRESS ──
  {
    id: "has_publicist",
    question: "Does the artist have a publicist?",
    header: "PR",
    options: [
      { label: "Yes", description: "Publicist is on the team" },
      { label: "No", description: "No publicist currently" },
      { label: "Looking for one", description: "Searching for the right fit" },
    ],
    showIf: notWeekly,
  },
  {
    id: "publicist_invited",
    question: "Have they been invited to Rollout?",
    header: "PR access",
    options: [
      { label: "Yes", description: "Already a team member" },
      { label: "Not yet", description: "We'll create a task to invite them" },
    ],
    showIf: (a) => notWeekly(a) && a.has_publicist === "Yes",
  },
  {
    id: "press_targets",
    question: "Any press targets?",
    header: "Press",
    multiSelect: true,
    options: [
      { label: "Blogs / online", description: "Music blogs, online publications" },
      { label: "Print magazines", description: "Physical print features" },
      { label: "Podcasts", description: "Podcast interviews & features" },
      { label: "TV / radio interviews", description: "Broadcast media" },
    ],
    allowOther: true,
    showIf: notWeekly,
  },

  // ── TEAM GAPS ──
  {
    id: "team_roles",
    question: "Who else is working on this?",
    header: "Extended team",
    multiSelect: true,
    options: [
      { label: "Photographer", description: "Shoot coverage & press photos" },
      { label: "Videographer", description: "Video production" },
      { label: "Stylist", description: "Wardrobe & image direction" },
      { label: "Designer", description: "Graphics, merch design, branding" },
    ],
    allowOther: true,
    showIf: notWeekly,
  },
  {
    id: "team_invited",
    question: "Have these team members been invited to Rollout?",
    header: "Team access",
    options: [
      { label: "Yes", description: "All onboarded" },
      { label: "Not yet", description: "We'll create tasks to invite them" },
    ],
    showIf: (a) => {
      const roles = a.team_roles;
      return notWeekly(a) && Array.isArray(roles) && roles.length > 0;
    },
  },

  // ── SEEDING STRATEGY ──
  {
    id: "seeding_strategy",
    question: "How do you want to build anticipation?",
    header: "Seeding",
    multiSelect: true,
    options: [
      { label: "Cryptic teasers", description: "Mystery posts, coded imagery" },
      { label: "Studio snippets", description: "IG Live, TikTok previews" },
      { label: "Influencer seeding", description: "Get tastemakers buzzing early" },
      { label: "Lore drops", description: "World-building, narrative ARG" },
    ],
    allowOther: true,
    showIf: notWeekly,
  },

  // ── WRAP-UP ──
  {
    id: "additional_context",
    question: "Anything else ROLLY should know?",
    header: "Final notes",
    options: [],
  },
];

const TEXT_ONLY_STEPS = new Set(["project_name", "era_theme", "merch_link", "additional_context"]);

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

  const isTextOnly = step ? TEXT_ONLY_STEPS.has(step.id) : false;

  const currentAnswer = step ? answers[step.id] : undefined;
  const isMulti = step?.multiSelect;
  const selectedValues: string[] = isMulti
    ? (Array.isArray(currentAnswer) ? currentAnswer : [])
    : [];
  const selectedValue: string = !isMulti && typeof currentAnswer === "string" ? currentAnswer : "";

  const isOtherSelected = isMulti
    ? selectedValues.some((v) => !stepOptions.some((o) => o.label === v))
    : !!selectedValue && !stepOptions.some((o) => o.label === selectedValue);

  const canProceed = isTextOnly
    ? step?.id === "additional_context" || !!otherText.trim() // additional_context is optional
    : isMulti
    ? selectedValues.length > 0
    : !!selectedValue;

  const isLastStep = currentStep === visibleSteps.length - 1;

  const stepId = step?.id ?? "";

  const textPlaceholders: Record<string, string> = {
    project_name: "Enter project name...",
    era_theme: "Describe the story, mood, or concept behind this era...",
    merch_link: "Paste a URL to designs, lookbook, or store...",
    additional_context: "Any extra details, constraints, or ideas... (optional)",
  };

  const handleSingleSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [stepId]: value }));
    setOtherText("");
  };

  const handleMultiToggle = (label: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[stepId]) ? [...(prev[stepId] as string[])] : [];
      const idx = current.indexOf(label);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(label);
      return { ...prev, [stepId]: current };
    });
  };

  const handleOtherToggle = () => {
    if (isMulti) {
      const cleaned = selectedValues.filter((v) => stepOptions.some((o) => o.label === v));
      if (isOtherSelected) {
        setAnswers((prev) => ({ ...prev, [stepId]: cleaned }));
        setOtherText("");
      } else {
        setOtherText("");
      }
    } else {
      setAnswers((prev) => ({ ...prev, [stepId]: "" }));
      setOtherText("");
    }
  };

  const handleOtherTextChange = (value: string) => {
    setOtherText(value);
    if (isMulti) {
      const optionValues = selectedValues.filter((v) => stepOptions.some((o) => o.label === v));
      if (value.trim()) {
        setAnswers((prev) => ({ ...prev, [stepId]: [...optionValues, value.trim()] }));
      } else {
        setAnswers((prev) => ({ ...prev, [stepId]: optionValues }));
      }
    } else {
      setAnswers((prev) => ({ ...prev, [stepId]: value.trim() }));
    }
  };

  const handleNext = () => {
    if (isTextOnly && otherText.trim()) {
      setAnswers((prev) => ({ ...prev, [stepId]: otherText.trim() }));
    }
    if (isLastStep) {
      const finalAnswers = { ...answers };
      if (isTextOnly) finalAnswers[stepId] = otherText.trim();
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
    if (!step) return;
    if (isTextOnly) {
      setOtherText(typeof answers[stepId] === "string" ? (answers[stepId] as string) : "");
    } else if (isOtherSelected && !isMulti) {
      setOtherText(selectedValue);
    } else if (isOtherSelected && isMulti) {
      const otherVal = selectedValues.find((v) => !stepOptions.some((o) => o.label === v));
      setOtherText(otherVal || "");
    } else {
      setOtherText("");
    }
  }, [currentStep]);

  if (!step) return null;

  const progress = ((currentStep + 1) / visibleSteps.length) * 100;
  const useTextarea = stepId === "era_theme" || stepId === "additional_context";

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
            {useTextarea ? (
              <Textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder={textPlaceholders[stepId] || "Type your answer..."}
                className="text-base min-h-[120px]"
                autoFocus
              />
            ) : (
              <Input
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder={textPlaceholders[stepId] || "Type your answer..."}
                className="text-base"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canProceed) handleNext();
                }}
              />
            )}
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
