import { useState, useRef, useEffect, useCallback, DragEvent } from "react";
import { Send, Square, Trash2, CheckCircle2, AlertCircle, ClipboardList, Camera, X } from "lucide-react";
import rollyIcon from "@/assets/rolly-icon.png";
import { PlanWizard } from "@/components/rolly/PlanWizard";
import { PlanModeHero } from "@/components/rolly/PlanModeHero";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RollyMessage } from "./RollyMessage";
import { useRollyChat, RollyToolAction } from "@/hooks/useRollyChat";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import { useIsMobile } from "@/hooks/use-mobile";

/** Upper bound (px) for composer height before inner scroll; viewport cap keeps long drafts from hiding the thread. */
const ROLLY_INPUT_MAX_HEIGHT = 360;

const ROLLY_PLAN_MOBILE_SYNC_GUTTERS =
  "pl-[calc(max(1rem,env(safe-area-inset-left,0px))+1rem-env(safe-area-inset-left,0px))] pr-[calc(max(1rem,env(safe-area-inset-right,0px))+1rem-env(safe-area-inset-right,0px))]";

const ROLLY_PLAN_DESKTOP_GUTTERS =
  "pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]";

function capRollyComposerHeightPx(scrollHeight: number): number {
  if (typeof window === "undefined") return Math.min(scrollHeight, ROLLY_INPUT_MAX_HEIGHT);
  const byViewport = Math.round(window.innerHeight * 0.45);
  return Math.min(scrollHeight, ROLLY_INPUT_MAX_HEIGHT, byViewport);
}

const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB

/** Compress / resize an image file to a max 1MB base64 data URI */
async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Scale down if needed
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);

        // Try quality levels until under 1MB
        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > MAX_IMAGE_SIZE * 1.37 && quality > 0.3) {
          quality -= 0.15;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  onPreviewPlan?: (items: import("./PlanDraft").DraftItem[]) => void;
}

export function RollyChat({ prefillPrompt, onPrefillConsumed, planMode: externalPlanMode, onPlanModeChange, onSendReady, onPlanMessage, wizardActive, wizardContext, onWizardComplete, onWizardCancel, onExecutionStart, onPreviewPlan }: RollyChatProps = {}) {
  const planMode = externalPlanMode ?? false;
  const isMobile = useIsMobile();
  const setPlanMode = (val: boolean) => onPlanModeChange?.(val);
  const { messages, isLoading, send, stop, clear, lastActions } = useRollyChat(planMode);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image attachment state
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    try {
      const compressed = await compressImage(file);
      setPendingImage({
        ...compressed,
        previewUrl: `data:${compressed.mimeType};base64,${compressed.base64}`,
      });
    } catch (err) {
      console.error("Image compression failed:", err);
    }
  }, []);

  const voice = useVoiceInput({
    onResult: (text) => {
      setInput((prev) => (prev ? prev + " " + text : text));
    },
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

  // Keep textarea height in sync when content changes (prefill, voice, etc.)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || wizardActive) return;
    requestAnimationFrame(() => {
      el.style.height = "auto";
      el.style.height = `${capRollyComposerHeightPx(el.scrollHeight)}px`;
    });
  }, [input, wizardActive]);

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so re-selecting same file works
    e.target.value = "";
    try {
      const compressed = await compressImage(file);
      setPendingImage({
        ...compressed,
        previewUrl: `data:${compressed.mimeType};base64,${compressed.base64}`,
      });
    } catch (err) {
      console.error("Image compression failed:", err);
    }
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text && !pendingImage) return;
    if (isLoading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // In plan mode, route the first message to the wizard instead of chat
    if (planMode && onPlanMessage && !pendingImage) {
      onPlanMessage(text);
      return;
    }

    const imageData = pendingImage ? { base64: pendingImage.base64, mimeType: pendingImage.mimeType } : undefined;
    setPendingImage(null);
    send(text, imageData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;
  const composerIdle = isEmpty && !input.trim() && !pendingImage;

  const toolIconBtn = planMode
    ? "h-9 w-9 shrink-0 rounded-lg text-white/60 hover:bg-white/12 hover:text-white focus-visible:ring-white/30 [&_svg]:stroke-[2]"
    : "h-9 w-9 shrink-0 rounded-lg text-foreground/55 hover:bg-muted hover:text-foreground focus-visible:ring-ring/40 [&_svg]:stroke-[2]";

  const composerShell = planMode
    ? "border border-white/18 bg-white/[0.07] shadow-[0_10px_36px_-14px_rgba(0,0,0,0.75)] backdrop-blur-md"
    : "border border-border/70 bg-card shadow-[0_2px_14px_-4px_rgba(0,0,0,0.14),0_1px_0_rgba(0,0,0,0.03)]";

  const horizontalContentInset = planMode
    ? isMobile
      ? ROLLY_PLAN_MOBILE_SYNC_GUTTERS
      : ROLLY_PLAN_DESKTOP_GUTTERS
    : "px-4";

  return (
    <div
      className={cn("flex flex-col h-full relative", planMode && "bg-[hsl(0,0%,5%)]")}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-primary/10 backdrop-blur-sm ring-2 ring-inset ring-primary/40 pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Camera className="h-8 w-8" />
            <span className="text-sm font-semibold">Drop image here</span>
          </div>
        </div>
      )}
      {/* Messages area or Wizard */}
      {wizardActive && onWizardComplete && onWizardCancel ? (
        <div className="flex-1 min-h-0">
          <PlanWizard
            onComplete={onWizardComplete}
            onCancel={onWizardCancel}
            initialContext={wizardContext}
            onExecutionStart={onExecutionStart}
            onPreviewPlan={onPreviewPlan}
          />
        </div>
      ) : (
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto space-y-4",
          horizontalContentInset,
          isEmpty ? "py-3 md:py-6" : "py-4 md:py-6",
        )}
      >
        {isEmpty && planMode ? (
          <PlanModeHero />
        ) : isEmpty ? (
          <div className="flex min-h-full w-full flex-col items-center justify-end pb-1 text-center md:min-h-0 md:justify-start md:pb-0">
            <div className="flex w-full max-w-md flex-col items-center gap-4 pt-1 md:gap-6 md:pt-3">
              <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.05] dark:bg-white dark:ring-black/10 sm:h-16 sm:w-16">
                <img src={rollyIcon} alt="" className="h-[2.85rem] w-[2.85rem] rounded-full object-cover sm:h-14 sm:w-14" />
              </div>
              <div className="space-y-2 sm:space-y-2.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Hey, I&apos;m Rolly
                </h2>
                <p className="mx-auto max-w-[22rem] text-pretty text-sm leading-relaxed text-muted-foreground sm:max-w-md">
                  Your music business advisor — deals, splits, royalties, releases, and anything industry-related.
                </p>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:max-w-lg">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => send(action.prompt)}
                    className="rounded-xl bg-muted/45 px-3.5 py-2.5 text-left text-sm font-medium leading-snug text-foreground/90 transition-[background-color,transform] hover:bg-muted/72 active:scale-[0.98]"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
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
                    "rolly-conversation-text flex items-center gap-2 rounded-lg px-3 py-2 font-normal",
                    action.success
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {action.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 opacity-90" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 opacity-90" />
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
            <div className="rolly-conversation-text bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-muted-foreground">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span>Thinking…</span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Hidden file input for image capture/upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* Input area — hidden during wizard */}
      {!wizardActive && (
        <div
          className={cn(
            "shrink-0 pb-2 pt-2 md:pb-2 md:pt-1.5",
            horizontalContentInset,
            planMode ? "bg-[hsl(0,0%,5%)]" : "bg-gradient-to-t from-muted/20 via-background to-background",
          )}
        >
          <div
            className={cn(
              "w-full overflow-hidden rounded-2xl transition-[box-shadow,ring] focus-within:shadow-lg",
              composerShell,
              planMode
                ? "focus-within:ring-2 focus-within:ring-white/25 focus-within:ring-offset-2 focus-within:ring-offset-[hsl(0,0%,5%)]"
                : "focus-within:ring-2 focus-within:ring-ring/35 focus-within:ring-offset-0"
            )}
          >
            <div className="flex min-w-0 flex-col gap-1 p-2 sm:p-2.5">
              {/* Image preview */}
              {pendingImage && (
                <div className="relative inline-block self-start ml-1">
                  <img
                    src={pendingImage.previewUrl}
                    alt="Attached"
                    className="h-20 w-auto rounded-lg object-cover ring-1 ring-border/40"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/80"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${capRollyComposerHeightPx(e.target.scrollHeight)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={pendingImage ? "Add a message about this image…" : planMode ? "Describe your project…" : "Ask Rolly anything…"}
                rows={1}
                aria-label={planMode ? "Plan description" : "Message to Rolly"}
                className={cn(
                  "rolly-conversation-text max-h-[min(22.5rem,45dvh)] min-w-0 w-full resize-none overflow-y-auto overflow-x-hidden border-0 bg-transparent pl-1 pr-1.5 py-[8px] shadow-none [scrollbar-gutter:stable] placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:pl-1.5 sm:pr-2",
                  composerIdle ? "min-h-[2.25rem] leading-snug" : "min-h-[2.75rem] leading-relaxed",
                  planMode
                    ? "text-white placeholder:text-white/40"
                    : "text-foreground"
                )}
              />
              <div
                className={cn(
                  "flex min-w-0 shrink-0 items-center justify-between gap-2 pt-1 pb-1",
                  planMode && "border-t border-white/10"
                )}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={cn(
                    toolIconBtn,
                    planMode && "text-white/75 hover:bg-white/12 hover:text-white"
                  )}
                  onClick={() => setPlanMode(!planMode)}
                  title={planMode ? "Exit Plan Mode" : "Enter Plan Mode"}
                  aria-label={planMode ? "Exit Plan Mode" : "Enter Plan Mode"}
                >
                  <ClipboardList className="h-[17px] w-[17px]" />
                </Button>
                <div className="flex min-w-0 shrink-0 items-center justify-end gap-0.5">
                  {messages.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={toolIconBtn}
                      onClick={clear}
                      title="Clear chat"
                      aria-label="Clear chat"
                    >
                      <Trash2 className="h-[17px] w-[17px]" />
                    </Button>
                  )}
                  <VoiceInputButton
                    isListening={voice.isListening}
                    isSupported={voice.isSupported}
                    onClick={voice.toggleListening}
                    className={toolIconBtn}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={toolIconBtn}
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach image"
                    aria-label="Attach image"
                  >
                    <Camera className="h-[17px] w-[17px]" />
                  </Button>
                  {isLoading ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className={cn(
                        "ml-0.5 h-10 w-10 shrink-0 rounded-full border-2 shadow-sm",
                        planMode
                          ? "border-white/35 bg-white/12 text-white hover:bg-white/18"
                          : "border-foreground/20 bg-background text-foreground hover:bg-muted"
                      )}
                      onClick={stop}
                      aria-label="Stop generating"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      className={cn(
                        "ml-0.5 h-10 w-10 shrink-0 rounded-full shadow-md transition-[transform,colors] duration-200 active:scale-[0.96] disabled:opacity-100",
                        planMode
                          ? "bg-white text-black hover:bg-white/90 disabled:border disabled:border-white/20 disabled:bg-white/15 disabled:text-white/40"
                          : "bg-primary text-primary-foreground hover:bg-primary/92 disabled:border disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
                      )}
                      onClick={handleSend}
                      disabled={!input.trim() && !pendingImage}
                      aria-label="Send message"
                    >
                      <Send className="h-[17px] w-[17px] stroke-[2.25]" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
