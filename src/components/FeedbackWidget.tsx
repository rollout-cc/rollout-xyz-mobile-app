import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { MessageSquarePlus, Bug, Lightbulb, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useItemEditorUi } from "@/contexts/ItemEditorUiContext";
import { useMobileQuickActions } from "@/contexts/MobileQuickActionsContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FeedbackWidget() {
  const { user } = useAuth();
  const { selectedTeamId } = useSelectedTeam();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { suggestionsMenuOpen } = useItemEditorUi();
  const { isOpen: quickActionsMenuOpen } = useMobileQuickActions();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"bug" | "feature">("bug");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const onRolly = location.pathname === "/rolly" || location.pathname.startsWith("/rolly/");
  const hideOnRollyCompact = onRolly && (isMobile || Capacitor.isNativePlatform());

  if (!user || !selectedTeamId || hideOnRollyCompact) return null;
  if (isMobile && (suggestionsMenuOpen || quickActionsMenuOpen)) return null;

  const submit = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      const pageUrl = window.location.pathname;
      const { data, error } = await supabase
        .from("feedback" as any)
        .insert({ team_id: selectedTeamId, user_id: user.id, type, message: message.trim(), page_url: pageUrl } as any)
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Thanks for your feedback!");
      setMessage("");
      setOpen(false);

      // Fire-and-forget AI categorization
      const feedbackId = (data as any)?.id;
      if (feedbackId) {
        const { data: { session } } = await supabase.auth.getSession();
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/categorize-feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ feedback_id: feedbackId, message: message.trim(), type }),
        }).catch(console.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to submit feedback");
    }
    setBusy(false);
  };

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] right-4 z-50 sm:bottom-6 sm:right-6">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
            aria-label="Send feedback"
          >
            {open ? <X className="h-5 w-5" /> : <MessageSquarePlus className="h-5 w-5" />}
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-80 p-0" sideOffset={12}>
          <div className="p-4 space-y-3">
            <p className="text-sm font-semibold">Send Feedback</p>
            <div className="flex gap-2">
              <button
                onClick={() => setType("bug")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  type === "bug"
                    ? "bg-destructive/10 text-destructive ring-1 ring-destructive/30"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                <Bug className="h-3.5 w-3.5" /> Bug Report
              </button>
              <button
                onClick={() => setType("feature")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  type === "feature"
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                <Lightbulb className="h-3.5 w-3.5" /> Feature Request
              </button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={type === "bug" ? "Describe the bug…" : "Describe the feature you'd like…"}
              rows={3}
              className="resize-none text-sm"
            />
            <Button
              onClick={submit}
              disabled={busy || !message.trim()}
              size="sm"
              className="w-full gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {busy ? "Sending…" : "Submit"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
