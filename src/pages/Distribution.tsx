import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Disc3, Music, MoreHorizontal, Trash2 } from "lucide-react";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useReleases, useDeleteRelease } from "@/hooks/useReleases";
import { useArtists } from "@/hooks/useArtists";
import { ReleaseWizard } from "@/components/distribution/ReleaseWizard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-primary/10 text-primary",
  submitted: "bg-green-500/10 text-green-600",
};

export default function Distribution() {
  const { selectedTeamId } = useSelectedTeam();
  const { data: releases = [], isLoading } = useReleases(selectedTeamId);
  const { data: artists = [] } = useArtists(selectedTeamId);
  const deleteRelease = useDeleteRelease();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingReleaseId, setEditingReleaseId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!selectedTeamId) return;
    try {
      await deleteRelease.mutateAsync({ id, teamId: selectedTeamId });
      toast.success("Release deleted");
    } catch {
      toast.error("Failed to delete release");
    }
  };

  if (wizardOpen || editingReleaseId) {
    return (
      <AppLayout title="Distribution">
        <ReleaseWizard
          teamId={selectedTeamId!}
          artists={artists}
          releaseId={editingReleaseId ?? undefined}
          onClose={() => {
            setWizardOpen(false);
            setEditingReleaseId(null);
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2">
              <Disc3 className="h-6 w-6" />
              Distribution
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Prepare releases, validate rights, and get split approvals
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Release
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : releases.length === 0 ? (
          <Card className="p-12 text-center">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-foreground mb-1">No releases yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first release to start the distribution process
            </p>
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Release
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {releases.map((release: any) => (
              <Card
                key={release.id}
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setEditingReleaseId(release.id)}
              >
                {release.artwork_url ? (
                  <img
                    src={release.artwork_url}
                    alt=""
                    className="h-14 w-14 rounded-md object-cover shrink-0"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Disc3 className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {release.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {release.artist?.name} · {release.release_type}
                    {release.release_date && ` · ${release.release_date}`}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={statusColors[release.status] || ""}
                >
                  {release.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(release.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
