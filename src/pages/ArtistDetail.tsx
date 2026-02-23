import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, Target, Star } from "lucide-react";
import { useArtistDetail } from "@/hooks/useArtistDetail";
import { useSpotifyArtist } from "@/hooks/useSpotifyArtist";
import { ArtistInfoTab } from "@/components/artist/ArtistInfoTab";
import { WorkTab } from "@/components/artist/WorkTab";
import { LinksTab } from "@/components/artist/LinksTab";
import { TimelinesTab } from "@/components/artist/TimelinesTab";
import { BudgetSection, useTotalBudget } from "@/components/artist/BudgetSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type TopPanel = "budgets" | "objectives" | "information" | null;

export default function ArtistDetail() {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const { data: artist, isLoading } = useArtistDetail(artistId!);
  const { data: spotifyData } = useSpotifyArtist(artist?.spotify_id);
  const totalBudget = useTotalBudget(artistId!);
  const [topPanel, setTopPanel] = useState<TopPanel>(null);

  // Get completed tasks count
  const { data: completedCount = 0 } = useQuery({
    queryKey: ["tasks-completed-count", artistId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("artist_id", artistId!)
        .eq("is_completed", true);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!artistId,
  });

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

  const bannerUrl = spotifyData?.banner_url || artist.banner_url || artist.avatar_url;
  const monthlyListeners = spotifyData?.monthly_listeners || spotifyData?.followers || 0;

  const togglePanel = (panel: TopPanel) => {
    setTopPanel(prev => prev === panel ? null : panel);
  };

  return (
    <AppLayout
      title="Artist"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/roster")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-1 ml-4">
            <Button
              variant={topPanel === "budgets" ? "default" : "outline"}
              size="sm"
              onClick={() => togglePanel("budgets")}
              className="gap-1"
            >
              <DollarSign className="h-3.5 w-3.5" /> Budgets
            </Button>
            <Button
              variant={topPanel === "objectives" ? "default" : "outline"}
              size="sm"
              onClick={() => togglePanel("objectives")}
              className="gap-1"
            >
              <Target className="h-3.5 w-3.5" /> Objectives
            </Button>
            <Button
              variant={topPanel === "information" ? "default" : "outline"}
              size="sm"
              onClick={() => togglePanel("information")}
              className="gap-1"
            >
              <Star className="h-3.5 w-3.5" /> Information
            </Button>
          </div>
        </div>
      }
    >
      {/* Banner */}
      <div className="relative h-80 sm:h-[400px] rounded-lg bg-muted overflow-hidden mb-4 shadow-xl group">
        {bannerUrl && (
          <img 
            src={bannerUrl} 
            alt="" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-2xl">
              <AvatarImage src={artist.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl">{artist.name[0]}</AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-md mb-1">{artist.name}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
                {artist.genres && artist.genres.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" /> {artist.genres.slice(0, 3).join(", ")}
                  </span>
                )}
                {monthlyListeners > 0 && (
                  <span className="bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/20">
                    {monthlyListeners.toLocaleString()} monthly listeners
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 text-white/95">
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-lg font-bold">Total Budget: ${totalBudget.toLocaleString()}</span>
            </div>
            <div className="text-xs font-medium uppercase tracking-wider text-white/60 px-1">
              Tasks Completed: {completedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable top panels */}
      {topPanel === "budgets" && (
        <div className="mb-6 p-4 rounded-lg border border-border animate-in slide-in-from-top-2">
          <BudgetSection artistId={artist.id} />
        </div>
      )}

      {topPanel === "objectives" && (
        <div className="mb-6 p-4 rounded-lg border border-border animate-in slide-in-from-top-2">
          <ObjectivesPanel artist={artist} />
        </div>
      )}

      {topPanel === "information" && (
        <div className="mb-6 animate-in slide-in-from-top-2">
          <ArtistInfoTab artist={artist} />
        </div>
      )}

      {/* Main tabs: Work, Links, Timelines */}
      <Tabs defaultValue="work" className="w-full">
        <TabsList>
          <TabsTrigger value="work">Work</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="timelines">Timelines</TabsTrigger>
        </TabsList>

        <TabsContent value="work">
          <WorkTab artistId={artist.id} teamId={artist.team_id} />
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

// Objectives panel - shows goals/focuses like the old site
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function ObjectivesPanel({ artist }: { artist: any }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    primary_goal: artist.primary_goal ?? "",
    secondary_goal: artist.secondary_goal ?? "",
    primary_focus: artist.primary_focus ?? "",
    secondary_focus: artist.secondary_focus ?? "",
    primary_metric: artist.primary_metric ?? "",
    secondary_metric: artist.secondary_metric ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("artists").update(form).eq("id", artist.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist", artist.id] });
      setEditing(false);
      toast.success("Objectives saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Objectives</h3>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => save.mutate()}>Save</Button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.keys(form) as (keyof typeof form)[]).map((key) => (
            <div key={key} className="space-y-1">
              <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
              <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            ["Primary Goal", artist.primary_goal],
            ["Secondary Goal", artist.secondary_goal],
            ["Primary Focus", artist.primary_focus],
            ["Secondary Focus", artist.secondary_focus],
            ["Primary Metric", artist.primary_metric],
            ["Secondary Metric", artist.secondary_metric],
          ].map(([label, val]) => (
            <div key={label as string}>
              <span className="text-muted-foreground">{label}: </span>
              <span>{val || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
