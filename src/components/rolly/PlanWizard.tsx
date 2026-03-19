import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChevronLeft, Sparkles, Send, CheckCircle2, Pencil, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { PlanDraft, DraftItem } from "./PlanDraft";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ThinkingAnimation } from "./ThinkingAnimation";

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
  onPreviewPlan?: (items: DraftItem[]) => void;
}

const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rolly-plan-question`;
const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rolly-generate-plan`;
const EXECUTE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rolly-execute-plan`;

export function PlanWizard({ onComplete, onCancel, initialContext, onExecutionStart, onPreviewPlan }: PlanWizardProps) {
  const { selectedTeamId } = useSelectedTeam();
  const queryClient = useQueryClient();
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<AIQuestion | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [selectedValue, setSelectedValue] = useState("");
  const [customText, setCustomText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [depth, setDepth] = useState<string | null>(null);
  const [acknowledgment, setAcknowledgment] = useState<string | null>(null);

  // Plan generation states
  const [phase, setPhase] = useState<"questions" | "generating" | "review" | "executing" | "checkpoint">("questions");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [primaryArtist, setPrimaryArtist] = useState("");
  const [summaryPrompt, setSummaryPrompt] = useState("");

  // Checkpoint / refinement states
  const [previewItems, setPreviewItems] = useState<DraftItem[]>([]);
  const [checkpointFeedback, setCheckpointFeedback] = useState("");
  const [refinementRound, setRefinementRound] = useState(0);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const isDeepMode = depth === "deep" || depth === "detailed";
  const questionCap = isDeepMode ? 22 : 10;

  const fetchNextQuestion = useCallback(async (history: QAEntry[], postPreviewContext?: { feedback: string; plan: DraftItem[] }) => {
    if (!postPreviewContext && history.length >= questionCap) {
      await generatePlan(history, "Generate a plan based on the answers provided so far. Fill in any gaps with reasonable defaults based on your music industry knowledge.");
      return;
    }

    setIsLoadingQuestion(true);
    setError(null);
    setSelectedValues([]);
    setSelectedValue("");
    setCustomText("");
    setAcknowledgment(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Please log in to use Plan Mode.");
        setIsLoadingQuestion(false);
        return;
      }

      const body: any = {
        brief: initialContext || "",
        previous_qa: history,
        team_id: selectedTeamId,
        depth,
        question_number: history.length + 1,
      };

      // Add refinement context if post-preview
      if (postPreviewContext) {
        body.is_post_preview = true;
        body.preview_plan = postPreviewContext.plan;
        body.refinement_feedback = postPreviewContext.feedback;
      }

      const resp = await fetch(PLAN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
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
        await generatePlan(history, data.summary_prompt, data.preview);
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
        if (data.acknowledgment) {
          setAcknowledgment(data.acknowledgment);
        }
        setQuestionNumber((n) => n + 1);
      }
    } catch (e) {
      console.error("Plan question error:", e);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoadingQuestion(false);
    }
  }, [initialContext, selectedTeamId, depth, questionCap]);

  const generatePlan = async (history: QAEntry[], summary: string, isPreview?: boolean) => {
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
          assign_to_role: t.assign_to_role,
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

      // If preview mode (deep), show checkpoint instead of direct review
      if (isPreview && refinementRound < 2) {
        setPreviewItems(items);
        onPreviewPlan?.(items);
        setPhase("checkpoint");
      } else {
        setPhase("review");
      }
    } catch (e) {
      console.error("Generate plan error:", e);
      setError("Failed to generate plan. Please try again.");
      setPhase("questions");
    }
  };

  const handleCheckpointConfirm = () => {
    // User is happy with the preview — move to full review
    setDraftItems(previewItems);
    setPhase("review");
  };

  const handleCheckpointRefine = () => {
    if (!checkpointFeedback.trim()) {
      toast.error("Tell Rolly what to change.");
      return;
    }
    // Go back to questions with refinement context
    setRefinementRound((r) => r + 1);
    setPhase("questions");
    setCurrentQuestion(null);
    fetchNextQuestion(qaHistory, { feedback: checkpointFeedback.trim(), plan: previewItems });
    setCheckpointFeedback("");
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
  useEffect(() => {
    fetchNextQuestion([]);
  }, []);

  const handleSubmitAnswer = () => {
    if (!currentQuestion) return;

    let answer: string;
    if (customText.trim()) {
      answer = customText.trim();
    } else if (currentQuestion.multi_select) {
      if (selectedValues.length === 0) return;
      answer = selectedValues.join(", ");
    } else {
      if (!selectedValue) return;
      answer = selectedValue;
    }

    // Auto-detect depth from answer
    const lowerAnswer = answer.toLowerCase();
    if (/\b(quick|fast|basics)\b/.test(lowerAnswer)) {
      setDepth("quick");
    } else if (/\b(detailed|deeper|deep|think it through|chat|take our time)\b/.test(lowerAnswer)) {
      setDepth("deep");
    }

    const newEntry: QAEntry = { question: currentQuestion.question, answer };
    const newHistory = [...qaHistory, newEntry];
    setQaHistory(newHistory);
    setCurrentQuestion(null);
    setAcknowledgment(null);
    fetchNextQuestion(newHistory);
  };

  const handleBack = () => {
    if (phase === "checkpoint") {
      setPhase("review");
      setDraftItems(previewItems);
      return;
    }
    if (phase === "review") {
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

  const canSubmit = customText.trim()
    ? true
    : currentQuestion?.multi_select
    ? selectedValues.length > 0
    : !!selectedValue;

  // Plan generation loading
  if (phase === "generating") {
    return (
      <div className="flex flex-col h-full bg-[hsl(0,0%,5%)] text-white items-center justify-center">
        <ThinkingAnimation variant="generating" />
      </div>
    );
  }

  // Checkpoint phase — preview plan with refine option
  if (phase === "checkpoint") {
    return (
      <div className="flex flex-col h-full bg-[hsl(0,0%,5%)] text-white">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2 shrink-0">
          <button onClick={handleBack} className="text-white/40 hover:text-white/70 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="font-black text-sm uppercase tracking-wide">Plan Preview</span>
          </div>
          {refinementRound > 0 && (
            <span className="text-xs text-white/40 font-mono">Round {refinementRound + 1}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-1">
            <p className="text-sm italic text-white/50">Here's what I've drafted for {primaryArtist}.</p>
            <p className="text-xs text-white/40">
              {previewItems.filter(i => i.type === "campaign").length} campaigns · {previewItems.filter(i => i.type === "task").length} tasks · {previewItems.filter(i => i.type === "milestone").length} milestones · {previewItems.filter(i => i.type === "budget").length} budgets
            </p>
          </div>

          {/* Compact preview list */}
          <div className="space-y-1.5">
            {previewItems.slice(0, 15).map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className="text-[10px] uppercase tracking-wider font-bold text-white/30 w-16 shrink-0">
                  {item.type}
                </span>
                <span className="text-white/70 truncate">{item.title}</span>
                {item.amount != null && (
                  <span className="text-white/40 text-xs ml-auto shrink-0">${item.amount.toLocaleString()}</span>
                )}
              </div>
            ))}
            {previewItems.length > 15 && (
              <p className="text-xs text-white/30">+{previewItems.length - 15} more items</p>
            )}
          </div>

          {/* Feedback input */}
          {refinementRound < 2 && (
            <div className="space-y-2">
              <p className="text-xs text-white/50">Want to change anything?</p>
              <Textarea
                value={checkpointFeedback}
                onChange={(e) => setCheckpointFeedback(e.target.value)}
                placeholder="E.g. 'Add more social media tasks' or 'Push release date to next month'..."
                className="bg-white/10 border-white/15 text-white placeholder:text-white/30 text-sm resize-none rounded-xl"
                rows={3}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 shrink-0">
          {refinementRound < 2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCheckpointRefine}
              disabled={!checkpointFeedback.trim()}
              className="text-white/50 hover:text-white hover:bg-white/10 gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refine
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleCheckpointConfirm}
            className="flex-1 bg-white text-black hover:bg-white/90 font-bold rounded-xl gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Looks good — review & build
          </Button>
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
          <ThinkingAnimation variant="question" />
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
            {/* Acknowledgment */}
            {acknowledgment && (
              <p className="text-sm italic text-white/50 animate-fade-in">{acknowledgment}</p>
            )}

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
                          setSelectedValue(opt.label);
                          setCustomText("");
                        }}
                        className={cn(
                          "w-full text-left flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all",
                          selectedValue === opt.label
                            ? "border-white bg-white/10"
                            : "border-white/15 hover:border-white/40 hover:bg-white/5"
                        )}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded-full border mt-0.5 shrink-0 transition-all",
                          selectedValue === opt.label
                            ? "border-white bg-white"
                            : "border-white/30"
                        )} />
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

            {/* Always-visible custom text input */}
            <Input
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedValue("");
                  setSelectedValues([]);
                }
              }}
              placeholder={currentQuestion.options.length > 0 ? "Or type your own answer…" : "Type your answer..."}
              className="rounded-xl bg-white/10 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-white/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) handleSubmitAnswer();
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom action bar — always visible when question is shown */}
      {currentQuestion && !isLoadingQuestion && (
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
