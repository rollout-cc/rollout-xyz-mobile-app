import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useArtists, useCreateArtist } from "@/hooks/useArtists";
import { useTeams, useCreateTeam } from "@/hooks/useTeams";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, User, CheckCircle, Clock, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArtistCard } from "@/components/roster/ArtistCard";
import { AddArtistDialog } from "@/components/roster/AddArtistDialog";

export default function Roster() {
  const navigate = useNavigate();
  const { data: teams = [] } = useTeams();
  const selectedTeamId = teams[0]?.id ?? null;
  const { data: artists = [], isLoading } = useArtists(selectedTeamId);
  const createArtist = useCreateArtist();
  const createTeam = useCreateTeam();

  const [showAddArtist, setShowAddArtist] = useState(false);

  const existingSpotifyIds = useMemo(
    () => new Set(artists.map((a: any) => a.spotify_id).filter(Boolean)),
    [artists]
  );

  const ensureTeam = async (): Promise<string> => {
    if (selectedTeamId) return selectedTeamId;
    const team = await createTeam.mutateAsync("My Team");
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
            <ArtistCard
              key={artist.id}
              artist={artist}
              onClick={() => navigate(`/roster/${artist.id}`)}
            />
          ))}
        </div>
      )}

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
