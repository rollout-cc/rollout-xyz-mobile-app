import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useArtists, useCreateArtist } from "@/hooks/useArtists";
import { useCreateTeam } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
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
import { PullToRefresh } from "@/components/PullToRefresh";
import { MobileFAB } from "@/components/MobileFAB";
import { useQueryClient } from "@tanstack/react-query";

export default function Roster() {
  const navigate = useNavigate();
  const { selectedTeamId } = useSelectedTeam();
  const { data: artists = [], isLoading } = useArtists(selectedTeamId);
  const createArtist = useCreateArtist();
  const createTeam = useCreateTeam();

  const [showAddArtist, setShowAddArtist] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["artists"] });
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
        <Button onClick={() => setShowAddArtist(true)} size="sm" className="gap-1 hidden sm:inline-flex">
          Add Artist
        </Button>
      }
    >
      <PullToRefresh onRefresh={handleRefresh}>
        {artists.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <p className="text-muted-foreground">Add artists to your roster</p>
            <Button onClick={() => setShowAddArtist(true)}>Add Artist</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {artists.map((artist: any) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                onClick={() => navigate(`/roster/${artist.id}`)}
              />
            ))}
          </div>
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
