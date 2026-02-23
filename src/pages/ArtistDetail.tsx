import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { DollarSign, Target, Star } from "lucide-react";
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
import defaultBanner from "@/assets/default-banner.png";

type ActiveView = "work" | "links" | "timelines" | "budgets" | "objectives" | "information";

export default function ArtistDetail() {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const { data: artist, isLoading } = useArtistDetail(artistId!);
  const { data: spotifyData } = useSpotifyArtist(artist?.spotify_id);
  const totalBudget = useTotalBudget(artistId!);
  const [activeView, setActiveView] = useState<ActiveView>("work");

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

  const hasBanner = !!artist.banner_url;
  const bannerUrl = artist.banner_url;
  const monthlyListeners = spotifyData?.monthly_listeners || spotifyData?.followers || 0;

  const isTopView = (v: ActiveView) => ["budgets", "objectives", "information"].includes(v);
  const toggleTopView = (v: ActiveView) => {
    setActiveView(prev => prev === v ? "work" : v);
  };

  return (
    <AppLayout
      title="Artist"
      actions={
        <div className="flex items-center gap-1">
          <Button
            variant={activeView === "budgets" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleTopView("budgets")}
            className="gap-1"
          >
            <DollarSign className="h-3.5 w-3.5" /> Budgets
          </Button>
          <Button
            variant={activeView === "objectives" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleTopView("objectives")}
            className="gap-1"
          >
            <Target className="h-3.5 w-3.5" /> Objectives
          </Button>
          <Button
            variant={activeView === "information" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleTopView("information")}
            className="gap-1"
          >
            <Star className="h-3.5 w-3.5" /> Information
          </Button>
        </div>
      }
    >
      {/* Banner */}
      <div className="relative h-80 sm:h-[400px] rounded-lg bg-muted overflow-hidden mb-4 shadow-xl group">
        {hasBanner ? (
          <>
            <img
              src={bannerUrl!}
              alt=""
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
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
          </>
        ) : (
          <>
            <img
              src={defaultBanner}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 flex items-end p-8 sm:p-12">
              <div className="flex items-end gap-6 sm:gap-10 flex-1">
              <Avatar className="h-36 w-36 sm:h-48 sm:w-48 border-4 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] shrink-0">
                <AvatarImage src={artist.avatar_url ?? undefined} />
                <AvatarFallback className="text-5xl sm:text-6xl font-bold">{artist.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1 pb-1">
                <h2 className="text-5xl sm:text-7xl font-bold text-white tracking-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)' }}>{artist.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90 mt-1" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
                  {artist.genres && artist.genres.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" /> {artist.genres.slice(0, 3).join(", ")}
                      </span>
                    )}
                    {monthlyListeners > 0 && (
                      <span>{monthlyListeners.toLocaleString()} monthly listeners</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-white/95 shrink-0">
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10 shadow-lg">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span className="text-lg font-bold">Total Budget: ${totalBudget.toLocaleString()}</span>
                </div>
                <div className="text-xs font-medium uppercase tracking-wider text-white/70 px-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                  Tasks Completed: {completedCount}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tab row for Work/Links/Timelines - these are the bottom tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 border-b border-border">
          {(["work", "links", "timelines"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveView(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeView === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content area - switches based on activeView */}
      {activeView === "budgets" && <BudgetSection artistId={artist.id} />}
      {activeView === "objectives" && <ObjectivesPanel artist={artist} />}
      {activeView === "information" && <ArtistInfoTab artist={artist} />}
      {activeView === "work" && <WorkTab artistId={artist.id} teamId={artist.team_id} />}
      {activeView === "links" && <LinksTab artistId={artist.id} />}
      {activeView === "timelines" && <TimelinesTab artistId={artist.id} />}
    </AppLayout>
  );
}

// Objectives panel - shows goals/focuses like the old site
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";

function ObjectivesPanel({ artist }: { artist: any }) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (patch: Record<string, string>) => {
      const { error } = await supabase.from("artists").update(patch).eq("id", artist.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist", artist.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const fields = [
    { key: "primary_goal", label: "Primary Goal" },
    { key: "secondary_goal", label: "Secondary Goal" },
    { key: "primary_focus", label: "Primary Focus" },
    { key: "secondary_focus", label: "Secondary Focus" },
    { key: "primary_metric", label: "Primary Metric" },
    { key: "secondary_metric", label: "Secondary Metric" },
  ];

  return (
    <div>
      <h3 className="font-semibold mb-3">Objectives</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <span className="text-muted-foreground">{label}: </span>
            <InlineField
              value={artist[key] ?? ""}
              placeholder="—"
              onSave={(v) => save.mutate({ [key]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
