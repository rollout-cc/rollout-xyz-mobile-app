import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronLeft, Sparkles, Loader2, Send, CheckCircle2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { PlanDraft, DraftItem } from "./PlanDraft";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
  onComplete: () => void;
  onCancel: () => void;
  initialContext?: string | null;
  onExecutionStart?: (items: DraftItem[]) => void;
}

const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rolly-plan-question`;
const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rolly-generate-plan`;
const EXECUTE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rolly-execute-plan`;

export function PlanWizard({ onComplete, onCancel, initialContext, onExecutionStart }: PlanWizardProps) {
  const { selectedTeamId } = useSelectedTeam();
  const queryClient = useQueryClient();
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<AIQuestion | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [selectedValue, setSelectedValue] = useState("");
  const [customText, setCustomText] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  // Plan generation states
  const [phase, setPhase] = useState<"questions" | "generating" | "review" | "executing">("questions");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [primaryArtist, setPrimaryArtist] = useState("");
  const [summaryPrompt, setSummaryPrompt] = useState("");

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchNextQuestion = useCallback(async (history: QAEntry[]) => {
    setIsLoadingQuestion(true);
    setError(null);
    setSelectedValues([]);
    setSelectedValue("");
    setCustomText("");
    setIsCustomMode(false);

    try {
      const token = await getToken();
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
        // Instead of showing a review of answers, generate the structured plan
        setSummaryPrompt(data.summary_prompt);
        await generatePlan(history, data.summary_prompt);
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

  const generatePlan = async (history: QAEntry[], summary: string) => {
    setPhase("generating");
    setIsLoadingQuestion(false);

    try {
      const token = await getToken();
      if (!token) {
        setError("Please log in.");
        setPhase("questions");
        return;
      }

      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          brief: initialContext || "",
          qa_history: history,
          summary_prompt: summary,
          team_id: selectedTeamId,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        setError(errData.error || "Failed to generate plan");
        setPhase("questions");
        return;
      }

      const plan = await resp.json();

      // Convert to DraftItem format
      let counter = 0;
      const items: DraftItem[] = [];
      let detectedArtist = "";

      for (const c of (plan.campaigns || [])) {
        if (!detectedArtist && c.artist_name) detectedArtist = c.artist_name;
        items.push({
          id: `draft-${counter++}`,
          type: "campaign",
          title: c.name,
          description: c.description,
          date: c.start_date,
          end_date: c.end_date,
          artist_name: c.artist_name,
        });
      }

      for (const t of (plan.tasks || [])) {
        if (!detectedArtist && t.artist_name) detectedArtist = t.artist_name;
        items.push({
          id: `draft-${counter++}`,
          type: "task",
          title: t.title,
          description: t.description,
          date: t.due_date,
          artist_name: t.artist_name,
          campaign_name: t.campaign_name,
        });
      }

      for (const m of (plan.milestones || [])) {
        if (!detectedArtist && m.artist_name) detectedArtist = m.artist_name;
        items.push({
          id: `draft-${counter++}`,
          type: "milestone",
          title: m.title,
          date: m.date,
          description: m.description,
          artist_name: m.artist_name,
        });
      }

      for (const b of (plan.budgets || [])) {
        if (!detectedArtist && b.artist_name) detectedArtist = b.artist_name;
        items.push({
          id: `draft-${counter++}`,
          type: "budget",
          title: b.label,
          amount: b.amount,
          artist_name: b.artist_name,
        });
      }

      setPrimaryArtist(detectedArtist || "your artist");
      setDraftItems(items);
      setPhase("review");
    } catch (e) {
      console.error("Generate plan error:", e);
      setError("Failed to generate plan. Please try again.");
      setPhase("questions");
    }
  };

  const executePlan = async (items: DraftItem[]) => {
    setPhase("executing");
    onExecutionStart?.(items);
    try {
      const token = await getToken();
      if (!token) {
        setError("Please log in.");
        setPhase("review");
        return;
      }

      const resp = await fetch(EXECUTE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
          team_id: selectedTeamId,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        setError(errData.error || "Failed to execute plan");
        setPhase("review");
        return;
      }

      const result = await resp.json();
      
      if (result.failed > 0) {
        console.warn("Plan execution failures:", result.results?.filter((r: any) => !r.success));
      }

      // Invalidate workspace queries
      queryClient.invalidateQueries({ queryKey: ["rolly-workspace-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["rolly-workspace-artists"] });
      queryClient.invalidateQueries({ queryKey: ["rolly-workspace-budgets"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["artists"] });

      if (result.failed > 0) {
        const failedItems = result.results?.filter((r: any) => !r.success) || [];
        const firstError = failedItems[0]?.error || "Unknown error";
        toast.warning(`Plan built with ${result.created} items. ${result.failed} failed: ${firstError}`);
      } else {
        toast.success(`Plan built! Created ${result.created} items.`);
      }
      onComplete();
    } catch (e) {
      console.error("Execute plan error:", e);
      setError("Failed to build plan. Please try again.");
      setPhase("review");
    }
  };

  // Fetch first question on mount
  useState(() => {
    fetchNextQuestion([]);
  });

  const handleSubmitAnswer = () => {
    if (!currentQuestion) return;

    let answer: string;
    if ((isCustomMode || currentQuestion.options.length === 0) && customText.trim()) {
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
    if (phase === "review") {
      // Go back to questions — re-ask from the last Q&A state
      setPhase("questions");
      setDraftItems([]);
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

  const canSubmit = (isCustomMode || currentQuestion?.options.length === 0)
    ? !!customText.trim()
    : currentQuestion?.multi_select
    ? selectedValues.length > 0
    : !!selectedValue;

  // Plan generation loading
  if (phase === "generating") {
    return (
      <div className="flex flex-col h-full bg-[hsl(0,0%,5%)] text-white items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          <Sparkles className="h-4 w-4 text-white absolute -top-1 -right-1" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">Building your plan…</p>
          <p className="text-xs text-white/40 mt-1">Rolly is creating tasks, milestones & budgets</p>
        </div>
      </div>
    );
  }

  // Plan draft review
  if (phase === "review" || phase === "executing") {
    return (
      <PlanDraft
        items={draftItems}
        artistName={primaryArtist}
        onConfirm={executePlan}
        onCancel={() => {
          setPhase("questions");
          setDraftItems([]);
        }}
        isExecuting={phase === "executing"}
      />
    );
  }

  // Question phase
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

      {/* Single question view */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col justify-start pt-6">
        {isLoadingQuestion && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
            <span className="text-sm text-white/50">
              {qaHistory.length === 0 ? "Analyzing your brief…" : "Next question…"}
            </span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={() => fetchNextQuestion(qaHistory)}>
              Retry
            </Button>
          </div>
        )}

        {currentQuestion && !isLoadingQuestion && (
          <div className="space-y-5 animate-fade-in py-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/50">
                {currentQuestion.header}
              </span>
              <h3 className="text-base font-semibold mt-1.5 text-white leading-snug">{currentQuestion.question}</h3>
            </div>

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
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          const newEntry: QAEntry = { question: currentQuestion.question, answer: opt.label };
                          const newHistory = [...qaHistory, newEntry];
                          setQaHistory(newHistory);
                          setCurrentQuestion(null);
                          fetchNextQuestion(newHistory);
                        }}
                        className={cn(
                          "w-full text-left flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all",
                          "border-white/15 hover:border-white/40 hover:bg-white/5"
                        )}
                      >
                        <div className="h-4 w-4 rounded-full border border-white/30 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-white">{opt.label}</span>
                          {opt.description && (
                            <p className="text-xs text-white/40 mt-0.5">{opt.description}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

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

      {/* Bottom action bar */}
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
