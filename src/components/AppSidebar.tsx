import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutGrid, Plus, ChevronsUpDown, Building2, ClipboardList, Users, Radar, CheckCheck, PanelLeftOpen, PanelRightOpen, Settings, User, CreditCard, Sparkles, Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";
import rolloutLogo from "@/assets/rollout-logo.png";
import rolloutFlag from "@/assets/rollout-flag.svg";
import rollyIcon from "@/assets/rolly-icon.png";
import { NavLink } from "@/components/NavLink";
import { useSelectedTeam } from "@/contexts/TeamContext";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTeams, useCreateTeam } from "@/hooks/useTeams";
import { toast } from "sonner";

interface AppSidebarProps {
  selectedTeamId: string | null;
  onSelectTeam: (id: string) => void;
}

export function AppSidebar({ selectedTeamId, onSelectTeam }: AppSidebarProps) {
  const navigate = useNavigate();
  const { data: teams = [] } = useTeams();
  const createTeam = useCreateTeam();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isRollyActive = location.pathname === "/rolly";
  const { isArtistRole, isGuestRole, assignedArtistIds } = useSelectedTeam();

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      const team = await createTeam.mutateAsync({ name: newTeamName.trim() });
      onSelectTeam(team.id);
      setShowCreateTeam(false);
      setNewTeamName("");
      toast.success("Team created!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const navItems = (() => {
    if (isArtistRole) {
      const artistHome = assignedArtistIds.length > 0 ? `/roster/${assignedArtistIds[0]}` : "/roster";
      return [
        { to: artistHome, icon: Building2, label: "My Artist", tourId: "nav-artists" },
        { to: "/my-work", icon: CheckCheck, label: "My Work", tourId: "nav-mywork" },
      ];
    }
    if (isGuestRole) {
      return [
        { to: "/roster", icon: LayoutGrid, label: "Artists", tourId: "nav-artists" },
      ];
    }
    return [
      { to: "/overview", icon: Building2, label: "Company", tourId: "nav-company" },
      { to: "/roster", icon: LayoutGrid, label: "Artists", tourId: "nav-artists" },
      { to: "/distribution", icon: Disc3, label: "Distribution", tourId: "nav-distribution" },
      { to: "/my-work", icon: CheckCheck, label: "My Work", tourId: "nav-mywork" },
    ];
  })();

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
        <SidebarContent className="flex flex-col h-full p-0">
          {/* Logo — crossfade between flag and full logo */}
          <div
            className="flex items-center justify-center cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative"
            style={{
              padding: collapsed ? "16px 0 8px" : "16px 16px 8px",
              minHeight: collapsed ? "56px" : undefined,
            }}
            onClick={() => navigate("/roster")}
          >
            <img
              src={rolloutFlag}
              alt="Rollout"
              className="absolute"
              style={{
                width: "32px",
                height: "32px",
                objectFit: "contain",
                opacity: collapsed ? 1 : 0,
                transform: collapsed ? "scale(1)" : "scale(0.8)",
                transition: collapsed
                  ? "opacity 250ms ease 150ms, transform 250ms ease 150ms"
                  : "opacity 150ms ease, transform 150ms ease",
              }}
            />
            <img
              src={rolloutLogo}
              alt="Rollout"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                opacity: collapsed ? 0 : 1,
                transform: collapsed ? "scale(0.8)" : "scale(1)",
                transition: collapsed
                  ? "opacity 150ms ease, transform 150ms ease"
                  : "opacity 250ms ease 150ms, transform 250ms ease 150ms",
              }}
            />
          </div>

          {/* Team Switcher — unified for both states */}
          <div
            className="transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex justify-center"
            style={{ padding: collapsed ? "0 0 8px" : "0 12px 8px" }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-tour="team-switcher"
                  className={`flex items-center gap-2 rounded-md text-sm hover:bg-accent transition-colors ${collapsed ? "justify-center w-8 h-8 p-0" : "w-full px-2 py-1.5"}`}
                >
                   <div className={`flex items-center justify-center rounded-md bg-muted text-xs font-semibold shrink-0 overflow-hidden ${collapsed ? "h-8 w-8" : "h-7 w-7"}`}>
                     {selectedTeam?.avatar_url ? (
                       <img src={selectedTeam.avatar_url} alt="" className="h-full w-full object-cover" />
                     ) : (
                       selectedTeam?.name?.[0] ?? "?"
                     )}
                   </div>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate text-foreground">
                        {selectedTeam?.name ?? "Select team"}
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={collapsed ? "right" : "bottom"} align="start" className="w-48">
                {teams.map((team) => (
                  <DropdownMenuItem key={team.id} onClick={() => onSelectTeam(team.id)}>
                    {team.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => setShowCreateTeam(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nav — all items center-aligned in collapsed via SidebarMenuButton's built-in !size-8 */}
          <SidebarMenu
            className="transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ padding: collapsed ? "0 8px" : "0 12px" }}
          >
            {navItems.map((item) => (
              <SidebarMenuItem key={item.to} className={collapsed ? "flex justify-center" : ""}>
                <SidebarMenuButton asChild tooltip={collapsed ? item.label : undefined}>
                  <NavLink to={item.to} className={`hover:bg-accent ${collapsed ? "justify-center" : ""}`} activeClassName="bg-accent font-medium" data-tour={item.tourId}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          {/* Bottom: Rolly + collapse toggle */}
          <div
            className="mt-auto transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col items-center"
            style={{
              padding: collapsed ? "12px 8px" : "12px",
            }}
          >
            {/* Rolly card — hidden for guest role */}
            {!isGuestRole && <div className={cn("mb-4", collapsed ? "flex justify-center" : "w-full")}>
              {!collapsed ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate("/rolly")}
                  className={cn(
                    "group w-full flex items-center gap-2.5 rounded-xl px-4 py-3.5 text-sm font-medium transition-all bg-foreground text-background hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:ring-2 hover:ring-primary/50",
                    isRollyActive && "ring-2 ring-primary ring-offset-2 ring-offset-sidebar"
                  )}
                >
                  <img 
                    src={rollyIcon} 
                    alt="ROLLY" 
                    className="h-7 w-7 rounded-full shrink-0 object-contain invert dark:invert-0 transition-transform duration-500 ease-linear group-hover:rotate-180"
                  />
                  <span>Rolly</span>
                </motion.button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => navigate("/rolly")}
                      className={cn(
                        "group size-10 flex shrink-0 items-center justify-center rounded-xl transition-all bg-foreground text-background hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:ring-2 hover:ring-primary/50",
                        isRollyActive && "ring-2 ring-primary ring-offset-2 ring-offset-sidebar"
                      )}
                    >
                      <img 
                        src={rollyIcon} 
                        alt="ROLLY" 
                        className="h-6 w-6 shrink-0 object-contain invert dark:invert-0 transition-transform duration-500 ease-linear group-hover:rotate-180"
                      />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Rolly</TooltipContent>
                </Tooltip>
              )}
            </div>}

            {/* Collapse toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="flex items-center rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  style={{
                    padding: "6px 8px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: collapsed ? "0" : "8px",
                    width: collapsed ? "auto" : "100%",
                  }}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4 shrink-0" />
                  ) : (
                    <>
                      <PanelRightOpen className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">Collapse</span>
                    </>
                  )}
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Expand</TooltipContent>}
            </Tooltip>
          </div>
        </SidebarContent>
      </Sidebar>

      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create team</DialogTitle>
            <DialogDescription>Add a new team to manage artists.</DialogDescription>
          </DialogHeader>
          <Input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Team name"
            onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
            <Button onClick={handleCreateTeam} disabled={createTeam.isPending}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
