import { useLocation, useNavigate } from "react-router-dom";
import { Home, FolderOpen, CheckCheck, Disc3 } from "lucide-react";
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
    // Artist: their artist page as home, My Work, Rolly
    const artistHome = assignedArtistIds.length > 0 ? `/roster/${assignedArtistIds[0]}` : "/roster";
    items.push({ to: artistHome, icon: Home, label: "Home" });
    items.push({ to: "/my-work", icon: CheckCheck, label: "My Work" });
    items.push({ to: "/rolly", icon: null, label: "Rolly", isRolly: true });
  } else if (isGuestRole) {
    // Guest: only assigned artists
    items.push({ to: "/roster", icon: FolderOpen, label: "Artists" });
  } else {
    // Owner/Manager: full nav
    items.push({ to: "/overview", icon: Home, label: "Home" });
    items.push({ to: "/roster", icon: FolderOpen, label: "Artists" });
    items.push({ to: "/my-work", icon: CheckCheck, label: "My Work" });
    items.push({ to: "/rolly", icon: null, label: "Rolly", isRolly: true });
  }

  // Split items around the center FAB slot when there are enough items
  const useSplit = items.length >= 3;
  const mid = Math.ceil(items.length / 2);
  const leftItems = useSplit ? items.slice(0, mid) : items;
  const rightItems = useSplit ? items.slice(mid) : [];

  const renderItem = ({ to, icon: Icon, label, isRolly }: typeof items[number]) => {
    const active = isActive(to);
    return (
      <button
        key={to}
        onClick={() => navigate(to)}
        className={cn(
          "relative flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        {isRolly ? (
          <img src={rollyIcon} alt="Rolly" className="h-6 w-6 rounded-full" />
        ) : (
          Icon && <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} />
        )}
        <span className={cn("text-[11px] leading-none", active ? "font-semibold" : "font-medium")}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur safe-area-bottom">
      <div className="flex items-center h-16">
        {useSplit ? (
          <>
            <div className="flex flex-1 items-stretch">
              {leftItems.map(renderItem)}
            </div>
            {/* Dead zone for the centered FAB (w-14 = 56px + breathing room) */}
            <div className="w-[72px] shrink-0" aria-hidden="true" />
            <div className="flex flex-1 items-stretch">
              {rightItems.map(renderItem)}
            </div>
          </>
        ) : (
          leftItems.map(renderItem)
        )}
      </div>
    </nav>
  );
}
