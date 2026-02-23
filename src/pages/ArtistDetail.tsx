import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useArtistDetail } from "@/hooks/useArtistDetail";
import { ArtistInfoTab } from "@/components/artist/ArtistInfoTab";
import { CampaignsTab } from "@/components/artist/CampaignsTab";
import { TasksTab } from "@/components/artist/TasksTab";
import { LinksTab } from "@/components/artist/LinksTab";
import { TimelinesTab } from "@/components/artist/TimelinesTab";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ArtistDetail() {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const { data: artist, isLoading } = useArtistDetail(artistId!);

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
      <div className="relative h-40 rounded-lg bg-muted overflow-hidden mb-4">
        {artist.banner_url && (
          <img src={artist.banner_url} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute bottom-0 left-0 p-4 flex items-end gap-3">
          <Avatar className="h-16 w-16 border-2 border-background">
            <AvatarImage src={artist.avatar_url ?? undefined} />
            <AvatarFallback className="text-xl">{artist.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold text-foreground drop-shadow-sm">{artist.name}</h2>
            {artist.genres?.length > 0 && (
              <p className="text-sm text-muted-foreground">{artist.genres.slice(0, 3).join(", ")}</p>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="timelines">Timelines</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <ArtistInfoTab artist={artist} />
        </TabsContent>
        <TabsContent value="campaigns">
          <CampaignsTab artistId={artist.id} teamId={artist.team_id} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab artistId={artist.id} teamId={artist.team_id} />
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
