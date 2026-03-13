import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronLeft, Sparkles, Loader2, Send, CheckCircle2, Pencil } from "lucide-react";
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
  const [summaryPrompt, setSummaryPrompt] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

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
        setSummaryPrompt(data.summary_prompt);
        setIsLoadingQuestion(false);
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
  }, [initialContext, selectedTeamId]);

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
    if (summaryPrompt) {
      // Go back from review to re-fetch last question
      setSummaryPrompt(null);
      const newHistory = qaHistory.slice(0, -1);
      setQaHistory(newHistory);
      setQuestionNumber((n) => Math.max(1, n - 1));
      setCurrentQuestion(null);
      fetchNextQuestion(newHistory);
      return;
    }
    if (qaHistory.length === 0) {
      onCancel();
      return;
    }
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
    if (currentQuestion && !currentQuestion.multi_select) {
      const newEntry: QAEntry = { question: currentQuestion.question, answer: value };
      const newHistory = [...qaHistory, newEntry];
      setQaHistory(newHistory);
      setCurrentQuestion(null);
      fetchNextQuestion(newHistory);
    }
  };

  const handleEditAnswer = (index: number) => {
    setEditingIndex(index);
    setEditValue(qaHistory[index].answer);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const updated = [...qaHistory];
    updated[editingIndex] = { ...updated[editingIndex], answer: editValue.trim() || updated[editingIndex].answer };
    setQaHistory(updated);
    setEditingIndex(null);
    setEditValue("");
  };

  const canSubmit = isCustomMode
    ? !!customText.trim()
    : currentQuestion?.multi_select
    ? selectedValues.length > 0
    : !!selectedValue;

  // Review screen
  if (summaryPrompt) {
    return (
      <div className="flex flex-col h-full bg-[hsl(0,0%,5%)] text-white">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2 shrink-0">
          <button onClick={handleBack} className="text-white/40 hover:text-white/70 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="font-black text-sm uppercase tracking-wide">Review Plan</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <p className="text-xs text-white/50 mb-2">Review your answers, then submit to have Rolly build your plan.</p>
          {qaHistory.map((qa, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-1 group">
              <p className="text-[11px] text-white/40 font-medium uppercase tracking-wide">{qa.question}</p>
              {editingIndex === i ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 text-sm bg-white/10 border-white/15 text-white rounded-lg"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") setEditingIndex(null);
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white" onClick={handleSaveEdit}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{qa.answer}</p>
                  <button
                    onClick={() => handleEditAnswer(i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white/70 h-7 w-7 flex items-center justify-center"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 px-4 py-3 flex items-center gap-2 shrink-0">
          <Button
            onClick={() => onComplete(summaryPrompt)}
            className="flex-1 rounded-xl gap-2 bg-white text-black hover:bg-white/90 font-bold"
          >
            <CheckCircle2 className="h-4 w-4" />
            Build Plan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(0,0%,5%)] text-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 shrink-0">
        <button onClick={handleBack} className="text-white/40 hover:text-white/70 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Sparkles className="h-4 w-4 text-white" />
          <span className="font-black text-sm uppercase tracking-wide">Plan Mode</span>
        </div>
        {questionNumber > 0 && (
          <span className="text-xs text-white/40 font-mono">Q{questionNumber}</span>
        )}
      </div>

      {/* Single question view — only shows current question */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col justify-center">
        {/* Loading state */}
        {isLoadingQuestion && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
            <span className="text-sm text-white/50">
              {qaHistory.length === 0 ? "Analyzing your brief…" : "Next question…"}
            </span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={() => fetchNextQuestion(qaHistory)}>
              Retry
            </Button>
          </div>
        )}

        {/* Current question */}
        {currentQuestion && !isLoadingQuestion && (
          <div className="space-y-5 animate-fade-in py-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/50">
                {currentQuestion.header}
              </span>
              <h3 className="text-xl font-bold mt-1.5 text-white leading-snug">{currentQuestion.question}</h3>
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
                          ? "border-white bg-white/10"
                          : "border-white/15 hover:border-white/40"
                      )}
                    >
                      <Checkbox
                        checked={selectedValues.includes(opt.label)}
                        onCheckedChange={() => handleMultiToggle(opt.label)}
                        className="mt-0.5 border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                      />
                      <div>
                        <span className="text-sm font-medium text-white">{opt.label}</span>
                        {opt.description && (
                          <p className="text-xs text-white/40 mt-0.5">{opt.description}</p>
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
                            ? "border-white bg-white/10"
                            : "border-white/15 hover:border-white/40"
                        )}
                      >
                        <RadioGroupItem value={opt.label} className="mt-0.5 border-white/30 text-white" />
                        <div>
                          <span className="text-sm font-medium text-white">{opt.label}</span>
                          {opt.description && (
                            <p className="text-xs text-white/40 mt-0.5">{opt.description}</p>
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
                    className="text-xs text-white/60 font-medium hover:text-white/90 hover:underline"
                  >
                    {isCustomMode ? "← Pick from options" : "Or type your own answer"}
                  </button>
                )}
                {(isCustomMode || currentQuestion.options.length === 0) && (
                  <Input
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Type your answer..."
                    className="rounded-xl bg-white/10 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-white/30"
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

      {/* Bottom action bar — only for multi-select / custom input */}
      {currentQuestion && !isLoadingQuestion && (currentQuestion.multi_select || isCustomMode || currentQuestion.options.length === 0) && (
        <div className="border-t border-white/10 px-4 py-3 flex items-center gap-2 shrink-0">
          <Button
            onClick={handleSubmitAnswer}
            disabled={!canSubmit}
            className="flex-1 rounded-xl gap-2 bg-white text-black hover:bg-white/90 font-bold"
          >
            <Send className="h-4 w-4" />
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
