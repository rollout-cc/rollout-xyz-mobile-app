import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { AppLayout } from "@/components/AppLayout";
import { useArtists, useCreateArtist } from "@/hooks/useArtists";
import { useCreateTeam } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useRosterFolders, useCreateRosterFolder, useDeleteRosterFolder, useSetArtistFolder, useReorderArtistsInFolder } from "@/hooks/useRosterFolders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderPlus, ArrowLeft } from "lucide-react";
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
  const reorderArtists = useReorderArtistsInFolder();

  const [showAddArtist, setShowAddArtist] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
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
      if (selectedFolderId === id) setSelectedFolderId(null);
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const artistId = result.draggableId;
    const destId = result.destination.droppableId;
    if (destId.startsWith("folder-")) {
      const folderId = destId.replace("folder-", "");
      setArtistFolder.mutate({ artistId, folderId });
    }
  };

  const uncategorizedArtists = artists.filter((a: any) => !a.folder_id);
  const selectedFolder = selectedFolderId ? folders.find((f: any) => f.id === selectedFolderId) : null;
  const folderArtists = selectedFolderId
    ? artists.filter((a: any) => a.folder_id === selectedFolderId).sort((a: any, b: any) => (a.folder_sort_order ?? 0) - (b.folder_sort_order ?? 0))
    : [];

  const handleFolderDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const reordered = [...folderArtists];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updates = reordered.map((a: any, i: number) => ({ id: a.id, folder_sort_order: i }));
    reorderArtists.mutate(updates);
  };

  // Folder detail view
  if (selectedFolderId && selectedFolder) {
    return (
      <AppLayout
        title="Roster"
        actions={
          <Button onClick={() => setShowAddArtist(true)} size="sm" className="gap-1 hidden sm:inline-flex">
            Add Artist
          </Button>
        }
      >
        <div className="mb-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedFolderId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">{selectedFolder.name}</h2>
        </div>

        {folderArtists.length === 0 ? (
          <p className="text-muted-foreground text-sm">No artists in this category yet.</p>
        ) : (
          <DragDropContext onDragEnd={handleFolderDragEnd}>
            <Droppable droppableId="folder-detail">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {folderArtists.map((artist: any, index: number) => (
                    <Draggable key={artist.id} draggableId={artist.id} index={index}>
                      {(dragProvided) => (
                        <ArtistCard
                          artist={artist}
                          onClick={() => navigate(`/roster/${artist.id}`)}
                          innerRef={dragProvided.innerRef}
                          draggableProps={dragProvided.draggableProps}
                          dragHandleProps={dragProvided.dragHandleProps ?? undefined}
                          insideFolder
                          onRemoveFromFolder={() => handleRemoveArtistFromFolder(artist.id)}
                        />
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

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

  // Main roster view with DnD
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
          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Folder cards as droppable targets */}
            {folders.length > 0 && (
              <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {folders.map((folder: any) => {
                    const fArtists = artists.filter((a: any) => a.folder_id === folder.id);
                    return (
                      <Droppable key={folder.id} droppableId={`folder-${folder.id}`}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}>
                            <RosterFolderCard
                              folder={folder}
                              artists={fArtists}
                              allArtists={artists}
                              onAddArtist={(artistId) => handleAddArtistToFolder(artistId, folder.id)}
                              onRemoveArtist={handleRemoveArtistFromFolder}
                              onDelete={() => handleDeleteFolder(folder.id)}
                              onClick={() => setSelectedFolderId(folder.id)}
                              isDraggingOver={snapshot.isDraggingOver}
                            />
                            <div className="hidden">{provided.placeholder}</div>
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Uncategorized artists as draggables */}
            {uncategorizedArtists.length > 0 && (
              <Droppable droppableId="uncategorized" isDropDisabled>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {folders.length > 0 && (
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">All Artists</h3>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {uncategorizedArtists.map((artist: any, index: number) => (
                        <Draggable key={artist.id} draggableId={artist.id} index={index}>
                          {(dragProvided) => (
                            <ArtistCard
                              artist={artist}
                              onClick={() => navigate(`/roster/${artist.id}`)}
                              innerRef={dragProvided.innerRef}
                              draggableProps={dragProvided.draggableProps}
                              dragHandleProps={dragProvided.dragHandleProps ?? undefined}
                            />
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </DragDropContext>
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
