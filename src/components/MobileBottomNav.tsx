import { useLocation, useNavigate } from "react-router-dom";
import { Home, Globe, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import rollyIcon from "@/assets/rolly-icon.png";
import { useSelectedTeam } from "@/contexts/TeamContext";

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isArtistRole, isGuestRole, assignedArtistIds } = useSelectedTeam();

  const isActive = (path: string) => {
    if (path === "/roster") return location.pathname === "/roster" || location.pathname.startsWith("/roster/");
    if (path === "/ar") return location.pathname.startsWith("/ar");
    return location.pathname === path;
  };

  // Build nav items based on role
  const items: { to: string; icon: any; label: string; isRolly?: boolean }[] = [];

  if (isArtistRole) {
    // Artist: My Work, Artists, (FAB), Company (their artist), Rolly
    const artistHome = assignedArtistIds.length > 0 ? `/roster/${assignedArtistIds[0]}` : "/roster";
    items.push({ to: "/my-work", icon: CheckCheck, label: "My Work" });
    items.push({ to: "/roster", icon: FolderOpen, label: "Artists" });
    items.push({ to: artistHome, icon: Building2, label: "Company" });
    items.push({ to: "/rolly", icon: null, label: "Rolly", isRolly: true });
  } else if (isGuestRole) {
    // Guest: only assigned artists
    items.push({ to: "/roster", icon: FolderOpen, label: "Artists" });
  } else {
    // Owner/Manager: My Work, Artists, (FAB), Company, Rolly — Distro is desktop sidebar only
    items.push({ to: "/my-work", icon: CheckCheck, label: "My Work" });
    items.push({ to: "/roster", icon: FolderOpen, label: "Artists" });
    items.push({ to: "/overview", icon: Building2, label: "Company" });
    items.push({ to: "/rolly", icon: null, label: "Rolly", isRolly: true });
  }

  // Split items around the center quick-action FAB (MobileFAB): left | FAB | right
  const useSplit = items.length >= 3;
  const mid = Math.ceil(items.length / 2);
  const leftItems = useSplit ? items.slice(0, mid) : items;
  const rightItems = useSplit ? items.slice(mid) : [];

  const renderItem = ({ to, icon: Icon, label, isRolly }: typeof items[number]) => {
    const active = isActive(to);
    return (
      <button
        key={to}
        type="button"
        onClick={() => navigate(to)}
        className="relative flex flex-1 flex-col items-center justify-center min-w-0 min-h-[3.25rem] [-webkit-tap-highlight-color:transparent] active:opacity-90"
      >
        <span
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-1 w-full max-w-[4.75rem] transition-all duration-300 ease-out",
            active
              ? "bg-muted/90 text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-muted/50 dark:shadow-none"
              : "text-muted-foreground"
          )}
        >
          {isRolly ? (
            <img src={rollyIcon} alt="" className="h-5 w-5 rounded-full" />
          ) : (
            Icon && <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.1 : 1.65} />
          )}
          <span className={cn("text-[10px] leading-tight tracking-tight", active ? "font-semibold" : "font-medium")}>
            {label}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pl-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] pb-[max(0.75rem,var(--safe-area-inset-bottom))]">
      <nav
        className="pointer-events-auto w-full max-w-xl"
        aria-label="Main navigation"
      >
        <div
          className={cn(
            "flex items-stretch rounded-[2rem] border border-border/60 bg-background/80 backdrop-blur-xl px-1.5 py-1.5",
            "shadow-[0_10px_40px_-10px_rgba(0,0,0,0.18),0_4px_16px_-4px_rgba(0,0,0,0.08)]",
            "dark:border-border/80 dark:bg-background/75 dark:shadow-[0_12px_48px_-12px_rgba(0,0,0,0.55)]"
          )}
        >
          {useSplit ? (
            <>
              <div className="flex flex-1 items-stretch min-w-0">{leftItems.map(renderItem)}</div>
              {/* Center slot for the elevated quick-action FAB */}
              <div className="w-[3.25rem] shrink-0" aria-hidden="true" />
              <div className="flex flex-1 items-stretch min-w-0">{rightItems.map(renderItem)}</div>
            </>
          ) : (
            <div className="flex flex-1 items-stretch w-full">{leftItems.map(renderItem)}</div>
          )}
        </div>
      </nav>
    </div>
  );
}
