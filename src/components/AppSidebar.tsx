import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Plus, ChevronsUpDown, Building2, ClipboardList, Users, Radar, CheckCheck, PanelLeftOpen, PanelRightOpen } from "lucide-react";
import rolloutLogo from "@/assets/rollout-logo.png";
import rolloutFlag from "@/assets/rollout-flag.svg";
import { NavLink } from "@/components/NavLink";
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

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      const team = await createTeam.mutateAsync(newTeamName.trim());
      onSelectTeam(team.id);
      setShowCreateTeam(false);
      setNewTeamName("");
      toast.success("Team created!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const navItems = [
    { to: "/overview", icon: Building2, label: "Label" },
    { to: "/roster", icon: LayoutGrid, label: "Roster" },
    { to: "/my-work", icon: CheckCheck, label: "My Work" },
    { to: "/agenda", icon: ClipboardList, label: "Agenda" },
    { to: "/staff", icon: Users, label: "Staff" },
    { to: "/ar", icon: Radar, label: "A&R" },
  ];

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
        <SidebarContent className="flex flex-col h-full p-0">
          {/* Logo */}
          <div
            className="px-4 pt-4 pb-2 cursor-pointer flex items-center justify-center"
            onClick={() => navigate("/roster")}
          >
            {collapsed ? (
              <img src={rolloutFlag} alt="Rollout" className="w-6 h-6 object-contain" />
            ) : (
              <img src={rolloutLogo} alt="Rollout" className="w-full" />
            )}
          </div>

          {/* Team Switcher */}
          {!collapsed && (
            <div className="px-3 pb-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium shrink-0">
                      {selectedTeam?.name?.[0] ?? "?"}
                    </div>
                    <span className="flex-1 text-left truncate text-foreground">
                      {selectedTeam?.name ?? "Select team"}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
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
          )}

          {collapsed && (
            <div className="flex justify-center pb-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-medium hover:bg-accent transition-colors">
                    {selectedTeam?.name?.[0] ?? "?"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-48">
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
          )}

          {/* Nav */}
          <SidebarMenu className={collapsed ? "px-2" : "px-3"}>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild tooltip={collapsed ? item.label : undefined}>
                  <NavLink to={item.to} className="hover:bg-accent" activeClassName="bg-accent font-medium">
                    <item.icon className={collapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          {/* Bottom: collapse toggle + add button */}
          <div className="mt-auto p-3 space-y-2">
            <button
              onClick={toggleSidebar}
              className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              {!collapsed && <span className="flex-1 text-left">Collapse</span>}
            </button>

            {!collapsed ? (
              <Button
                className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add
                <ChevronsUpDown className="ml-auto h-3.5 w-3.5" />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90"
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Add</TooltipContent>
              </Tooltip>
            )}
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
