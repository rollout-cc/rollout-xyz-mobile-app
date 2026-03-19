import { AppLayout } from "@/components/AppLayout";
import { RollyChat } from "@/components/rolly/RollyChat";
import { RollyWorkspace } from "@/components/rolly/RollyWorkspace";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, LayoutGrid } from "lucide-react";
import { useLocation } from "react-router-dom";
import { DraftItem } from "@/components/rolly/PlanDraft";

export default function Rolly() {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"chat" | "workspace">("chat");
  const location = useLocation();
  const prefillPrompt = (location.state as any)?.prefillPrompt || null;
  const [prefill, setPrefill] = useState<string | null>(prefillPrompt);
  const [planMode, setPlanMode] = useState(false);
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardContext, setWizardContext] = useState<string | null>(null);
  const [sendFn, setSendFn] = useState<((msg: string) => void) | null>(null);

  // Execution feed state
  const [executingItems, setExecutingItems] = useState<DraftItem[] | null>(null);
  const [executionComplete, setExecutionComplete] = useState(false);

  // Preview plan state (for deep mode checkpoint)
  const [previewItems, setPreviewItems] = useState<DraftItem[] | null>(null);

  const handleSendReady = useCallback((fn: (msg: string) => void) => {
    setSendFn(() => fn);
  }, []);

  const handlePlanModeToggle = useCallback((active: boolean) => {
    setPlanMode(active);
    if (!active) {
      setWizardActive(false);
      setWizardContext(null);
      setPreviewItems(null);
    }
  }, []);

  const handlePlanMessage = useCallback((msg: string) => {
    setWizardContext(msg);
    setWizardActive(true);
  }, []);

  const handleExecutionStart = useCallback((items: DraftItem[]) => {
    setExecutingItems(items);
    setExecutionComplete(false);
    setPreviewItems(null);
    if (isMobile) setMobileTab("workspace");
  }, [isMobile]);

  const handleExecutionDone = useCallback(() => {
    setExecutionComplete(true);
    setTimeout(() => {
      setExecutingItems(null);
      setExecutionComplete(false);
    }, 2500);
  }, []);

  const handlePreviewPlan = useCallback((items: DraftItem[]) => {
    setPreviewItems(items);
  }, []);

  const handleWizardComplete = useCallback(() => {
    setWizardActive(false);
    setWizardContext(null);
    setPlanMode(false);
    setPreviewItems(null);
    handleExecutionDone();
    if (isMobile) setMobileTab("workspace");
  }, [isMobile, handleExecutionDone]);

  const handleWizardCancel = useCallback(() => {
    setWizardActive(false);
    setWizardContext(null);
    setPlanMode(false);
    setPreviewItems(null);
  }, []);

  const rollyMobileTabs = (
    <div
      className="flex min-w-0 flex-1 gap-1 rounded-[0.875rem] bg-muted/40 p-1 ring-1 ring-inset ring-border/30"
      role="tablist"
      aria-label="Rolly sections"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mobileTab === "chat"}
        onClick={() => setMobileTab("chat")}
        className={cn(
          "flex h-9 min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-1 text-sm font-medium transition-[color,background-color,box-shadow]",
          mobileTab === "chat"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground/80",
        )}
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        <span className="truncate">Chat</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mobileTab === "workspace"}
        onClick={() => setMobileTab("workspace")}
        className={cn(
          "flex h-9 min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-1 text-sm font-medium transition-[color,background-color,box-shadow]",
          mobileTab === "workspace"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground/80",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        <span className="truncate">Workspace</span>
      </button>
    </div>
  );

  return (
    <AppLayout
      title="ROLLY"
      mobileSubnav={
        isMobile ? (
          <div className="flex w-full min-w-0 max-w-full items-center pr-0.5">{rollyMobileTabs}</div>
        ) : undefined
      }
    >
      {isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {mobileTab === "chat" ? (
            <RollyChat
              prefillPrompt={prefill}
              onPrefillConsumed={() => setPrefill(null)}
              planMode={planMode}
              onPlanModeChange={handlePlanModeToggle}
              onSendReady={handleSendReady}
              onPlanMessage={handlePlanMessage}
              wizardActive={wizardActive}
              wizardContext={wizardContext}
              onWizardComplete={handleWizardComplete}
              onWizardCancel={handleWizardCancel}
              onExecutionStart={handleExecutionStart}
              onPreviewPlan={handlePreviewPlan}
            />
          ) : (
            <RollyWorkspace
              executingItems={executingItems}
              executionComplete={executionComplete}
              previewItems={previewItems}
            />
          )}
        </div>
      ) : (
        <div className="flex h-[calc(100vh-4rem)] -m-6">
          <div className="w-[400px] shrink-0 border-r border-border flex flex-col bg-background">
            <RollyChat
              prefillPrompt={prefill}
              onPrefillConsumed={() => setPrefill(null)}
              planMode={planMode}
              onPlanModeChange={handlePlanModeToggle}
              onSendReady={handleSendReady}
              onPlanMessage={handlePlanMessage}
              wizardActive={wizardActive}
              wizardContext={wizardContext}
              onWizardComplete={handleWizardComplete}
              onWizardCancel={handleWizardCancel}
              onExecutionStart={handleExecutionStart}
              onPreviewPlan={handlePreviewPlan}
            />
          </div>
          <div className="flex-1 overflow-y-auto min-w-0">
            <RollyWorkspace
              executingItems={executingItems}
              executionComplete={executionComplete}
              previewItems={previewItems}
            />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
