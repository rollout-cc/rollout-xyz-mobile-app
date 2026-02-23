import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useArtistDetail } from "@/hooks/useArtistDetail";
import { useSpotifyArtist } from "@/hooks/useSpotifyArtist";
import { ArtistInfoTab } from "@/components/artist/ArtistInfoTab";
import { WorkTab } from "@/components/artist/WorkTab";
import { LinksTab } from "@/components/artist/LinksTab";
import { TimelinesTab } from "@/components/artist/TimelinesTab";
import { BudgetSection, useTotalBudget } from "@/components/artist/BudgetSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ArtistDetail() {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const { data: artist, isLoading } = useArtistDetail(artistId!);
  const { data: spotifyData } = useSpotifyArtist(artist?.spotify_id);
  const totalBudget = useTotalBudget(artistId!);

  if (isLoading) {
    return (
      <AppLayout title="Artist">
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  if (!artist) {
    return (
      <AppLayout title="Artist">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Artist not found</p>
          <Button variant="outline" onClick={() => navigate("/roster")}>Back to Roster</Button>
        </div>
      </AppLayout>
    );
  }

  // Use Spotify banner if available, otherwise artist's stored banner
  const bannerUrl = spotifyData?.banner_url || artist.banner_url;
  const monthlyListeners = spotifyData?.followers ?? 0;
  const completedCount = 0; // will be filled by query if needed

  return (
    <AppLayout
      title=""
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate("/roster")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Roster
        </Button>
      }
    >
      {/* Banner */}
      <div className="relative h-48 rounded-lg bg-muted overflow-hidden mb-4">
        {bannerUrl && (
          <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
          <div className="flex items-end gap-3">
            <Avatar className="h-16 w-16 border-2 border-background">
              <AvatarImage src={artist.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">{artist.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-white drop-shadow-sm">{artist.name}</h2>
              <div className="flex items-center gap-3 text-sm text-white/80">
                {artist.genres?.length > 0 && (
                  <span>🎵 {artist.genres.slice(0, 3).join(", ")}</span>
                )}
                {monthlyListeners > 0 && (
                  <span>{monthlyListeners.toLocaleString()} monthly listeners</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/90">
            {totalBudget > 0 && (
              <span className="font-medium">Budget: ${totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            )}
          </div>
        </div>
      </div>

      {/* Budget + Info at top */}
      <div className="mb-6 p-4 rounded-lg border border-border">
        <BudgetSection artistId={artist.id} />
      </div>

      <Tabs defaultValue="work" className="w-full">
        <TabsList>
          <TabsTrigger value="work">Work</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="timelines">Timelines</TabsTrigger>
        </TabsList>

        <TabsContent value="work">
          <WorkTab artistId={artist.id} teamId={artist.team_id} />
        </TabsContent>
        <TabsContent value="info">
          <ArtistInfoTab artist={artist} />
        </TabsContent>
        <TabsContent value="links">
          <LinksTab artistId={artist.id} />
        </TabsContent>
        <TabsContent value="timelines">
          <TimelinesTab artistId={artist.id} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
