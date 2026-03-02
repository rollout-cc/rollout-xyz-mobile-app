import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useSplitProjects, useCreateSplitProject, useDeleteSplitProject } from "@/hooks/useSplits";
import { SplitProjectCard } from "./SplitProjectCard";
import { toast } from "sonner";

interface Props {
  artistId: string;
  teamId: string;
}

export function SplitsTab({ artistId, teamId }: Props) {
  const { data: projects = [], isLoading } = useSplitProjects(artistId);
  const createProject = useCreateSplitProject();
  const deleteProject = useDeleteSplitProject();

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("single");

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createProject.mutateAsync({ artist_id: artistId, name, project_type: newType });
      setNewName("");
      setShowNew(false);
      toast.success("Project created");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject.mutateAsync({ id, artistId });
      toast.success("Project deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="text-muted-foreground text-sm py-8 text-center">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Split Sheets</h3>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowNew(!showNew)}>
          <Plus className="h-3.5 w-3.5" /> New Project
        </Button>
      </div>

      {showNew && (
        <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/30">
          <Input
            placeholder="Project name (e.g. Love Gun II)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            className="h-8 text-sm"
            autoFocus
          />
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="ep">EP</SelectItem>
              <SelectItem value="album">Album</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={handleCreate}>Create</Button>
        </div>
      )}

      {projects.length === 0 && !showNew && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No split projects yet. Create one to start tracking ownership.
        </div>
      )}

      {projects.map((project: any) => (
        <SplitProjectCard
          key={project.id}
          project={project}
          teamId={teamId}
          onDelete={() => handleDelete(project.id)}
        />
      ))}
    </div>
  );
}
