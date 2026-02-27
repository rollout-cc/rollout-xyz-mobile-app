import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { DollarSign, Target, Star, Upload, RefreshCw, Receipt } from "lucide-react";
import { PerformancePills } from "@/components/artist/PerformancePills";
import { useArtistDetail } from "@/hooks/useArtistDetail";
import { useSpotifyArtist } from "@/hooks/useSpotifyArtist";
import { ArtistInfoTab } from "@/components/artist/ArtistInfoTab";
import { WorkTab } from "@/components/artist/WorkTab";
import { LinksTab } from "@/components/artist/LinksTab";
import { TimelinesTab } from "@/components/artist/TimelinesTab";
import { BudgetSection, useTotalBudget } from "@/components/artist/BudgetSection";
import { BannerUpload } from "@/components/artist/BannerUpload";
import { FinanceTab } from "@/components/artist/FinanceTab";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import defaultBanner from "@/assets/default-banner.png";

type ActiveView = "work" | "links" | "timelines" | "finance" | "budgets" | "objectives" | "information";

export default function ArtistDetail() {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const { data: artist, isLoading } = useArtistDetail(artistId!);
  const { data: spotifyData, refetch: refetchSpotify, isFetching: isRefreshingSpotify } = useSpotifyArtist(artist?.spotify_id);
  const totalBudget = useTotalBudget(artistId!);
  const [activeView, setActiveView] = useState<ActiveView>("work");
  const queryClient = useQueryClient();

  const handleRefreshSpotify = async () => {
    const result = await refetchSpotify();
    if (result.data) {
      const updates: Record<string, any> = {};
      const d = result.data;
      
      if (d.monthly_listeners > 0) updates.monthly_listeners = d.monthly_listeners;
      else if (d.followers > 0) updates.monthly_listeners = d.followers;
      if (d.images?.length > 0) updates.avatar_url = d.images[0].url;
      if (d.banner_url) updates.banner_url = d.banner_url;
      if (d.genres?.length > 0) updates.genres = d.genres;

      if (Object.keys(updates).length > 0) {
        await supabase.from("artists").update(updates as any).eq("id", artist!.id);
      }
      queryClient.invalidateQueries({ queryKey: ["artist", artist?.id] });
      queryClient.invalidateQueries({ queryKey: ["artists"] });
      
      toast.success(d.images?.length > 0 
        ? `Spotify data synced — avatar and profile updated`
        : "Spotify data refreshed"
      );
    }
  };

  // Sync Spotify data (monthly listeners, avatar, banner) to DB when fetched
  useEffect(() => {
    if (!spotifyData || !artist) return;
    const patch: Record<string, any> = {};

    // Sync monthly listeners / followers
    const spotifyListeners = spotifyData.monthly_listeners || spotifyData.followers || 0;
    if (spotifyListeners > 0 && (artist as any).monthly_listeners !== spotifyListeners) {
      patch.monthly_listeners = spotifyListeners;
    }

    // Sync banner
    const spotifyBanner = spotifyData.banner_url;
    if (spotifyBanner && !artist.banner_url) {
      patch.banner_url = spotifyBanner;
    }

    // Sync avatar from Spotify images if artist has no avatar
    if (!artist.avatar_url && spotifyData.images && spotifyData.images.length > 0) {
      patch.avatar_url = spotifyData.images[0].url;
    }

    // Sync genres if empty
    if ((!artist.genres || artist.genres.length === 0) && spotifyData.genres && spotifyData.genres.length > 0) {
      patch.genres = spotifyData.genres;
    }

    if (Object.keys(patch).length > 0) {
      supabase
        .from("artists")
        .update(patch as any)
        .eq("id", artist.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ["artist", artist.id] }));
    }
  }, [spotifyData, artist?.id]);

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

  const bannerUrl = artist.banner_url || spotifyData?.banner_url || null;
  const hasBanner = !!bannerUrl;
  const avatarUrl = artist.avatar_url || (spotifyData?.images?.[0]?.url) || null;
  const monthlyListeners = (artist as any).monthly_listeners || spotifyData?.monthly_listeners || 0;
  const followers = spotifyData?.followers || 0;
  const listenerStat = monthlyListeners > 0 ? monthlyListeners : followers;
  const listenerLabel = monthlyListeners > 0 ? "monthly listeners" : "followers";

  const isTopView = (v: ActiveView) => ["finance", "budgets", "objectives", "information"].includes(v);
  const toggleTopView = (v: ActiveView) => {
    setActiveView(prev => prev === v ? "work" : v);
  };

  return (
    <AppLayout
      title="Artist"
      actions={
        <div className="flex items-center gap-1">
          <Button
            variant={activeView === "finance" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleTopView("finance")}
            className="gap-1"
          >
            <Receipt className="h-3.5 w-3.5" /> Finance
          </Button>
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
      <div className="relative rounded-lg bg-muted overflow-hidden mb-4 shadow-xl group">
        {/* Banner image area */}
        <div className="relative h-48 sm:h-72 lg:h-[360px] overflow-hidden">
          <img
            src={hasBanner ? bannerUrl! : defaultBanner}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Action buttons */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1.5">
            {artist.spotify_id && (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-md"
                onClick={handleRefreshSpotify}
                disabled={isRefreshingSpotify}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingSpotify ? "animate-spin" : ""}`} />
              </Button>
            )}
            <BannerUpload artistId={artist.id} currentBannerUrl={artist.banner_url} />
          </div>

          {/* Bottom overlay content */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <div className="flex items-end gap-3 sm:gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 border-[3px] border-background shadow-2xl shrink-0">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-xl sm:text-2xl font-bold">{artist.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pb-0.5">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight truncate drop-shadow-md">
                  {artist.name}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:text-sm text-white/80 mt-0.5">
                  {artist.genres && artist.genres.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" /> {artist.genres.slice(0, 2).join(", ")}
                    </span>
                  )}
                  {listenerStat > 0 && (
                    <span className="font-medium">{listenerStat.toLocaleString()} {listenerLabel}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar below image */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 bg-card border-t border-border">
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            <span>${totalBudget.toLocaleString()}</span>
          </div>
          <span className="text-border">·</span>
          <div className="caption-bold">{completedCount} tasks done</div>
          <div className="flex-1" />
          <PerformancePills artistId={artist.id} spotifyId={artist.spotify_id} artistName={artist.name} />
        </div>
      </div>

      {/* Main content + Finance ledger sidebar */}
      <div className="flex gap-6">
        {/* Left: main content area */}
        <div className="flex-1 min-w-0">
          {/* Tab row for Work/Links/Timelines */}
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
          {activeView === "finance" && <FinanceTab artistId={artist.id} teamId={artist.team_id} />}
          {activeView === "budgets" && <BudgetSection artistId={artist.id} />}
          {activeView === "objectives" && <ObjectivesPanel artist={artist} />}
          {activeView === "information" && <ArtistInfoTab artist={artist} />}
          {activeView === "work" && <WorkTab artistId={artist.id} teamId={artist.team_id} />}
          {activeView === "links" && <LinksTab artistId={artist.id} />}
          {activeView === "timelines" && <TimelinesTab artistId={artist.id} />}
        </div>
      </div>
    </AppLayout>
  );
}

// Objectives panel - shows goals/focuses like the old site
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
      <h3 className="mb-3">Objectives</h3>
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
