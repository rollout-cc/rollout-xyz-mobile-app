import { AppLayout } from "@/components/AppLayout";
import { RollyChat } from "@/components/rolly/RollyChat";
import { RollyWorkspace } from "@/components/rolly/RollyWorkspace";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, LayoutGrid } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function Rolly() {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"chat" | "workspace">("chat");
  const location = useLocation();
  const prefillPrompt = (location.state as any)?.prefillPrompt || null;
  const [prefill, setPrefill] = useState<string | null>(prefillPrompt);

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
              Workspace
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {mobileTab === "chat" ? <RollyChat prefillPrompt={prefill} onPrefillConsumed={() => setPrefill(null)} /> : <RollyWorkspace />}
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-4rem)] -m-6">
          {/* Left: Chat sidebar */}
          <div className="w-[400px] shrink-0 border-r border-border flex flex-col bg-background">
            <RollyChat />
          </div>
          {/* Right: Workspace */}
          <div className="flex-1 overflow-y-auto min-w-0">
            <RollyWorkspace />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
