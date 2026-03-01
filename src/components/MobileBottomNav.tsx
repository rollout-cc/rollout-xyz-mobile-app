import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, FolderOpen, CheckCheck, User, Radar, Users, ClipboardList, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainItems = [
  { to: "/overview", icon: Home, label: "Home" },
  { to: "/roster", icon: FolderOpen, label: "Roster" },
];

const rightItems = [
  { to: "/my-work", icon: CheckCheck, label: "My Work" },
];

const moreItems = [
  { to: "/ar", icon: Radar, label: "A&R" },
  { to: "/staff", icon: Users, label: "Staff" },
  { to: "/agenda", icon: ClipboardList, label: "Agenda" },
  { to: "/settings", icon: User, label: "Settings" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/roster") return location.pathname === "/roster" || location.pathname.startsWith("/roster/");
    if (path === "/ar") return location.pathname.startsWith("/ar");
    return location.pathname === path;
  };

  const isMoreActive = moreItems.some((item) => isActive(item.to));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {mainItems.map(({ to, icon: Icon, label }) => (
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

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isMoreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2">
            {moreItems.map(({ to, icon: Icon, label }) => (
              <DropdownMenuItem
                key={to}
                onClick={() => navigate(to)}
                className={cn(isActive(to) && "font-semibold")}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
