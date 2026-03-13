import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronLeft, Sparkles, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";

export type PlanAnswers = Record<string, string | string[]>;

type QAEntry = { question: string; answer: string };

type AIQuestion = {
  question: string;
  header: string;
  options: { label: string; description?: string }[];
  multi_select: boolean;
  allow_custom: boolean;
};

interface PlanWizardProps {
  onComplete: (summaryPrompt: string) => void;
  onCancel: () => void;
  initialContext?: string | null;
}

const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rolly-plan-question`;

export function PlanWizard({ onComplete, onCancel, initialContext }: PlanWizardProps) {
  const { selectedTeamId } = useSelectedTeam();
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<AIQuestion | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [selectedValue, setSelectedValue] = useState("");
  const [customText, setCustomText] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);

  const fetchNextQuestion = useCallback(async (history: QAEntry[]) => {
    setIsLoadingQuestion(true);
    setError(null);
    setSelectedValues([]);
    setSelectedValue("");
    setCustomText("");
    setIsCustomMode(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Please log in to use Plan Mode.");
        setIsLoadingQuestion(false);
        return;
      }

      const resp = await fetch(PLAN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          brief: initialContext || "",
          previous_qa: history,
          team_id: selectedTeamId,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        setError(errData.error || `Error ${resp.status}`);
        setIsLoadingQuestion(false);
        return;
      }

      const data = await resp.json();

      if (data.type === "complete") {
        onComplete(data.summary_prompt);
        return;
      }

      if (data.type === "question") {
        setCurrentQuestion({
          question: data.question,
          header: data.header,
          options: data.options || [],
          multi_select: data.multi_select || false,
          allow_custom: data.allow_custom !== false,
        });
        setQuestionNumber((n) => n + 1);
      }
    } catch (e) {
      console.error("Plan question error:", e);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoadingQuestion(false);
    }
  }, [initialContext, selectedTeamId, onComplete]);

  // Fetch first question on mount
  useState(() => {
    fetchNextQuestion([]);
  });

  const handleSubmitAnswer = () => {
    if (!currentQuestion) return;

    let answer: string;
    if (isCustomMode && customText.trim()) {
      answer = customText.trim();
    } else if (currentQuestion.multi_select) {
      if (selectedValues.length === 0) return;
      answer = selectedValues.join(", ");
    } else {
      if (!selectedValue) return;
      answer = selectedValue;
    }

    const newEntry: QAEntry = { question: currentQuestion.question, answer };
    const newHistory = [...qaHistory, newEntry];
    setQaHistory(newHistory);
    setCurrentQuestion(null);
    fetchNextQuestion(newHistory);
  };

  const handleBack = () => {
    if (qaHistory.length === 0) {
      onCancel();
      return;
    }
    // Go back one question
    const newHistory = qaHistory.slice(0, -1);
    setQaHistory(newHistory);
    setQuestionNumber((n) => Math.max(1, n - 1));
    setCurrentQuestion(null);
    fetchNextQuestion(newHistory);
  };

  const handleMultiToggle = (label: string) => {
    setSelectedValues((prev) =>
      prev.includes(label) ? prev.filter((v) => v !== label) : [...prev, label]
    );
    setIsCustomMode(false);
  };

  const handleSingleSelect = (value: string) => {
    setSelectedValue(value);
    setIsCustomMode(false);
  };

  const canSubmit = isCustomMode
    ? !!customText.trim()
    : currentQuestion?.multi_select
    ? selectedValues.length > 0
    : !!selectedValue;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Inline header — no border/chrome, just back + counter */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 shrink-0">
        <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Plan Mode</span>
        </div>
        {questionNumber > 0 && (
          <span className="text-xs text-muted-foreground">Q{questionNumber}</span>
        )}
      </div>

      {/* Brief banner */}
      {initialContext && (
        <div className="px-4 pt-3">
          <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Your brief:</span>{" "}
            {initialContext.length > 120
              ? initialContext.slice(0, 120) + "…"
              : initialContext}
          </div>
        </div>
      )}

      {/* Previous Q&A scroll area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {qaHistory.map((qa, i) => (
          <div key={i} className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{qa.question}</p>
            <p className="text-sm font-medium text-foreground bg-muted/30 rounded-lg px-3 py-2">
              {qa.answer}
            </p>
          </div>
        ))}

        {/* Loading state */}
        {isLoadingQuestion && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {qaHistory.length === 0 ? "Analyzing your brief…" : "Thinking of the next question…"}
            </span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchNextQuestion(qaHistory)}>
              Retry
            </Button>
          </div>
        )}

        {/* Current question */}
        {currentQuestion && !isLoadingQuestion && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                {currentQuestion.header}
              </span>
              <h3 className="text-base font-semibold mt-1">{currentQuestion.question}</h3>
            </div>

            {/* Options */}
            {currentQuestion.options.length > 0 && (
              <div className="space-y-2">
                {currentQuestion.multi_select ? (
                  currentQuestion.options.map((opt) => (
                    <label
                      key={opt.label}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all",
                        selectedValues.includes(opt.label)
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <Checkbox
                        checked={selectedValues.includes(opt.label)}
                        onCheckedChange={() => handleMultiToggle(opt.label)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">{opt.label}</span>
                        {opt.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))
                ) : (
                  <RadioGroup
                    value={isCustomMode ? "" : selectedValue}
                    onValueChange={handleSingleSelect}
                    className="space-y-2"
                  >
                    {currentQuestion.options.map((opt) => (
                      <label
                        key={opt.label}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all",
                          selectedValue === opt.label && !isCustomMode
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <RadioGroupItem value={opt.label} className="mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">{opt.label}</span>
                          {opt.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {opt.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                )}
              </div>
            )}

            {/* Custom input */}
            {currentQuestion.allow_custom && (
              <div className="space-y-2">
                {currentQuestion.options.length > 0 && (
                  <button
                    onClick={() => {
                      setIsCustomMode(!isCustomMode);
                      setSelectedValue("");
                      setSelectedValues([]);
                    }}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    {isCustomMode ? "← Pick from options" : "Or type your own answer"}
                  </button>
                )}
                {(isCustomMode || currentQuestion.options.length === 0) && (
                  <Input
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Type your answer..."
                    className="rounded-xl"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canSubmit) handleSubmitAnswer();
                    }}
                    autoFocus
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {currentQuestion && !isLoadingQuestion && (
        <div className="border-t border-border px-4 py-3 flex items-center gap-2 shrink-0">
          <Button
            onClick={handleSubmitAnswer}
            disabled={!canSubmit}
            className="flex-1 rounded-xl gap-2"
          >
            <Send className="h-4 w-4" />
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
