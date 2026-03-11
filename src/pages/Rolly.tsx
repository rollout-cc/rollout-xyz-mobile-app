import { AppLayout } from "@/components/AppLayout";
import { RollyChat } from "@/components/rolly/RollyChat";
import { RollyWorkspace } from "@/components/rolly/RollyWorkspace";
import { PlanWizard, type PlanAnswers } from "@/components/rolly/PlanWizard";
import { PlanDraft, type DraftItem } from "@/components/rolly/PlanDraft";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, LayoutGrid } from "lucide-react";
import { useLocation } from "react-router-dom";

function compilePlanPrompt(answers: PlanAnswers): string {
  const parts: string[] = ["[PLAN MODE] Here are my answers from the planning wizard. Generate a detailed plan with tasks, milestones, and budgets based on these inputs:\n"];

  if (answers.plan_type) parts.push(`**Plan type:** ${answers.plan_type}`);
  if (answers.artist) parts.push(`**Artist:** ${answers.artist}`);
  if (answers.release_type) parts.push(`**Release type:** ${answers.release_type}`);
  if (answers.project_name) parts.push(`**Project name:** ${answers.project_name}`);
  if (answers.goals) {
    const goals = Array.isArray(answers.goals) ? answers.goals.join(", ") : answers.goals;
    parts.push(`**Goals:** ${goals}`);
  }
  if (answers.verticals) {
    const verts = Array.isArray(answers.verticals) ? answers.verticals.join(", ") : answers.verticals;
    parts.push(`**Verticals:** ${verts}`);
  }
  if (answers.timeline) parts.push(`**Timeline:** ${answers.timeline}`);
  if (answers.budget) parts.push(`**Budget:** ${answers.budget}`);

  parts.push("\nPlease create all the tasks, milestones, and budgets for this plan now. Execute everything, then give me a brief recap.");

  return parts.join("\n");
}

export default function Rolly() {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"chat" | "workspace">("chat");
  const location = useLocation();
  const prefillPrompt = (location.state as any)?.prefillPrompt || null;
  const [prefill, setPrefill] = useState<string | null>(prefillPrompt);
  const [planMode, setPlanMode] = useState(false);
  const [wizardActive, setWizardActive] = useState(false);
  const [sendFn, setSendFn] = useState<((msg: string) => void) | null>(null);
  const handleSendReady = useCallback((fn: (msg: string) => void) => {
    setSendFn(() => fn);
  }, []);

  const handlePlanModeToggle = useCallback((active: boolean) => {
    setPlanMode(active);
    if (active) {
      setWizardActive(true);
      if (isMobile) setMobileTab("workspace");
    } else {
      setWizardActive(false);
    }
  }, [isMobile]);

  const handleWizardComplete = useCallback((answers: PlanAnswers) => {
    const prompt = compilePlanPrompt(answers);
    setWizardActive(false);
    if (isMobile) setMobileTab("chat");
    // Send compiled prompt to Rolly chat
    if (sendFn) {
      sendFn(prompt);
    } else {
      setPrefill(prompt);
    }
  }, [sendFn, isMobile]);

  const handleWizardCancel = useCallback(() => {
    setWizardActive(false);
    setPlanMode(false);
    if (isMobile) setMobileTab("chat");
  }, [isMobile]);

  const workspaceContent = wizardActive ? (
    <PlanWizard onComplete={handleWizardComplete} onCancel={handleWizardCancel} />
  ) : (
    <RollyWorkspace />
  );

  return (
    <AppLayout title="ROLLY">
      {isMobile ? (
        <div className="flex flex-col h-[calc(100dvh-7.5rem)]">
          {/* Mobile tab switcher */}
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
              />
            ) : (
              workspaceContent
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-4rem)] -m-6">
          {/* Left: Chat sidebar */}
          <div className="w-[400px] shrink-0 border-r border-border flex flex-col bg-background">
            <RollyChat
              prefillPrompt={prefill}
              onPrefillConsumed={() => setPrefill(null)}
              planMode={planMode}
              onPlanModeChange={handlePlanModeToggle}
              onSendReady={setSendFn}
            />
          </div>
          {/* Right: Workspace or Wizard */}
          <div className="flex-1 overflow-y-auto min-w-0">
            {workspaceContent}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
