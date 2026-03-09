import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { RollyChat } from "./RollyChat";
import { useIsMobile } from "@/hooks/use-mobile";
import rollyIcon from "@/assets/rolly-icon.png";

export function RollyFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  return createPortal(
    <>
      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed z-[60] bg-background border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col",
              isMobile
                ? "inset-2 bottom-2"
                : "bottom-24 right-4 w-[420px] h-[560px]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <img src={rollyIcon} alt="ROLLY" className="h-7 w-7 rounded-full" />
                <span className="font-semibold text-sm text-foreground">ROLLY</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Chat */}
            <div className="flex-1 min-h-0">
              <RollyChat />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close ROLLY" : "Open ROLLY"}
        className={cn(
          "fixed z-[59] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 active:scale-95",
          isMobile
            ? "bottom-[calc(env(safe-area-inset-bottom)+74px)] right-4"
            : "bottom-4 right-4",
          isOpen
            ? "bg-muted text-foreground"
            : "bg-foreground text-background"
        )}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <img src={rollyIcon} alt="ROLLY" className="h-8 w-8 invert dark:invert-0" />
        )}
      </button>
    </>,
    document.body
  );
}
