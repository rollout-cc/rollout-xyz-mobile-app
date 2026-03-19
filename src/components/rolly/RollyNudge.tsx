import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
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

  // Mobile: full-bleed bar above nav; pr clears Rolly FAB (right-4 + h-14)
  // Desktop expanded sidebar: pinned in sidebar area (left, above Rolly button)
  // Desktop collapsed sidebar: bottom-right toast
  const positionClass = isMobile
    ? "fixed bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-[55] min-w-0 inset-x-0 w-full pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[calc(max(1rem,env(safe-area-inset-right,0px))+5rem)]"
    : collapsed
    ? "fixed bottom-6 right-6 z-[55] max-w-[320px]"
    : "fixed bottom-[180px] left-4 z-[55] w-[calc(var(--sidebar-width,16rem)-2rem)]";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          positionClass,
          "flex cursor-pointer items-center border border-border bg-card shadow-lg transition-shadow hover:shadow-xl",
          isMobile
            ? "gap-3 rounded-none border-x-0 py-3"
            : "gap-2.5 rounded-xl px-3.5 py-2.5"
        )}
        onClick={handleClick}
      >
        <img src={rollyIcon} alt="" className="h-5 w-5 rounded-full shrink-0" />
        <span className="text-xs text-foreground leading-snug flex-1 min-w-0">{nudge}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent transition-colors sm:h-8 sm:w-8"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 sm:h-3 sm:w-3" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
