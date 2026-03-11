import { AppLayout } from "@/components/AppLayout";
import { RollyChat } from "@/components/rolly/RollyChat";
import { RollyWorkspace } from "@/components/rolly/RollyWorkspace";
import { PlanWizard } from "@/components/rolly/PlanWizard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, LayoutGrid } from "lucide-react";
import { useLocation } from "react-router-dom";




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
  const handleSendReady = useCallback((fn: (msg: string) => void) => {
    setSendFn(() => fn);
  }, []);

  const handlePlanModeToggle = useCallback((active: boolean) => {
    setPlanMode(active);
    if (active) {
      // Don't activate wizard yet — wait for the user's first message
    } else {
      setWizardActive(false);
      setWizardContext(null);
    }
  }, []);

  const handlePlanMessage = useCallback((msg: string) => {
    setWizardContext(msg);
    setWizardActive(true);
    if (isMobile) setMobileTab("workspace");
  }, [isMobile]);

  const handleWizardComplete = useCallback((answers: PlanAnswers) => {
    const prompt = compilePlanPrompt(answers, wizardContext);
    setWizardActive(false);
    setWizardContext(null);
    if (isMobile) setMobileTab("chat");
    if (sendFn) {
      sendFn(prompt);
    } else {
      setPrefill(prompt);
    }
  }, [sendFn, isMobile, wizardContext]);

  const handleWizardCancel = useCallback(() => {
    setWizardActive(false);
    setWizardContext(null);
    setPlanMode(false);
    if (isMobile) setMobileTab("chat");
  }, [isMobile]);

  const workspaceContent = wizardActive ? (
    <PlanWizard onComplete={handleWizardComplete} onCancel={handleWizardCancel} initialContext={wizardContext} />
  ) : (
    <RollyWorkspace />
  );

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
              {wizardActive ? "Plan" : "Workspace"}
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
              />
            ) : (
              workspaceContent
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
            />
          </div>
          <div className="flex-1 overflow-y-auto min-w-0">
            {workspaceContent}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
