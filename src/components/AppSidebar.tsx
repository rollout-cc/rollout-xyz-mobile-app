import { useState } from "react";
import { LayoutGrid, ListTodo, Plus, ChevronsUpDown } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
import { useTeams, useCreateTeam } from "@/hooks/useTeams";
import { toast } from "sonner";

interface AppSidebarProps {
  selectedTeamId: string | null;
  onSelectTeam: (id: string) => void;
}

export function AppSidebar({ selectedTeamId, onSelectTeam }: AppSidebarProps) {
  const { data: teams = [] } = useTeams();
  const createTeam = useCreateTeam();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

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

  return (
    <>
      <Sidebar className="w-44 border-r border-border bg-sidebar">
        <SidebarContent className="flex flex-col h-full p-0">
          {/* Logo */}
          <div className="px-4 pt-4 pb-2">
            <h1
              className="text-2xl font-black tracking-tighter text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              ROLLOUT<span>.</span>📢
            </h1>
          </div>

          {/* Team Switcher */}
          <div className="px-3 pb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium">
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

          {/* Nav */}
          <SidebarMenu className="px-3">
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/roster" className="hover:bg-accent" activeClassName="bg-accent font-medium">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Roster
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/tasks" className="hover:bg-accent" activeClassName="bg-accent font-medium">
                  <ListTodo className="mr-2 h-4 w-4" />
                  Tasks
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="mt-auto p-3">
            <Button
              className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add
              <ChevronsUpDown className="ml-auto h-3.5 w-3.5" />
            </Button>
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
