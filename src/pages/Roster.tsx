import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useArtists, useCreateArtist } from "@/hooks/useArtists";
import { useTeams } from "@/hooks/useTeams";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Plus, User, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string }[];
}

export default function Roster() {
  const { data: teams = [] } = useTeams();
  const selectedTeamId = teams[0]?.id ?? null;
  const { data: artists = [], isLoading } = useArtists(selectedTeamId);
  const createArtist = useCreateArtist();

  const [showAddArtist, setShowAddArtist] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyArtist[]>([]);
  const [searching, setSearching] = useState(false);

  // For now, Spotify search is a placeholder — we'll wire it up with an edge function
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    // TODO: Wire up Spotify search edge function
    setSearchResults([]);
  };

  const handleAddToRoster = async (artist: SpotifyArtist) => {
    if (!selectedTeamId) return;
    try {
      await createArtist.mutateAsync({
        team_id: selectedTeamId,
        name: artist.name,
        avatar_url: artist.images?.[0]?.url,
        spotify_id: artist.id,
        genres: artist.genres,
      });
      toast.success(`${artist.name} added to roster!`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateNewArtist = async () => {
    if (!selectedTeamId || !searchQuery.trim()) return;
    try {
      await createArtist.mutateAsync({
        team_id: selectedTeamId,
        name: searchQuery.trim(),
      });
      toast.success(`${searchQuery.trim()} created!`);
      setShowAddArtist(false);
      setSearchQuery("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getInitiativeCount = (artist: any) => {
    return artist.initiatives?.[0]?.count ?? 0;
  };

  const getTaskCount = (artist: any) => {
    return artist.tasks?.[0]?.count ?? 0;
  };

  const getBudgetTotal = (artist: any) => {
    if (!artist.budgets?.length) return 0;
    return artist.budgets.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
  };

  return (
    <AppLayout
      title="Roster"
      actions={
        <Button onClick={() => setShowAddArtist(true)} size="sm" className="gap-1">
          Add Artist
        </Button>
      }
    >
      {artists.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Add artists to your roster</p>
          <Button onClick={() => setShowAddArtist(true)}>Add Artist</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {artists.map((artist: any) => (
            <div
              key={artist.id}
              className="flex items-center gap-4 rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <Avatar className="h-14 w-14">
                <AvatarImage src={artist.avatar_url} alt={artist.name} />
                <AvatarFallback className="text-lg">{artist.name[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{artist.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {getInitiativeCount(artist)} initiative{getInitiativeCount(artist) !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                  <span className="text-muted-foreground">Open Tasks</span>
                  <span className="font-medium">{getTaskCount(artist) || "None"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                  <span className="text-muted-foreground">Upcoming Deadline</span>
                  <span className="font-medium">None</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Artist Dialog */}
      <Dialog open={showAddArtist} onOpenChange={setShowAddArtist}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Artist</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search for an artist"
              className="pl-9"
            />
          </div>

          <div className="min-h-[300px] flex flex-col">
            {searchResults.length > 0 ? (
              <div className="flex flex-col gap-2">
                {searchResults.map((result) => (
                  <div key={result.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={result.images?.[0]?.url} />
                      <AvatarFallback>{result.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{result.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Genre: {result.genres.join(", ") || "N/A"}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleAddToRoster(result)}>
                      Add to roster
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <User className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Search Spotify to add artists to your roster
                </p>
                <p className="text-sm text-muted-foreground">or</p>
                <Button onClick={handleCreateNewArtist} disabled={!searchQuery.trim()}>
                  Create New Artist
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
