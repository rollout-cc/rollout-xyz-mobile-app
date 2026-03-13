import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRollyNudge } from "@/hooks/useRollyNudge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import rollyIcon from "@/assets/rolly-icon.png";

interface Props {
  screen: string;
  dataSnapshot: Record<string, any>;
  entityId?: string;
}

export function RollyNudge({ screen, dataSnapshot, entityId }: Props) {
  const { nudge, ctaPrompt, dismissed, dismiss } = useRollyNudge(screen, dataSnapshot, entityId);
  const isMobile = useIsMobile();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  if (!nudge || dismissed) return null;

  const handleClick = () => {
    const prompt = ctaPrompt || nudge;
    dismiss();
    setTimeout(() => {
      navigate("/rolly", { state: { prefillPrompt: prompt } });
    }, 0);
  };

  // Mobile: bottom toast above nav
  // Desktop expanded sidebar: pinned in sidebar area (left, above Rolly button)
  // Desktop collapsed sidebar: bottom-right toast
  const positionClass = isMobile
    ? "fixed bottom-[calc(env(safe-area-inset-bottom)+74px)] left-3 right-20 z-[55]"
    : collapsed
    ? "fixed bottom-6 right-6 z-[55] max-w-[320px]"
    : "fixed bottom-[120px] left-4 z-[55] max-w-[calc(var(--sidebar-width,16rem)-2rem)]";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`${positionClass} flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-card border border-border shadow-lg cursor-pointer hover:shadow-xl transition-shadow`}
        onClick={handleClick}
      >
        <img src={rollyIcon} alt="" className="h-5 w-5 rounded-full shrink-0" />
        <span className="text-xs text-foreground leading-snug line-clamp-2 flex-1">{nudge}</span>
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
