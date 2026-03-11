import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRollyNudge } from "@/hooks/useRollyNudge";
import { rollyEvents } from "@/lib/rollyEvents";
import { useIsMobile } from "@/hooks/use-mobile";
import rollyIcon from "@/assets/rolly-icon.png";

interface Props {
  screen: string;
  dataSnapshot: Record<string, any>;
  entityId?: string;
}

export function RollyNudge({ screen, dataSnapshot, entityId }: Props) {
  const { nudge, ctaPrompt, dismissed, dismiss } = useRollyNudge(screen, dataSnapshot, entityId);
  const isMobile = useIsMobile();

  if (!nudge || dismissed) return null;

  const handleClick = () => {
    if (ctaPrompt) {
      rollyEvents.openWithPrompt(ctaPrompt);
    }
    dismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`fixed z-[55] flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-card border border-border shadow-lg cursor-pointer hover:shadow-xl transition-shadow max-w-[360px] ${
          isMobile
            ? "bottom-[calc(env(safe-area-inset-bottom)+74px)] left-3 right-20"
            : "bottom-12 left-[calc(var(--sidebar-width,16rem)+1rem)]"
        }`}
        onClick={handleClick}
      >
        <img src={rollyIcon} alt="" className="h-6 w-6 rounded-full shrink-0" />
        <span className="text-sm text-foreground leading-snug line-clamp-2 flex-1">{nudge}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className="h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0 hover:bg-accent transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
