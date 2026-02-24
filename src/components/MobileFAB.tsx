import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus, X, UserPlus, ListTodo, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";

interface FABAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}

interface MobileFABProps {
  actions?: FABAction[];
}

const defaultActionsByRoute: Record<string, { label: string; icon: React.ElementType; key: string }[]> = {
  "/roster": [
    { label: "Add Artist", icon: UserPlus, key: "add-artist" },
  ],
  "/my-work": [
    { label: "Add Task", icon: ListTodo, key: "add-task" },
  ],
  "/tasks": [
    { label: "Add Task", icon: ListTodo, key: "add-task" },
  ],
  "/overview": [
    { label: "Add Task", icon: ListTodo, key: "add-task" },
    { label: "Add Artist", icon: UserPlus, key: "add-artist" },
  ],
};

// For artist detail pages
const artistDetailActions = [
  { label: "Add Task", icon: ListTodo, key: "add-task" },
  { label: "Add Campaign", icon: FolderPlus, key: "add-campaign" },
];

export function MobileFAB({ onAction }: { onAction?: (key: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const isArtistDetail = location.pathname.startsWith("/roster/") && location.pathname !== "/roster";
  const routeActions = isArtistDetail
    ? artistDetailActions
    : defaultActionsByRoute[location.pathname] || [];

  if (routeActions.length === 0) return null;

  const handleAction = (key: string) => {
    setIsOpen(false);
    onAction?.(key);
  };

  // Single action — just trigger directly
  if (routeActions.length === 1) {
    return (
      <button
        onClick={() => handleAction(routeActions[0].key)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action items */}
      <AnimatePresence>
        {isOpen && routeActions.map((action, index) => (
          <motion.button
            key={action.key}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleAction(action.key)}
            className="fixed right-4 z-50 flex items-center gap-3"
            style={{ bottom: `${140 + index * 56}px` }}
          >
            <span className="rounded-lg bg-card px-3 py-1.5 text-sm font-medium shadow-md border border-border">
              {action.label}
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background shadow-lg">
              <action.icon className="h-5 w-5" />
            </span>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg active:scale-95 transition-all",
          isOpen
            ? "bg-muted text-foreground rotate-45"
            : "bg-foreground text-background"
        )}
      >
        <Plus className="h-6 w-6 transition-transform" />
      </button>
    </>
  );
}
