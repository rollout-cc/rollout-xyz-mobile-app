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

  // Mobile: outer shell has no fill — only the inner card paints. `right` inset clears the
  // feedback FAB (right-4 + h-12) so the bar never sits under a higher stacking layer on iOS.
  // Desktop expanded sidebar: pinned in sidebar area (left, above Rolly button)
  // Desktop collapsed sidebar: bottom-right toast
  const mobileShellClass =
    "fixed bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] z-[55] pointer-events-none left-[max(1rem,env(safe-area-inset-left,0px))] right-[calc(max(1rem,env(safe-area-inset-right,0px))+5rem)]";

  const desktopPositionClass = collapsed
    ? "fixed bottom-6 right-6 z-[55] max-w-[320px]"
    : "fixed bottom-[180px] left-4 z-[55] w-[calc(var(--sidebar-width,16rem)-2rem)]";

  const motionProps = {
    initial: { opacity: 0, y: 8, scale: 0.96 } as const,
    animate: { opacity: 1, y: 0, scale: 1 } as const,
    exit: { opacity: 0, y: 8, scale: 0.96 } as const,
    transition: { duration: 0.2, ease: "easeOut" as const },
  };

  return (
    <AnimatePresence>
      {isMobile ? (
        <motion.div {...motionProps} className={mobileShellClass}>
          <div
            onClick={handleClick}
            className={cn(
              "pointer-events-auto flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-lg transition-shadow hover:shadow-xl",
              "[-webkit-tap-highlight-color:transparent]"
            )}
          >
            <img src={rollyIcon} alt="" className="h-5 w-5 shrink-0 rounded-full" />
            <span className="min-w-0 flex-1 text-xs leading-snug text-foreground">{nudge}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismiss();
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent [-webkit-tap-highlight-color:transparent]"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          {...motionProps}
          className={cn(
            desktopPositionClass,
            "flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-lg transition-shadow hover:shadow-xl"
          )}
          onClick={handleClick}
        >
          <img src={rollyIcon} alt="" className="h-5 w-5 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1 text-xs leading-snug text-foreground">{nudge}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
