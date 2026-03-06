import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Plus, ListTodo, NotebookPen, UserPlus, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  to: string;
  state?: Record<string, unknown>;
}

const quickActions: QuickAction[] = [
  { label: "Add Task",     icon: ListTodo,    to: "/my-work" },
  { label: "Create Note",  icon: NotebookPen, to: "/notes",  state: { createNote: true } },
  { label: "Add Prospect", icon: Target,      to: "/roster", state: { openAddProspect: true } },
  { label: "Add Artist",   icon: UserPlus,    to: "/roster", state: { openAddArtist: true } },
];

export function MobileFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
                bottom: `calc(env(safe-area-inset-bottom) + ${82 + index * 58}px)`,
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
          "fixed bottom-[calc(env(safe-area-inset-bottom)+10px)] left-1/2 -translate-x-1/2 z-[46] flex h-14 w-14 items-center justify-center rounded-full shadow-lg active:scale-95 transition-all duration-200",
          isOpen
            ? "bg-muted text-foreground rotate-45"
            : "bg-foreground text-background"
        )}
      >
        <Plus className="h-6 w-6 transition-transform duration-200" />
      </button>
    </>,
    document.body
  );
}
