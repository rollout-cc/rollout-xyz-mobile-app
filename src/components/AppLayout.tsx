import { useState, useEffect, type ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useTeams } from "@/hooks/useTeams";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
}

export function AppLayout({ children, title, actions }: AppLayoutProps) {
  const { data: teams = [] } = useTeams();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar selectedTeamId={selectedTeamId} onSelectTeam={setSelectedTeamId} />

        <div className="flex-1 flex flex-col">
          {/* Top bar */}
          <header className="flex h-14 items-center justify-between border-b border-border px-6">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{title}</span>
            </div>
            <div className="flex items-center gap-3">
              {actions}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function useSelectedTeam() {
  const { data: teams = [] } = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  return { selectedTeamId, setSelectedTeamId, teams };
}
