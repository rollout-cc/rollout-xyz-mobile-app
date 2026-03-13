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
import { DollarSign, Target, Star, RefreshCw, Receipt, ArrowLeft, MoreVertical, CheckCheck } from "lucide-react";
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
import { ObjectiveKpiCard, OBJECTIVE_TYPES } from "@/components/artist/ObjectiveKpiCard";
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

  const formatObjectiveNumber = (n: number, unit: string): string => {
    const prefix = unit === "$" ? "$" : "";
    if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${prefix}${n.toLocaleString()}`;
  };

  // Resolve current value for an objective type from tracked data
  const getObjectiveCurrentValue = (type: string | null): number | null => {
    if (!type) return null;
    if (type === "monthly_listeners") return monthlyListeners || null;
    if (perfSnapshot) {
      if (type === "monthly_streams") return perfSnapshot.monthly_streams || null;
      if (type === "daily_streams") return perfSnapshot.daily_streams || null;
      if (type === "est_monthly_revenue") return perfSnapshot.est_monthly_revenue || null;
    }
    return null;
  };

  const getObjectiveSummary = (slot: 1 | 2): string | null => {
    const typeKey = `objective_${slot}_type` as const;
    const targetKey = `objective_${slot}_target` as const;
    const type = (artist as any)[typeKey] as string | null;
    if (!type) return null;
    const meta = OBJECTIVE_TYPES.find((t) => t.value === type);
    const label = meta?.label ?? "Goal";
    const unit = meta?.unit ?? "";
    const target = (artist as any)[targetKey] as number | null;
    const current = getObjectiveCurrentValue(type);

    if (target && current != null) {
      const progress = Math.min((current / target) * 100, 999);
      return `${label} · ${Math.round(progress)}% of ${formatObjectiveNumber(target, unit)}`;
    }

    if (target) {
      return `${label} · Goal ${formatObjectiveNumber(target, unit)}`;
    }

    return `${label} · Tracking`;
  };

  const objectiveSummary1 = getObjectiveSummary(1);
  const objectiveSummary2 = getObjectiveSummary(2);
  const hasAnyObjectiveSummary = !!(objectiveSummary1 || objectiveSummary2);

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

          {/* Goals bar — top of banner */}
          {hasAnyObjectiveSummary && (
            <div className="absolute top-0 left-0 right-0 px-4 pt-3 sm:px-6 sm:pt-4 z-[5]">
              <button
                type="button"
                onClick={() => handleViewChange("objectives")}
                className="w-full rounded-lg bg-black/30 border border-white/10 backdrop-blur-md px-3 py-1.5 flex items-center gap-2 text-[11px] text-white/80 hover:bg-black/45 transition-colors"
              >
                <Target className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                <span className="uppercase tracking-[0.18em] text-[9px] text-white/55 shrink-0">
                  Goals
                </span>
                <span className="truncate text-left">
                  {[objectiveSummary1, objectiveSummary2].filter(Boolean).join("  •  ")}
                </span>
              </button>
            </div>
          )}

          {/* Bottom overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 sm:px-6 sm:pb-5 space-y-2.5">

            {/* ── Mobile layout ── */}
            <div className="flex items-end justify-between gap-3 sm:hidden">
              {/* Left: avatar + identity */}
              <div className="flex items-end gap-2.5 min-w-0">
                <Avatar className="h-12 w-12 border-2 border-white/20 shadow-xl shrink-0 mb-0.5">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback className="text-base font-bold">{artist.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-lg leading-tight truncate">
                    {artist.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/60 mt-0.5">
                    {artist.genres && artist.genres.length > 0 && (
                      <span>{artist.genres.slice(0, 1).join(", ")}</span>
                    )}
                    {listenerStat > 0 && (
                      <span className="font-semibold text-white/75">{listenerStatAbbr} {listenerLabel}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: stat chips + objectives */}
              <div className="flex items-end gap-1.5 shrink-0 flex-col">
                {/* Objectives (only rendered when set) */}
                <div className="flex items-end gap-1.5">
                  <ObjectiveKpiCard
                    artistId={artist.id}
                    slot={1}
                    objectiveType={(artist as any).objective_1_type}
                    objectiveTarget={(artist as any).objective_1_target}
                    currentValue={getObjectiveCurrentValue((artist as any).objective_1_type)}
                    variant="banner"
                  />
                  <ObjectiveKpiCard
                    artistId={artist.id}
                    slot={2}
                    objectiveType={(artist as any).objective_2_type}
                    objectiveTarget={(artist as any).objective_2_target}
                    currentValue={getObjectiveCurrentValue((artist as any).objective_2_type)}
                    variant="banner"
                  />
                </div>
                {/* Budget + Done unified pill */}
                <div className="flex items-stretch rounded-xl border border-white/[0.14] bg-black/35 backdrop-blur-xl shadow-lg overflow-hidden">
                  <div className="px-3 py-2 text-right border-r border-white/[0.10]">
                    <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/40 mb-1 leading-none">Budget</p>
                    <div className="flex items-center gap-0.5">
                      <DollarSign className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                      <span className="text-sm font-bold text-white tracking-tight tabular-nums leading-none">
                        {totalBudget >= 1_000_000
                          ? `${(totalBudget / 1_000_000).toFixed(1)}M`
                          : totalBudget >= 1_000
                          ? `${(totalBudget / 1_000).toFixed(0)}K`
                          : totalBudget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-2 text-right">
                    <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/40 mb-1 leading-none">Done</p>
                    <div className="flex items-center gap-0.5">
                      <CheckCheck className="h-2.5 w-2.5 text-white/45 shrink-0" />
                      <span className="text-sm font-bold text-white tracking-tight tabular-nums leading-none">{completedCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Desktop layout ── */}
            <div className="hidden sm:flex items-end justify-between gap-4">
              <div className="flex items-end gap-4 min-w-0">
                <Avatar className="h-20 w-20 lg:h-24 lg:w-24 border-2 border-white/20 shadow-2xl shrink-0">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xl font-bold">{artist.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 pb-0.5">
                  <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight truncate drop-shadow-lg leading-tight">
                    {artist.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-white/65 mt-0.5">
                    {artist.genres && artist.genres.length > 0 && (
                      <span>{artist.genres.slice(0, 2).join(", ")}</span>
                    )}
                    {listenerStat > 0 && (
                      <span className="font-semibold text-white/80">{listenerStat.toLocaleString()} {listenerLabel}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-end gap-2">
                {/* Objectives (only rendered when set) */}
                <ObjectiveKpiCard
                  artistId={artist.id}
                  slot={1}
                  objectiveType={(artist as any).objective_1_type}
                  objectiveTarget={(artist as any).objective_1_target}
                  currentValue={getObjectiveCurrentValue((artist as any).objective_1_type)}
                  variant="banner"
                />
                <ObjectiveKpiCard
                  artistId={artist.id}
                  slot={2}
                  objectiveType={(artist as any).objective_2_type}
                  objectiveTarget={(artist as any).objective_2_target}
                  currentValue={getObjectiveCurrentValue((artist as any).objective_2_type)}
                  variant="banner"
                />
                {/* Budget + Done unified pill */}
                <div className="flex items-stretch rounded-xl border border-white/[0.14] bg-black/35 backdrop-blur-xl shadow-lg overflow-hidden">
                  <div className="px-3.5 py-3 text-right border-r border-white/[0.10]">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/40 mb-1.5 leading-none">Budget</p>
                    <div className="flex items-center gap-1">
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
                  <div className="px-3.5 py-3 text-right">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/40 mb-1.5 leading-none">Done</p>
                    <div className="flex items-center gap-1">
                      <CheckCheck className="h-3.5 w-3.5 text-white/45 shrink-0" />
                      <span className="text-base font-bold text-white tracking-tight tabular-nums leading-none">{completedCount}</span>
                    </div>
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
                  className={`h-8 px-3 text-xs sm:h-9 sm:px-3.5 sm:text-sm font-medium capitalize transition-colors ${
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

// Objectives panel — now shows KPI cards + legacy text fields

function ObjectivesPanel({ artist }: { artist: any }) {
  const queryClient = useQueryClient();
  const { data: perfSnapshot } = useArtistPerformance(artist.id, artist.spotify_id, artist.name);

  const getObjectiveCurrentValue = (type: string | null): number | null => {
    if (!type) return null;
    if (type === "monthly_listeners") return artist.monthly_listeners || null;
    if (perfSnapshot) {
      if (type === "monthly_streams") return perfSnapshot.monthly_streams || null;
      if (type === "daily_streams") return perfSnapshot.daily_streams || null;
      if (type === "est_monthly_revenue") return perfSnapshot.est_monthly_revenue || null;
    }
    return null;
  };

  const save = useMutation({
    mutationFn: async (patch: Record<string, string>) => {
      const { error } = await supabase.from("artists").update(patch).eq("id", artist.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist", artist.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const textFields = [
    { key: "primary_goal", label: "Primary Goal" },
    { key: "secondary_goal", label: "Secondary Goal" },
    { key: "primary_focus", label: "Primary Focus" },
    { key: "secondary_focus", label: "Secondary Focus" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Tracked Objectives</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ObjectiveKpiCard
            artistId={artist.id}
            slot={1}
            objectiveType={artist.objective_1_type}
            objectiveTarget={artist.objective_1_target}
            currentValue={getObjectiveCurrentValue(artist.objective_1_type)}
            variant="card"
          />
          <ObjectiveKpiCard
            artistId={artist.id}
            slot={2}
            objectiveType={artist.objective_2_type}
            objectiveTarget={artist.objective_2_target}
            currentValue={getObjectiveCurrentValue(artist.objective_2_type)}
            variant="card"
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Notes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {textFields.map(({ key, label }) => (
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
    </div>
  );
}
