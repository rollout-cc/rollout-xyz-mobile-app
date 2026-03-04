import { type ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTeams } from "@/hooks/useTeams";
import { User, ChevronsUpDown } from "lucide-react";
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
  const { selectedTeamId, setSelectedTeamId } = useSelectedTeam();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: teams = [] } = useTeams();
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {!isMobile && (
          <AppSidebar selectedTeamId={selectedTeamId} onSelectTeam={setSelectedTeamId} />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6">
            <div className="flex items-center gap-2">
              {isMobile && teams.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 rounded-md px-1 py-1 hover:bg-accent transition-colors">
                      <div className="flex items-center justify-center rounded-md bg-muted text-xs font-semibold h-7 w-7 overflow-hidden shrink-0">
                        {selectedTeam?.avatar_url ? (
                          <img src={selectedTeam.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          selectedTeam?.name?.[0] ?? "?"
                        )}
                      </div>
                      <span className="text-base font-semibold truncate max-w-[140px]">{title}</span>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {teams.map((team) => (
                      <DropdownMenuItem key={team.id} onClick={() => setSelectedTeamId(team.id)}>
                        {team.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-base font-semibold">{title}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {actions}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
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
          <main className="flex-1 p-4 sm:p-6 pb-20 sm:pb-6 overflow-x-hidden min-w-0 scroll-container">
            {children}
          </main>
        </div>

        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}

