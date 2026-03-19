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

  return (
    <AppLayout title="ROLLY">
      {isMobile ? (
        <div className="flex flex-col h-[calc(100dvh-7.5rem)]">
          <div className="flex border-b border-border shrink-0">
            <button
              onClick={() => setMobileTab("chat")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2",
                mobileTab === "chat"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </button>
            <button
              onClick={() => setMobileTab("workspace")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2",
                mobileTab === "workspace"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Workspace
            </button>
          </div>
          <div className="flex-1 min-h-0">
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
