import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { AppLayout } from "@/components/AppLayout";
import { ARContent } from "@/components/ar/ARContent";
import { useArtists, useCreateArtist, useDeleteArtist } from "@/hooks/useArtists";
import { useCreateTeam } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useRosterFolders, useCreateRosterFolder, useDeleteRosterFolder, useSetArtistFolder } from "@/hooks/useRosterFolders";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { TrialWelcomeDialog } from "@/components/billing/TrialWelcomeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderPlus, ArrowLeft, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArtistCard } from "@/components/roster/ArtistCard";
import { RosterFolderCard } from "@/components/roster/RosterFolderCard";
import { AddArtistDialog } from "@/components/roster/AddArtistDialog";
import { PullToRefresh } from "@/components/PullToRefresh";
import { MobileFAB } from "@/components/MobileFAB";
import { useQueryClient } from "@tanstack/react-query";

type SortOption = "a-z" | "z-a" | "listeners-high" | "listeners-low" | "spent-high" | "spent-low";

function getArtistSpending(artist: any): number {
  return (artist.transactions || [])
    .filter((t: any) => t.type === "expense")
    .reduce((s: number, t: any) => s + Math.abs(Number(t.amount || 0)), 0);
}

function sortArtists(list: any[], sort: SortOption): any[] {
  const sorted = [...list];
  switch (sort) {
    case "a-z":
      return sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    case "z-a":
      return sorted.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    case "listeners-high":
      return sorted.sort((a, b) => (b.monthly_listeners ?? 0) - (a.monthly_listeners ?? 0));
    case "listeners-low":
      return sorted.sort((a, b) => (a.monthly_listeners ?? 0) - (b.monthly_listeners ?? 0));
    case "spent-high":
      return sorted.sort((a, b) => getArtistSpending(b) - getArtistSpending(a));
    case "spent-low":
      return sorted.sort((a, b) => getArtistSpending(a) - getArtistSpending(b));
    default:
      return sorted;
  }
}

export default function Roster() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedTeamId } = useSelectedTeam();
  const { data: artists = [], isLoading } = useArtists(selectedTeamId);
  const { data: folders = [] } = useRosterFolders(selectedTeamId);
  const createArtist = useCreateArtist();
  const deleteArtist = useDeleteArtist();
  const createTeam = useCreateTeam();
  const createFolder = useCreateRosterFolder();
  const deleteFolder = useDeleteRosterFolder();
  const setArtistFolder = useSetArtistFolder();
  const { limits, isTrialing, trialDaysLeft } = useTeamPlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Show trial welcome dialog on first visit after signup
  const [trialWelcomeOpen, setTrialWelcomeOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("rollout_trial_welcome_shown");
  });

  useEffect(() => {
    if (!trialWelcomeOpen) {
      localStorage.setItem("rollout_trial_welcome_shown", "1");
    }
  }, [trialWelcomeOpen]);

  const [activeTab, setActiveTab] = useState<"roster" | "ar">(searchParams.get("tab") === "ar" ? "ar" : "roster");
  const [showAddArtist, setShowAddArtist] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(searchParams.get("folder"));
  const [sortBy, setSortBy] = useState<SortOption>("a-z");
  const folderInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["artists"] });
    await queryClient.invalidateQueries({ queryKey: ["roster-folders"] });
  }, [queryClient]);

  const handleFABAction = useCallback((key: string) => {
    if (key === "add-artist") {
      if (limits.maxArtists !== null && artists.length >= limits.maxArtists) {
        setUpgradeOpen(true);
        return;
      }
      setShowAddArtist(true);
    }
  }, [limits.maxArtists, artists.length]);

  const handleOpenAddArtist = () => {
    if (limits.maxArtists !== null && artists.length >= limits.maxArtists) {
      setUpgradeOpen(true);
      return;
    }
    setShowAddArtist(true);
  };

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

  const handleDeleteArtist = async (artistId: string, artistName: string) => {
    if (!selectedTeamId) return;
    try {
      await deleteArtist.mutateAsync({ id: artistId, teamId: selectedTeamId });
      toast.success(`${artistName} deleted`);
    } catch (err: any) {
      toast.error(err.message);
    }
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

  const uncategorizedArtists = useMemo(() => sortArtists(artists.filter((a: any) => !a.folder_id), sortBy), [artists, sortBy]);
  const selectedFolder = selectedFolderId ? folders.find((f: any) => f.id === selectedFolderId) : null;
  const folderArtists = useMemo(() => {
    if (!selectedFolderId) return [];
    return sortArtists(artists.filter((a: any) => a.folder_id === selectedFolderId), sortBy);
  }, [artists, selectedFolderId, sortBy]);

  const SortSelect = (
    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
      <SelectTrigger className="w-[170px] h-8 text-xs">
        <ArrowUpDown className="h-3 w-3 mr-1.5 shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a-z">A → Z</SelectItem>
        <SelectItem value="z-a">Z → A</SelectItem>
        <SelectItem value="listeners-high">Highest Listeners</SelectItem>
        <SelectItem value="listeners-low">Lowest Listeners</SelectItem>
        <SelectItem value="spent-high">Most Spent</SelectItem>
        <SelectItem value="spent-low">Least Spent</SelectItem>
      </SelectContent>
    </Select>
  );

  // Folder detail view
  if (selectedFolderId && selectedFolder) {
    return (
      <AppLayout title="Artists">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedFolderId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">{selectedFolder.name}</h2>
          </div>
          <Button onClick={handleOpenAddArtist} size="sm" className="gap-1 hidden sm:inline-flex">
            Add Artist
          </Button>
        </div>
        <div className="mb-4">
          {SortSelect}
        </div>

        {folderArtists.length === 0 ? (
          <p className="text-muted-foreground text-sm">No artists in this category yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {folderArtists.map((artist: any) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                onClick={() => navigate(`/roster/${artist.id}`)}
                onEdit={() => navigate(`/roster/${artist.id}`)}
                onDelete={() => handleDeleteArtist(artist.id, artist.name)}
                insideFolder
                onRemoveFromFolder={() => handleRemoveArtistFromFolder(artist.id)}
              />
            ))}
          </div>
        )}

        <MobileFAB onAction={handleFABAction} />
        <AddArtistDialog
          open={showAddArtist}
          onOpenChange={setShowAddArtist}
          existingSpotifyIds={existingSpotifyIds}
          onAdd={handleAddToRoster}
          onCreateManual={handleCreateManual}
        />
        <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="More than 3 roster artists" />
      </AppLayout>
    );
  }

  // Main roster view with DnD
  return (
    <AppLayout title="Artists">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5">
        <button
          onClick={() => setActiveTab("roster")}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            activeTab === "roster" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          )}
        >
          Current Roster
        </button>
        <button
          onClick={() => setActiveTab("ar")}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            activeTab === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          )}
        >
          A&R Signings
        </button>
      </div>

      {activeTab === "ar" ? (
        <ARContent />
      ) : (
      <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {SortSelect}
        </div>
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
          <Button onClick={handleOpenAddArtist} size="sm" className="gap-1 hidden sm:inline-flex">
            Add Artist
          </Button>
        </div>
      </div>
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
            <Button onClick={handleOpenAddArtist}>Add Artist</Button>
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
                              onOpenAddDialog={handleOpenAddArtist}
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
                              onEdit={() => navigate(`/roster/${artist.id}`)}
                              onDelete={() => handleDeleteArtist(artist.id, artist.name)}
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
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="More than 3 roster artists" />
      <TrialWelcomeDialog open={trialWelcomeOpen} onOpenChange={setTrialWelcomeOpen} />
      </>
      )}
    </AppLayout>
  );
}
