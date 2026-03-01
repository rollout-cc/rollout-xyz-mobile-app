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
                  className={`flex items-center gap-2 rounded-md text-sm hover:bg-accent transition-colors ${collapsed ? "justify-center w-8 h-8 p-0" : "w-full px-2 py-1.5"}`}
                >
                  <div className={`flex items-center justify-center rounded-md bg-muted text-xs font-semibold shrink-0 ${collapsed ? "h-8 w-8" : "h-7 w-7"}`}>
                    {selectedTeam?.name?.[0] ?? "?"}
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
                  <NavLink to={item.to} className={`hover:bg-accent ${collapsed ? "justify-center" : ""}`} activeClassName="bg-accent font-medium">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          {/* Bottom: collapse toggle + add button */}
          <div
            className="mt-auto space-y-1.5 transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col"
            style={{
              padding: collapsed ? "12px 8px" : "12px",
              alignItems: collapsed ? "center" : "stretch",
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="flex w-full items-center rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  style={{
                    padding: "6px 8px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: collapsed ? "0" : "8px",
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
