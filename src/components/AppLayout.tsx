import { type ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { MobileFAB } from "@/components/MobileFAB";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTeams } from "@/hooks/useTeams";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, ChevronsUpDown, ArrowLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
  onBack?: () => void;
}

export function AppLayout({ children, title, actions, onBack }: AppLayoutProps) {
  const { selectedTeamId, setSelectedTeamId } = useSelectedTeam();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: teams = [] } = useTeams();
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const myRole = selectedTeam?.role;
  const isOwnerOrManager = myRole === "team_owner" || myRole === "manager";
  const { isPaid, isTrialing } = useTeamPlan();
  const hasPaidAccess = isPaid || isTrialing;

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden">
        {!isMobile && (
          <AppSidebar selectedTeamId={selectedTeamId} onSelectTeam={setSelectedTeamId} />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar — safe-area-top spacer absorbs the notch/Dynamic Island height on iOS */}
          <header className="flex flex-col border-b border-border">
            <div className="safe-area-top" aria-hidden="true" />
            <div className="flex h-14 items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-2">
                {isMobile && onBack && (
                  <button
                    onClick={onBack}
                    className="flex items-center justify-center h-8 w-8 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
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
                        <span className="text-base font-semibold truncate max-w-[140px]">{selectedTeam?.name ?? title}</span>
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
                    <button className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-muted text-xs font-semibold">
                          {profile?.full_name?.[0] ?? <User className="h-4 w-4 text-muted-foreground" />}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border border-border z-50 min-w-[180px]">
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      Profile Settings
                    </DropdownMenuItem>
                    {isOwnerOrManager && hasPaidAccess && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/settings/team")}>
                          Team Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/settings/billing")}>
                          Billing
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Content — bottom padding clears the fixed nav bar (3.5rem) + home indicator safe area */}
          <main className="flex-1 p-4 sm:p-6 pb-[calc(3.5rem_+_1.5rem_+_var(--safe-area-inset-bottom))] sm:pb-6 overflow-x-hidden overflow-y-auto min-w-0 scroll-container">
            {children}
          </main>
        </div>

        {isMobile && <MobileBottomNav />}
        
        
      </div>
    </SidebarProvider>
  );
}

