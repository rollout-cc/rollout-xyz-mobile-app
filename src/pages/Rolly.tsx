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

  const str = (key: string) => (typeof answers[key] === "string" ? answers[key] : "");
  const arr = (key: string) => (Array.isArray(answers[key]) ? (answers[key] as string[]).join(", ") : str(key));

  // ── CORE ──
  parts.push("## Core Info");
  if (answers.plan_type) parts.push(`**Plan type:** ${str("plan_type")}`);
  if (answers.artist) parts.push(`**Artist:** ${str("artist")}`);
  if (answers.release_type) parts.push(`**Release type:** ${str("release_type")}`);
  if (answers.project_name) parts.push(`**Project name:** ${str("project_name")}`);
  if (answers.goals) parts.push(`**Goals:** ${arr("goals")}`);
  if (answers.verticals) parts.push(`**Verticals:** ${arr("verticals")}`);
  if (answers.timeline) parts.push(`**Timeline:** ${str("timeline")}`);
  if (answers.budget) parts.push(`**Budget:** ${str("budget")}`);

  // ── NARRATIVE & IDENTITY ──
  if (answers.era_theme || answers.visual_direction) {
    parts.push("\n## Narrative & Identity");
    if (answers.era_theme) parts.push(`**Era theme/story:** ${str("era_theme")}`);
    if (answers.visual_direction) parts.push(`**Visual direction:** ${str("visual_direction")}`);
  }

  // ── MUSIC / DISTRIBUTION ──
  if (answers.music_ready || answers.distributor || answers.playlist_strategy || answers.radio_plans) {
    parts.push("\n## Distribution & Streaming");
    if (answers.music_ready) parts.push(`**Music status:** ${str("music_ready")}`);
    if (answers.distributor) parts.push(`**Distributor:** ${str("distributor")}`);
    if (answers.playlist_strategy) parts.push(`**Playlist strategy:** ${arr("playlist_strategy")}`);
    if (answers.radio_plans) parts.push(`**Radio plans:** ${str("radio_plans")}`);
  }

  // ── MERCH OPS ──
  if (answers.merch_designs || answers.merch_fulfillment || answers.merch_link || answers.merch_drop_strategy) {
    parts.push("\n## Merch Operations");
    if (answers.merch_designs) parts.push(`**Design status:** ${str("merch_designs")}`);
    if (answers.merch_fulfillment) parts.push(`**Fulfillment model:** ${str("merch_fulfillment")}`);
    if (answers.merch_link) parts.push(`**Merch link:** ${str("merch_link")}`);
    if (answers.merch_drop_strategy) parts.push(`**Drop strategy:** ${str("merch_drop_strategy")}`);
  }

  // ── LIVE / TOURING ──
  if (answers.live_type || answers.booking_agent) {
    parts.push("\n## Live & Touring");
    if (answers.live_type) parts.push(`**Event types:** ${arr("live_type")}`);
    if (answers.booking_agent) parts.push(`**Booking agent:** ${str("booking_agent")}`);
  }

  // ── SYNC ──
  if (answers.sync_cleared || answers.sync_pitches) {
    parts.push("\n## Sync & Licensing");
    if (answers.sync_cleared) parts.push(`**Sync clearance:** ${str("sync_cleared")}`);
    if (answers.sync_pitches) parts.push(`**Active pitches:** ${str("sync_pitches")}`);
  }

  // ── CONTENT ──
  if (answers.content_types || answers.content_team) {
    parts.push("\n## Content Strategy");
    if (answers.content_types) parts.push(`**Planned content:** ${arr("content_types")}`);
    if (answers.content_team) parts.push(`**Content team:** ${str("content_team")}`);
  }

  // ── PR & TEAM ──
  if (answers.has_publicist || answers.press_targets || answers.team_roles) {
    parts.push("\n## PR & Team");
    if (answers.has_publicist) parts.push(`**Publicist:** ${str("has_publicist")}`);
    if (answers.publicist_invited === "Not yet") {
      parts.push("→ **Action:** Create a task to invite the publicist as a Guest member on Rollout.");
    }
    if (answers.press_targets) parts.push(`**Press targets:** ${arr("press_targets")}`);
    if (answers.team_roles) parts.push(`**Extended team:** ${arr("team_roles")}`);
    if (answers.team_invited === "Not yet") {
      parts.push("→ **Action:** Create tasks to invite each extended team member to Rollout.");
    }
  }

  // ── SEEDING ──
  if (answers.seeding_strategy) {
    parts.push("\n## Seeding Strategy");
    parts.push(`**Anticipation tactics:** ${arr("seeding_strategy")}`);
  }

  // ── ADDITIONAL ──
  if (answers.additional_context) {
    parts.push("\n## Additional Context");
    parts.push(str("additional_context"));
  }

  parts.push("\n---\nPlease create all the tasks, milestones, and budgets for this plan now. Execute everything, then give me a brief recap.");

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
    const prompt = compilePlanPrompt(answers);
    setWizardActive(false);
    if (isMobile) setMobileTab("chat");
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
          <div className="w-[400px] shrink-0 border-r border-border flex flex-col bg-background">
            <RollyChat
              prefillPrompt={prefill}
              onPrefillConsumed={() => setPrefill(null)}
              planMode={planMode}
              onPlanModeChange={handlePlanModeToggle}
              onSendReady={handleSendReady}
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
