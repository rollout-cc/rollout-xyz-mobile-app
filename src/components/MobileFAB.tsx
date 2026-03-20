import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Plus, ListTodo, NotebookPen, UserPlus, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileQuickActions } from "@/contexts/MobileQuickActionsContext";
import { AnimatePresence, motion } from "framer-motion";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  to: string;
  state?: Record<string, unknown>;
}

const quickActions: QuickAction[] = [
  { label: "Add Task",     icon: ListTodo,    to: "/my-work", state: { openBlankTask: true } },
  { label: "Create Note",  icon: NotebookPen, to: "/notes",  state: { createNote: true } },
  { label: "Add Prospect", icon: Target,      to: "/roster", state: { openAddProspect: true } },
  { label: "Add Artist",   icon: UserPlus,    to: "/roster", state: { openAddArtist: true } },
];

export function MobileFAB() {
  const { isOpen, setIsOpen } = useMobileQuickActions();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) setIsOpen(false);
  }, [isMobile, setIsOpen]);

  useEffect(() => {
    return () => setIsOpen(false);
  }, [setIsOpen]);

  if (!isMobile) return null;

  const handleAction = (action: QuickAction) => {
    setIsOpen(false);
    navigate(action.to, action.state ? { state: action.state } : undefined);
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[45] bg-background/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action items — stacked bottom-to-top, index 0 closest to FAB */}
      <AnimatePresence>
        {isOpen &&
          quickActions.map((action, index) => (
            <motion.button
              key={action.to}
              initial={{ opacity: 0, y: 16, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.85 }}
              transition={{ duration: 0.18, delay: index * 0.04 }}
              onClick={() => handleAction(action)}
              className="fixed left-1/2 -translate-x-1/2 z-[46] flex items-center gap-3"
              style={{
                bottom: `calc(env(safe-area-inset-bottom) + ${94 + index * 58}px)`,
              }}
            >
              <span className="rounded-lg bg-card px-3 py-1.5 text-sm font-medium shadow-md border border-border whitespace-nowrap">
                {action.label}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background shadow-lg shrink-0">
                <action.icon className="h-5 w-5" />
              </span>
            </motion.button>
          ))}
      </AnimatePresence>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Quick actions"}
        className={cn(
          "fixed left-1/2 z-[46] flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-border/40",
          "bottom-[calc(env(safe-area-inset-bottom)+1.875rem)]",
          "shadow-[0_10px_32px_-8px_rgba(0,0,0,0.32),0_3px_12px_-3px_rgba(0,0,0,0.18)]",
          "dark:border-border/30 dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]",
          "active:scale-[0.96] transition-all duration-300 ease-out",
          isOpen
            ? "bg-muted text-foreground rotate-45 ring-2 ring-background"
            : "bg-foreground text-background ring-2 ring-background/90"
        )}
      >
        <Plus className="h-6 w-6 transition-transform duration-300" strokeWidth={2.25} />
      </button>
    </>,
    document.body
  );
}
