import { useState, useRef, useEffect } from "react";
import { Send, Square, Trash2, Sparkles, CheckCircle2, AlertCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RollyMessage } from "./RollyMessage";
import { useRollyChat, RollyToolAction } from "@/hooks/useRollyChat";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "Plan a release", prompt: "Let's plan a release together. Walk me through it step by step — ask me about the artist, timeline, budget, marketing, and anything else you need to build a full plan with tasks, milestones, and budgets." },
  { label: "Build a campaign", prompt: "I want to build a campaign for one of my artists. Guide me through it — ask me what kind of campaign, which artist, goals, budget, and timeline. Then set everything up." },
  { label: "Set up budgets", prompt: "Help me set up budgets for an artist. Ask me which artist, what categories I need, and the amounts. Then create them." },
  { label: "Weekly planning", prompt: "Let's do a weekly planning session. Ask me about each artist on my roster — what's coming up, what needs to get done, and help me create tasks and milestones for the week." },
];

export function RollyChat() {
  const [planMode, setPlanMode] = useState(false);
  const { messages, isLoading, send, stop, clear, lastActions } = useRollyChat(planMode);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    send(text);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {isEmpty ? (
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
                  className="text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
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

      {/* Input area */}
      <div className="border-t border-border px-4 py-3 bg-background">
        {/* Plan mode banner */}
        {planMode && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium max-w-3xl mx-auto">
            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
            Plan Mode — Rolly will guide you step by step
          </div>
        )}
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground" onClick={clear} title="Clear chat">
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
            placeholder={planMode ? "Describe what you want to plan..." : "Ask ROLLY anything about the music business..."}
            className="min-h-[40px] max-h-[160px] resize-none rounded-xl py-2.5"
            rows={1}
          />
          <Button
            size="icon"
            variant={planMode ? "default" : "ghost"}
            className={cn("h-9 w-9 shrink-0", !planMode && "text-muted-foreground")}
            onClick={() => setPlanMode(!planMode)}
            title={planMode ? "Exit Plan Mode" : "Enter Plan Mode"}
          >
            <ClipboardList className="h-4 w-4" />
          </Button>
          {isLoading ? (
            <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={stop}>
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
