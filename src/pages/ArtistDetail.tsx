import { useState, useEffect, useRef } from "react";
import { useTour } from "@/contexts/TourContext";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DollarSign, Target, Star, Upload, RefreshCw, Receipt, ArrowLeft, Plus, MoreVertical, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { useArtistDetail } from "@/hooks/useArtistDetail";
import { useSpotifyArtist } from "@/hooks/useSpotifyArtist";
import { useArtistPerformance } from "@/hooks/useArtistPerformance";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { ArtistInfoTab } from "@/components/artist/ArtistInfoTab";
import { WorkTab } from "@/components/artist/WorkTab";
import { LinksTab } from "@/components/artist/LinksTab";
import { TimelinesTab } from "@/components/artist/TimelinesTab";
import { BudgetSection, useTotalBudget } from "@/components/artist/BudgetSection";
import { BannerUpload } from "@/components/artist/BannerUpload";
import { FinanceTab } from "@/components/artist/FinanceTab";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SplitsTab } from "@/components/artist/SplitsTab";
import { ObjectiveKpiCard } from "@/components/artist/ObjectiveKpiCard";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import defaultBanner from "@/assets/default-banner.png";

type TabView = "work" | "links" | "timelines" | "splits";
type ActiveView = TabView | "finance" | "budgets" | "objectives" | "information";

export default function ArtistDetail() {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromFinance = searchParams.get("from") === "finance";
  const { data: artist, isLoading } = useArtistDetail(artistId!);
  const { selectedTeamId } = useSelectedTeam();

  // Navigate back to roster when the team is switched while on this page
  const prevTeamIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevTeamIdRef.current !== null && prevTeamIdRef.current !== selectedTeamId) {
      navigate("/roster");
    }
    prevTeamIdRef.current = selectedTeamId;
  }, [selectedTeamId, navigate]);
  const { data: spotifyData, refetch: refetchSpotify, isFetching: isRefreshingSpotify } = useSpotifyArtist(artist?.spotify_id);
  const { data: perfSnapshot } = useArtistPerformance(artistId!, artist?.spotify_id, artist?.name);
  const totalBudget = useTotalBudget(artistId!);
  const { limits } = useTeamPlan();
  const [activeView, setActiveView] = useState<ActiveView>(fromFinance ? "finance" : "work");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const queryClient = useQueryClient();
  const { tryStartPageTour } = useTour();
  useEffect(() => { tryStartPageTour("artist-detail-tour"); }, [tryStartPageTour]);

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

    const spotifyListeners = spotifyData.monthly_listeners || spotifyData.followers || 0;
    if (spotifyListeners > 0 && (artist as any).monthly_listeners !== spotifyListeners) {
      patch.monthly_listeners = spotifyListeners;
    }

    const spotifyBanner = spotifyData.banner_url;
    if (spotifyBanner && !artist.banner_url) {
      patch.banner_url = spotifyBanner;
    }

    if (!artist.avatar_url && spotifyData.images && spotifyData.images.length > 0) {
      patch.avatar_url = spotifyData.images[0].url;
    }

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
  const listenerStatAbbr = listenerStat >= 1_000_000
    ? `${(listenerStat / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : listenerStat >= 1_000
    ? `${(listenerStat / 1_000).toFixed(1).replace(/\.0$/, "")}K`
    : String(listenerStat);

  const isTopView = (v: ActiveView) => ["finance", "budgets", "objectives", "information"].includes(v);
  const handleViewChange = (v: ActiveView) => {
    if (v === "finance" && !limits.canUseFinance) {
      setUpgradeFeature("Finance tools");
      setUpgradeOpen(true);
      return;
    }
    if (v === "splits" && !limits.canUseSplits) {
      setUpgradeFeature("Split sheets");
      setUpgradeOpen(true);
      return;
    }
    if (isTopView(v)) {
      setActiveView(prev => prev === v ? "work" : v);
    } else {
      setActiveView(v);
    }
  };

  // Build action buttons, conditionally showing Finance based on plan
  const actionButtons = [
    { key: "finance" as ActiveView, icon: Receipt, label: "Finance" },
    { key: "budgets" as ActiveView, icon: DollarSign, label: "Budgets" },
    { key: "objectives" as ActiveView, icon: Target, label: "Objectives" },
    { key: "information" as ActiveView, icon: Star, label: "Info" },
  ];

  const tabItems: TabView[] = ["work", "links", "timelines", "splits"];

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <AppLayout
      title="Artist"
      onBack={handleBack}
      actions={
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide" data-tour="artist-actions">
          {actionButtons.map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant={activeView === key ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewChange(key)}
              className="gap-1 shrink-0 text-xs h-8 px-2.5 sm:px-3"
            >
              <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
      }
    >
      {/* Back arrow — desktop only; on mobile it lives in the top header */}
      <button
        onClick={handleBack}
        className="hidden sm:flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-2 -mt-1"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      {/* Banner */}
      <div className="relative rounded-xl overflow-hidden mb-4 shadow-2xl group" data-tour="artist-banner">
        <div className="relative h-52 sm:h-72 lg:h-[320px] overflow-hidden">
          <img
            src={hasBanner ? bannerUrl! : defaultBanner}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Gradient: strong at bottom for legibility, fades up */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

          {/* Banner edit actions — revealed on hover */}
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

          {/* Bottom overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 sm:px-6 sm:pb-5">

            {/* ── Mobile: avatar above, name + chips on the bottom row ── */}
            <div className="flex flex-col gap-2 sm:hidden">
              <Avatar className="h-14 w-14 border-2 border-white/25 shadow-2xl shrink-0">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-lg font-bold">{artist.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-lg leading-tight truncate">
                    {artist.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-white/65 mt-0.5">
                    {artist.genres && artist.genres.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 fill-current opacity-70" />
                        {artist.genres.slice(0, 2).join(", ")}
                      </span>
                    )}
                    {listenerStat > 0 && (
                      <span className="font-medium">{listenerStatAbbr} {listenerLabel}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-end gap-2 shrink-0">
                  <div className="rounded-xl border border-white/[0.14] bg-black/30 backdrop-blur-xl shadow-lg px-3 py-2.5 text-right">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/45 mb-1.5 leading-none">Budget</p>
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="text-sm font-bold text-white tracking-tight tabular-nums leading-none">
                        {totalBudget >= 1_000_000
                          ? `${(totalBudget / 1_000_000).toFixed(1)}M`
                          : totalBudget >= 1_000
                          ? `${(totalBudget / 1_000).toFixed(0)}K`
                          : totalBudget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.14] bg-black/30 backdrop-blur-xl shadow-lg px-3 py-2.5 text-right">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/45 mb-1.5 leading-none">Done</p>
                    <div className="flex items-center justify-end gap-1">
                      <CheckCheck className="h-3 w-3 text-white/50 shrink-0" />
                      <span className="text-sm font-bold text-white tracking-tight tabular-nums leading-none">{completedCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Desktop: avatar + name left, chips right, all baseline-aligned ── */}
            <div className="hidden sm:flex items-end justify-between gap-4">
              <div className="flex items-end gap-4 min-w-0">
                <Avatar className="h-20 w-20 lg:h-24 lg:w-24 border-2 border-white/25 shadow-2xl shrink-0">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xl font-bold">{artist.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 pb-0.5">
                  <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight truncate drop-shadow-lg leading-tight">
                    {artist.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-white/70 mt-0.5">
                    {artist.genres && artist.genres.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 fill-current opacity-80" />
                        {artist.genres.slice(0, 2).join(", ")}
                      </span>
                    )}
                    {listenerStat > 0 && (
                      <span className="font-medium">{listenerStat.toLocaleString()} {listenerLabel}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex items-end gap-2">
                <div className="rounded-xl border border-white/[0.14] bg-black/30 backdrop-blur-xl shadow-lg px-3.5 py-3 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45 mb-1.5 leading-none">Budget</p>
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="text-base font-bold text-white tracking-tight tabular-nums leading-none">
                      {totalBudget >= 1_000_000
                        ? `${(totalBudget / 1_000_000).toFixed(1)}M`
                        : totalBudget >= 1_000
                        ? `${(totalBudget / 1_000).toFixed(0)}K`
                        : totalBudget.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.14] bg-black/30 backdrop-blur-xl shadow-lg px-3.5 py-3 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45 mb-1.5 leading-none">Completed</p>
                  <div className="flex items-center justify-end gap-1">
                    <CheckCheck className="h-3.5 w-3.5 text-white/50 shrink-0" />
                    <span className="text-base font-bold text-white tracking-tight tabular-nums leading-none">{completedCount}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden shrink-0" data-tour="artist-tabs">
              {tabItems.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleViewChange(tab)}
                  className={`h-9 px-3.5 text-sm font-medium capitalize transition-colors ${
                    activeView === tab
                      ? "bg-foreground text-background"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {tab === "timelines" ? "Release Plans" : tab === "work" ? "Work" : tab === "splits" ? "Splits" : tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile: three-dot dropdown for toggles */}
              <div className="flex sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuCheckboxItem checked={showCompleted} onCheckedChange={setShowCompleted}>
                      Show Completed
                    </DropdownMenuCheckboxItem>
                    {activeView === "work" && (
                      <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={setShowArchived}>
                        Show Archived
                      </DropdownMenuCheckboxItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Desktop: inline toggles */}
              <label className="hidden sm:flex items-center gap-1.5 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                Completed
                <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
              </label>
              {activeView === "work" && (
                <div className="hidden sm:flex">
                  <WorkTabControls artistId={artist.id} showArchived={showArchived} setShowArchived={setShowArchived} />
                </div>
              )}
            </div>
          </div>

          <ErrorBoundary fallbackMessage="Could not load this section.">
            {activeView === "finance" && <FinanceTab artistId={artist.id} teamId={artist.team_id} />}
            {activeView === "budgets" && <BudgetSection artistId={artist.id} />}
            {activeView === "objectives" && <ObjectivesPanel artist={artist} />}
            {activeView === "information" && <ArtistInfoTab artist={artist} />}
            {activeView === "work" && <WorkTab artistId={artist.id} teamId={artist.team_id} showCompleted={showCompleted} showArchived={showArchived} />}
            {activeView === "links" && <LinksTab artistId={artist.id} />}
            {activeView === "timelines" && <TimelinesTab artistId={artist.id} />}
            {activeView === "splits" && <SplitsTab artistId={artist.id} teamId={artist.team_id} />}
          </ErrorBoundary>
        </div>
      </div>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
    </AppLayout>
  );
}

// Work tab extra controls

function WorkTabControls({ artistId, showArchived, setShowArchived }: { artistId: string; showArchived: boolean; setShowArchived: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <label className="flex items-center gap-1.5 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
        Archived
        <Switch checked={showArchived} onCheckedChange={setShowArchived} />
      </label>
    </div>
  );
}

// Objectives panel
// Objectives panel

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
