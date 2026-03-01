import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useArtists, useCreateArtist } from "@/hooks/useArtists";
import { useCreateTeam } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useRosterFolders, useCreateRosterFolder, useDeleteRosterFolder, useSetArtistFolder } from "@/hooks/useRosterFolders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { ArtistCard } from "@/components/roster/ArtistCard";
import { RosterFolderCard } from "@/components/roster/RosterFolderCard";
import { AddArtistDialog } from "@/components/roster/AddArtistDialog";
import { PullToRefresh } from "@/components/PullToRefresh";
import { MobileFAB } from "@/components/MobileFAB";
import { useQueryClient } from "@tanstack/react-query";

export default function Roster() {
  const navigate = useNavigate();
  const { selectedTeamId } = useSelectedTeam();
  const { data: artists = [], isLoading } = useArtists(selectedTeamId);
  const { data: folders = [] } = useRosterFolders(selectedTeamId);
  const createArtist = useCreateArtist();
  const createTeam = useCreateTeam();
  const createFolder = useCreateRosterFolder();
  const deleteFolder = useDeleteRosterFolder();
  const setArtistFolder = useSetArtistFolder();

  const [showAddArtist, setShowAddArtist] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["artists"] });
    await queryClient.invalidateQueries({ queryKey: ["roster-folders"] });
  }, [queryClient]);

  const handleFABAction = useCallback((key: string) => {
    if (key === "add-artist") setShowAddArtist(true);
  }, []);

  const existingSpotifyIds = useMemo(
    () => new Set(artists.map((a: any) => a.spotify_id).filter(Boolean)),
    [artists]
  );

  const ensureTeam = async (): Promise<string> => {
    if (selectedTeamId) return selectedTeamId;
    const team = await createTeam.mutateAsync({ name: "My Team" });
    return team.id;
  };

  const handleAddToRoster = async (artist: { id: string; name: string; genres: string[]; images: { url: string }[] }) => {
    try {
      const teamId = await ensureTeam();
      await createArtist.mutateAsync({
        team_id: teamId,
        name: artist.name,
        avatar_url: artist.images?.[0]?.url,
        spotify_id: artist.id,
        genres: artist.genres,
      });
      toast.success(`${artist.name} added!`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateManual = async (name: string) => {
    try {
      const teamId = await ensureTeam();
      await createArtist.mutateAsync({ team_id: teamId, name });
      toast.success(`${name} created!`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name || !selectedTeamId) return;
    try {
      await createFolder.mutateAsync({ teamId: selectedTeamId, name });
      toast.success(`Folder "${name}" created`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setNewFolderName("");
    setCreatingFolder(false);
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      await deleteFolder.mutateAsync(id);
      toast.success("Folder deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddArtistToFolder = (artistId: string, folderId: string) => {
    setArtistFolder.mutate({ artistId, folderId });
  };

  const handleRemoveArtistFromFolder = (artistId: string) => {
    setArtistFolder.mutate({ artistId, folderId: null });
  };

  // Artists not in any folder
  const uncategorizedArtists = artists.filter((a: any) => !a.folder_id);

  return (
    <AppLayout
      title="Roster"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 hidden sm:inline-flex"
            onClick={() => {
              setCreatingFolder(true);
              setTimeout(() => folderInputRef.current?.focus(), 50);
            }}
          >
            <FolderPlus className="h-3.5 w-3.5" /> Category
          </Button>
          <Button onClick={() => setShowAddArtist(true)} size="sm" className="gap-1 hidden sm:inline-flex">
            Add Artist
          </Button>
        </div>
      }
    >
      <PullToRefresh onRefresh={handleRefresh}>
        {/* Inline folder creation */}
        {creatingFolder && (
          <div className="mb-4">
            <Input
              ref={folderInputRef}
              placeholder="Category name, e.g. Southern Hip Hop"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
              }}
              onBlur={() => {
                if (newFolderName.trim()) handleCreateFolder();
                else { setCreatingFolder(false); setNewFolderName(""); }
              }}
              className="max-w-sm"
            />
          </div>
        )}

        {artists.length === 0 && !isLoading && folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <p className="text-muted-foreground">Add artists to your roster</p>
            <Button onClick={() => setShowAddArtist(true)}>Add Artist</Button>
          </div>
        ) : (
          <>
            {/* Folder cards */}
            {folders.length > 0 && (
              <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {folders.map((folder: any) => {
                    const folderArtists = artists.filter((a: any) => a.folder_id === folder.id);
                    return (
                      <RosterFolderCard
                        key={folder.id}
                        folder={folder}
                        artists={folderArtists}
                        allArtists={artists}
                        onAddArtist={(artistId) => handleAddArtistToFolder(artistId, folder.id)}
                        onRemoveArtist={handleRemoveArtistFromFolder}
                        onDelete={() => handleDeleteFolder(folder.id)}
                        onClick={() => {/* Could navigate to folder detail */}}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Uncategorized artists */}
            {uncategorizedArtists.length > 0 && (
              <div>
                {folders.length > 0 && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">All Artists</h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uncategorizedArtists.map((artist: any) => (
                    <ArtistCard
                      key={artist.id}
                      artist={artist}
                      onClick={() => navigate(`/roster/${artist.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </PullToRefresh>

      <MobileFAB onAction={handleFABAction} />

      <AddArtistDialog
        open={showAddArtist}
        onOpenChange={setShowAddArtist}
        existingSpotifyIds={existingSpotifyIds}
        onAdd={handleAddToRoster}
        onCreateManual={handleCreateManual}
      />
    </AppLayout>
  );
}
