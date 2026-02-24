import { useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, ListTodo, BarChart3, ClipboardList, Plus, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { to: "/overview", icon: BarChart3, label: "Overview" },
  { to: "/roster", icon: LayoutGrid, label: "Roster" },
  { to: "/my-work", icon: Briefcase, label: "My Work" },
  { to: "/tasks", icon: ListTodo, label: "Tasks" },
  { to: "/agenda", icon: ClipboardList, label: "Agenda" },
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
        {navItems.map(({ to, icon: Icon, label }) => (
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
