import { useLocation, useNavigate } from "react-router-dom";
import { Home, FolderOpen, CheckCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";

const leftItems = [
  { to: "/overview", icon: Home, label: "Home" },
  { to: "/roster", icon: FolderOpen, label: "Roster" },
];

const rightItems = [
  { to: "/my-work", icon: CheckCheck, label: "My Work" },
  { to: "/settings", icon: User, label: "Profile" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/roster") return location.pathname === "/roster" || location.pathname.startsWith("/roster/");
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {leftItems.map(({ to, icon: Icon, label }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
              isActive(to) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}

        {/* Center spacer for FAB */}
        <div className="flex-1" />

        {rightItems.map(({ to, icon: Icon, label }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
              isActive(to) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
