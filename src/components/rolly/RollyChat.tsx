import { useState, useRef, useEffect } from "react";
import { Send, Square, Trash2, Sparkles, CheckCircle2, AlertCircle, ClipboardList, Camera } from "lucide-react";
import { PlanWizard } from "@/components/rolly/PlanWizard";
import { PlanModeHero } from "@/components/rolly/PlanModeHero";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RollyMessage } from "./RollyMessage";
import { useRollyChat, RollyToolAction } from "@/hooks/useRollyChat";
import { cn } from "@/lib/utils";
import { ReceiptScanner } from "@/components/finance/ReceiptScanner";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";

const QUICK_ACTIONS = [
  { label: "Plan a release", prompt: "Let's plan a release together. Walk me through it step by step — ask me about the artist, timeline, budget, marketing, and anything else you need to build a full plan with tasks, milestones, and budgets." },
  { label: "Build a campaign", prompt: "I want to build a campaign for one of my artists. Guide me through it — ask me what kind of campaign, which artist, goals, budget, and timeline. Then set everything up." },
  { label: "Set up budgets", prompt: "Help me set up budgets for an artist. Ask me which artist, what categories I need, and the amounts. Then create them." },
  { label: "Weekly planning", prompt: "Let's do a weekly planning session. Ask me about each artist on my roster — what's coming up, what needs to get done, and help me create tasks and milestones for the week." },
];

interface RollyChatProps {
  prefillPrompt?: string | null;
  onPrefillConsumed?: () => void;
  planMode?: boolean;
  onPlanModeChange?: (active: boolean) => void;
  onSendReady?: (sendFn: (msg: string) => void) => void;
  onPlanMessage?: (msg: string) => void;
  wizardActive?: boolean;
  wizardContext?: string | null;
  onWizardComplete?: () => void;
  onWizardCancel?: () => void;
  onExecutionStart?: (items: import("./PlanDraft").DraftItem[]) => void;
}

export function RollyChat({ prefillPrompt, onPrefillConsumed, planMode: externalPlanMode, onPlanModeChange, onSendReady, onPlanMessage, wizardActive, wizardContext, onWizardComplete, onWizardCancel, onExecutionStart }: RollyChatProps = {}) {
  const planMode = externalPlanMode ?? false;
  const setPlanMode = (val: boolean) => onPlanModeChange?.(val);
  const { messages, isLoading, send, stop, clear, lastActions } = useRollyChat(planMode);
  const [input, setInput] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const voice = useVoiceInput({
    onResult: (text) => {
      setInput((prev) => (prev ? prev + " " + text : text));
    },
  });
  const { selectedTeamId } = useSelectedTeam();

  // Fetch artists for receipt → expense linking
  const { data: artists = [] } = useQuery({
    queryKey: ["rolly-receipt-artists", selectedTeamId],
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

  // Expose send function to parent
  useEffect(() => {
    onSendReady?.((msg: string) => {
      send(msg);
    });
  }, [send, onSendReady]);

  // Handle prefill from nudge
  useEffect(() => {
    if (prefillPrompt && !isLoading) {
      setInput(prefillPrompt);
      onPrefillConsumed?.();
    }
  }, [prefillPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    // In plan mode, route the first message to the wizard instead of chat
    if (planMode && onPlanMessage) {
      onPlanMessage(text);
      return;
    }
    send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className={cn("flex flex-col h-full", planMode && "bg-[hsl(0,0%,5%)]")}>
      {/* Messages area or Wizard */}
      {wizardActive && onWizardComplete && onWizardCancel ? (
        <div className="flex-1 min-h-0">
          <PlanWizard
            onComplete={onWizardComplete}
            onCancel={onWizardCancel}
            initialContext={wizardContext}
            onExecutionStart={onExecutionStart}
          />
        </div>
      ) : (
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {isEmpty && planMode ? (
          <PlanModeHero />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Hey, I'm ROLLY</h2>
              <p className="text-muted-foreground mt-1 max-w-md">
                Your music business advisor. Ask me about deals, splits, royalties, release strategy, or anything industry-related.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => send(action.prompt)}
                  className="text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm opacity-70"
                >
                  <span className="font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <RollyMessage
              key={i}
              message={msg}
              isStreaming={isLoading && msg.role === "assistant" && i === messages.length - 1}
            />
          ))
        )}
        {/* Tool actions notification */}
        {lastActions.length > 0 && (
          <div className="flex gap-3 animate-fade-in">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
              R
            </div>
            <div className="space-y-1.5">
              {lastActions.map((action, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                    action.success
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {action.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {action.message}
                </div>
              ))}
            </div>
          </div>
        )}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 animate-fade-in">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
              R
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-xs text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Input area — hidden during wizard */}
      {!wizardActive && <div className={cn(
        "border-t px-4 py-3",
        planMode ? "border-white/10 bg-[hsl(0,0%,5%)]" : "border-border bg-background"
      )}>
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 shrink-0", planMode ? "text-white/40 hover:text-white/70" : "text-muted-foreground")} onClick={clear} title="Clear chat">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
            <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder={planMode ? "Describe your project..." : "Ask ROLLY anything..."}
            className={cn(
              "min-h-[48px] max-h-[160px] resize-none rounded-xl py-3 px-4 flex-1 min-w-0 text-sm",
              planMode && "bg-white/10 border-white/15 text-white placeholder:text-white/40 focus-visible:ring-white/30"
            )}
            rows={1}
          />
          <VoiceInputButton
            isListening={voice.isListening}
            isSupported={voice.isSupported}
            onClick={voice.toggleListening}
          />
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-9 w-9 shrink-0", planMode ? "text-white/40 hover:text-white/70" : "text-muted-foreground")}
            onClick={() => setShowScanner(true)}
            title="Scan receipt"
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={planMode ? "default" : "ghost"}
            className={cn("h-9 w-9 shrink-0", planMode ? "bg-white text-black hover:bg-white/90" : "text-muted-foreground")}
            onClick={() => setPlanMode(!planMode)}
            title={planMode ? "Exit Plan Mode" : "Enter Plan Mode"}
          >
            <ClipboardList className="h-4 w-4" />
          </Button>
          {isLoading ? (
            <Button size="icon" variant="outline" className={cn("h-9 w-9 shrink-0", planMode && "border-white/20 text-white hover:bg-white/10")} onClick={stop}>
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" className={cn("h-9 w-9 shrink-0", planMode && "bg-white text-black hover:bg-white/90")} onClick={handleSend} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>}

      <ReceiptScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onConfirm={async (data) => {
          // If there's only one artist, auto-assign; otherwise tell user
          if (artists.length === 0) {
            toast.error("Add an artist first to log expenses");
            return;
          }
          const artistId = artists.length === 1 ? artists[0].id : artists[0].id;
          const insert: any = {
            artist_id: artistId,
            description: data.description,
            amount: -Math.abs(data.amount),
            transaction_date: data.date,
            type: "expense",
          };
          const { error } = await supabase.from("transactions").insert(insert);
          if (error) {
            toast.error(error.message);
          } else {
            toast.success(`Expense added: $${data.amount.toFixed(2)} — ${data.description}`);
            send(`I just logged a $${data.amount.toFixed(2)} expense for "${data.description}" from a receipt scan. Any thoughts on categorization or budgeting?`);
          }
        }}
      />
    </div>
  );
}
