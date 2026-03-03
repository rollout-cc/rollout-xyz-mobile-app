import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useSplitProjects, useDeleteSplitProject, useCreateSplitBatch } from "@/hooks/useSplits";
import { SplitProjectCard } from "./SplitProjectCard";
import { SplitWizard } from "./SplitWizard";
import { toast } from "sonner";

interface Props {
  artistId: string;
  teamId: string;
}

export function SplitsTab({ artistId, teamId }: Props) {
  const { data: projects = [], isLoading } = useSplitProjects(artistId);
  const deleteProject = useDeleteSplitProject();
  const createBatch = useCreateSplitBatch();

  const [showWizard, setShowWizard] = useState(false);

  const handleWizardComplete = async (data: {
    releaseType: string;
    releaseName: string;
    songs: { title: string; contributors: any[] }[];
  }) => {
    try {
      await createBatch.mutateAsync({
        artistId,
        teamId,
        releaseType: data.releaseType,
        releaseName: data.releaseName,
        songs: data.songs,
      });
      setShowWizard(false);
      toast.success("Split sheet created");
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
      {projects.length > 0 && !showWizard && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Split Sheets</h3>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowWizard(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Release
          </Button>
        </div>
      )}

      {showWizard && (
        <SplitWizard
          artistId={artistId}
          teamId={teamId}
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {projects.length === 0 && !showWizard && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-muted-foreground text-sm max-w-md">
            Track master and publishing ownership for every song. Add a release to start building split sheets and send them to contributors for approval.
          </p>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowWizard(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Release
          </Button>
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
