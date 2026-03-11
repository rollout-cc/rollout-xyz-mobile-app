import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { RollyChat } from "./RollyChat";
import { useIsMobile } from "@/hooks/use-mobile";
import rollyIcon from "@/assets/rolly-icon.png";
import { rollyEvents } from "@/lib/rollyEvents";

const GREETING_KEY = "rolly-greeted";

export function RollyFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const isMobile = useIsMobile();

  // Show greeting bubble on first visit per session
  useEffect(() => {
    if (sessionStorage.getItem(GREETING_KEY)) return;
    const timer = setTimeout(() => {
      setShowGreeting(true);
      sessionStorage.setItem(GREETING_KEY, "1");
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss greeting after 6s
  useEffect(() => {
    if (!showGreeting) return;
    const timer = setTimeout(() => setShowGreeting(false), 6000);
    return () => clearTimeout(timer);
  }, [showGreeting]);

  const handleOpen = () => {
    setShowGreeting(false);
    setIsOpen(!isOpen);
  };

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

      {/* Greeting bubble */}
      <AnimatePresence>
        {showGreeting && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "fixed z-[59] bg-card border border-border rounded-xl shadow-lg px-4 py-3 max-w-[220px] text-sm text-foreground",
              isMobile
                ? "bottom-[calc(env(safe-area-inset-bottom)+134px)] right-4"
                : "bottom-[72px] right-4"
            )}
          >
            <button
              onClick={() => setShowGreeting(false)}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] hover:bg-accent transition-colors"
            >
              ✕
            </button>
            <p className="font-medium">Hey! 👋</p>
            <p className="text-muted-foreground text-xs mt-0.5">Need help with anything? Ask ROLLY.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <button
        onClick={handleOpen}
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
          <motion.img
            src={rollyIcon}
            alt="ROLLY"
            className="h-10 w-10 invert dark:invert-0"
            animate={{ rotate: [0, 0, 15, -15, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 4 }}
          />
        )}
      </button>
    </>,
    document.body
  );
}
