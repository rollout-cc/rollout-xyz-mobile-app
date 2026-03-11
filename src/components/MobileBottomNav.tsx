import { useLocation, useNavigate } from "react-router-dom";
import { Home, FolderOpen, CheckCheck } from "lucide-react";
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background safe-area-bottom">
      <div className="flex items-center h-14">
        {items.map(({ to, icon: Icon, label, isRolly }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
              isActive(to) ? "text-primary" : "text-muted-foreground"
            )}
          >
            {isRolly ? (
              <img src={rollyIcon} alt="Rolly" className="h-5 w-5 rounded-full" />
            ) : (
              Icon && <Icon className="h-5 w-5" />
            )}
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
