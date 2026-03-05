import { useLocation, useNavigate } from "react-router-dom";
import { Home, FolderOpen, CheckCheck, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const leftItems = [
  { to: "/overview", icon: Home, label: "Home" },
  { to: "/roster", icon: FolderOpen, label: "Artists" },
];

const rightItems = [
  { to: "/my-work", icon: CheckCheck, label: "My Work" },
  { to: "/notes", icon: BookOpen, label: "Notes" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/roster") return location.pathname === "/roster" || location.pathname.startsWith("/roster/");
    if (path === "/ar") return location.pathname.startsWith("/ar");
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-area-bottom">
      <div className="flex items-center h-14">
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
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}

        {/* Fixed-width center spacer sized to the FAB so left/right tabs are optically equal */}
        <div className="w-16 shrink-0" />

        {rightItems.map(({ to, icon: Icon, label }, i) => (
          <button
            key={`${to}-${i}`}
            onClick={() => navigate(to)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
              isActive(to) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
