import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
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
import { DollarSign, Star, RefreshCw, Receipt, MoreVertical, CheckCheck, Maximize2, Minimize2, ChevronRight, ChevronDown } from "lucide-react";
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
import { WorkTab, NewCampaignInline } from "@/components/artist/WorkTab";
import { LinksTab } from "@/components/artist/LinksTab";
import { TimelinesTab } from "@/components/artist/TimelinesTab";
import { BudgetSection, useTotalBudget, useTotalSpent } from "@/components/artist/BudgetSection";
import { BannerUpload } from "@/components/artist/BannerUpload";
import { FinanceTab } from "@/components/artist/FinanceTab";
import { InvoiceCreator } from "@/components/finance/InvoiceCreator";
import { InvoiceList } from "@/components/finance/InvoiceList";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SplitsTab } from "@/components/artist/SplitsTab";
import { ObjectiveKpiCard } from "@/components/artist/ObjectiveKpiCard";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import defaultBanner from "@/assets/default-banner.png";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type TabView = "work" | "links" | "timelines" | "splits";
type ActiveView = TabView | "money" | "finance" | "budgets" | "objectives" | "information";
type MoneySubTab = "accounting" | "budgets" | "invoices";

const ARTIST_TAB_LABELS: Record<TabView, string> = {
  work: "Work",
  links: "Links",
  timelines: "Release Plans",
  splits: "Splits",
};

export default function ArtistDetail() {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromFinance = searchParams.get("from") === "finance";
  const { data: artist, isLoading } = useArtistDetail(artistId!);
  const { selectedTeamId, canViewFinance, canEditArtists, canDistribute } = useSelectedTeam();

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
  const totalSpent = useTotalSpent(artistId!);
  const { limits } = useTeamPlan();
  const [activeView, setActiveView] = useState<ActiveView>(fromFinance ? "money" : "work");
  const [moneySubTab, setMoneySubTab] = useState<MoneySubTab>(fromFinance ? "accounting" : "accounting");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newCampaignId, setNewCampaignId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const [heroExpanded, setHeroExpanded] = useState(true);
  const artistMetricsSectionId = "artist-metrics-section";
  const queryClient = useQueryClient();
  const { tryStartPageTour } = useTour();
  useEffect(() => { tryStartPageTour("artist-detail-tour"); }, [tryStartPageTour]);
  useEffect(() => {
    setHeroExpanded(true);
  }, [artistId]);

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

  const heroBannerSrc = hasBanner ? bannerUrl! : defaultBanner;
  const heroBudgetDisplay =
    totalBudget >= 1_000_000
      ? `${(totalBudget / 1_000_000).toFixed(1)}M`
      : totalBudget >= 1_000
        ? `${(totalBudget / 1_000).toFixed(0)}K`
        : totalBudget.toLocaleString();

  const isTopView = (v: ActiveView) => ["money", "finance", "budgets", "objectives", "information"].includes(v);
  const handleViewChange = (v: ActiveView) => {
    if (v === "money" && !limits.canUseFinance) {
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

  // Build action buttons, conditionally showing Finance based on plan and permissions
  const actionButtons = [
    ...(canViewFinance ? [{ key: "money" as ActiveView, icon: DollarSign, label: "Money" }] : []),
    { key: "information" as ActiveView, icon: Star, label: "Info" },
  ];

  const tabItems: TabView[] = ["work", "links", "timelines", ...(canDistribute ? ["splits" as TabView] : [])];

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
      {/* Hero: fixed-height art (never grows); expanded detail is a separate blurred panel below */}
      <div
        className="group relative mb-5 block min-w-0 shrink-0 overflow-hidden rounded-lg bg-background shadow-lg dark:bg-neutral-950 sm:mb-6 sm:rounded-xl sm:shadow-xl"
        data-tour="artist-banner"
      >
              <div className="relative isolate min-h-[12rem] w-full overflow-hidden sm:min-h-[14rem] lg:min-h-[min(16rem,26vw)]">
                <img
                  src={heroBannerSrc}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.015] motion-reduce:transform-none"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/72 via-black/28 to-transparent"
                  aria-hidden
                />

                <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-end gap-0.5 px-3 pt-2.5 sm:gap-1 sm:px-5 sm:pt-3.5">
                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                    {artist.spotify_id && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6 shrink-0 rounded-md border-0 bg-black/40 text-white shadow-sm backdrop-blur-sm hover:bg-black/55 sm:h-6 sm:w-6 md:h-7 md:w-7"
                        onClick={handleRefreshSpotify}
                        disabled={isRefreshingSpotify}
                        aria-label="Refresh Spotify data"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 ${isRefreshingSpotify ? "animate-spin" : ""}`} />
                      </Button>
                    )}
                    <BannerUpload artistId={artist.id} currentBannerUrl={artist.banner_url} compact />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 shrink-0 rounded-md border-0 bg-black/40 text-white shadow-sm backdrop-blur-sm hover:bg-black/55 sm:h-6 sm:w-6 md:h-7 md:w-7"
                    onClick={() => setHeroExpanded((o) => !o)}
                    aria-expanded={heroExpanded}
                    aria-controls={artistMetricsSectionId}
                    aria-label={heroExpanded ? "Collapse key metrics" : "Expand key metrics"}
                  >
                    {heroExpanded ? (
                      <Minimize2 className="h-2.5 w-2.5 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" strokeWidth={2} aria-hidden />
                    ) : (
                      <Maximize2 className="h-2.5 w-2.5 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" strokeWidth={2} aria-hidden />
                    )}
                  </Button>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-8 sm:px-5 sm:pb-4 sm:pt-10">
                  <div className="flex w-full flex-row items-center gap-3 sm:gap-4">
                    <Avatar className="h-16 w-16 shrink-0 border border-white/20 shadow-sm sm:h-[4.5rem] sm:w-[4.5rem] md:h-[5rem] md:w-[5rem] lg:h-[5.25rem] lg:w-[5.25rem]">
                      <AvatarImage src={avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-white/10 text-xl font-semibold text-white sm:text-2xl md:text-3xl">
                        {artist.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 py-0.5">
                      <h2 className="truncate text-xl font-semibold leading-[1.15] tracking-tight text-white sm:text-2xl md:text-[1.65rem] lg:text-3xl">
                        {artist.name}
                      </h2>
                      {(artist.genres && artist.genres.length > 0) || listenerStat > 0 ? (
                        <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs leading-snug text-white/55 sm:mt-1 sm:text-[13px]">
                          {artist.genres && artist.genres.length > 0 && (
                            <span className="truncate font-normal">{artist.genres.slice(0, 2).join(", ")}</span>
                          )}
                          {listenerStat > 0 && (
                            <>
                              {artist.genres && artist.genres.length > 0 && (
                                <span className="shrink-0 text-white/25" aria-hidden>
                                  ·
                                </span>
                              )}
                              <span className="shrink-0 tabular-nums font-medium text-white/50">
                                <span className="sm:hidden">
                                  {listenerStatAbbr} {listenerLabel}
                                </span>
                                <span className="hidden sm:inline">
                                  {listenerStat.toLocaleString()} {listenerLabel}
                                </span>
                              </span>
                            </>
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <Collapsible open={heroExpanded} onOpenChange={setHeroExpanded}>
                <div
                  className={cn(
                    "relative z-[1] border-t border-border dark:border-white/10",
                  )}
                >
                  <div className="flex items-stretch gap-2 px-2 py-3 sm:px-2">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 pl-0.5 pr-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring dark:focus-visible:ring-white/25"
                        aria-expanded={heroExpanded}
                        aria-controls={artistMetricsSectionId}
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 dark:text-white/50",
                            heroExpanded && "rotate-180",
                          )}
                          aria-hidden
                        />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-white/45">
                          Key metrics
                        </span>
                      </button>
                    </CollapsibleTrigger>
                    <button
                      type="button"
                      onClick={() => handleViewChange("objectives")}
                      className="inline-flex shrink-0 items-center gap-0.5 self-center rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-white/45 dark:hover:text-white/85 dark:focus-visible:ring-white/25"
                    >
                      Objectives
                      <ChevronRight className="h-3 w-3 opacity-70" aria-hidden />
                    </button>
                  </div>
                </div>
                <CollapsibleContent
                  id={artistMetricsSectionId}
                  className="relative isolate min-h-0 overflow-hidden text-foreground antialiased data-[state=closed]:pointer-events-none data-[state=closed]:hidden dark:text-zinc-50"
                >
                  <div className="relative z-[1] px-2 pb-2 pt-2 sm:px-2 sm:pb-2">
                  <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4">
                    <div className="flex h-full min-h-[5rem] min-w-0 w-full">
                      <ObjectiveKpiCard
                        artistId={artist.id}
                        slot={1}
                        objectiveType={(artist as any).objective_1_type}
                        objectiveTarget={(artist as any).objective_1_target}
                        currentValue={getObjectiveCurrentValue((artist as any).objective_1_type)}
                        variant="banner"
                      />
                    </div>
                    <div className="flex h-full min-h-[5rem] min-w-0 w-full">
                      <ObjectiveKpiCard
                        artistId={artist.id}
                        slot={2}
                        objectiveType={(artist as any).objective_2_type}
                        objectiveTarget={(artist as any).objective_2_target}
                        currentValue={getObjectiveCurrentValue((artist as any).objective_2_type)}
                        variant="banner"
                      />
                    </div>
                    <div
                      className="flex h-full min-h-[5rem] min-w-0 flex-col rounded-md border border-border bg-card/90 p-3 text-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/25 dark:shadow-none"
                      onMouseEnter={(e) => {
                        const label = e.currentTarget.querySelector("[data-budget-label]") as HTMLElement;
                        const val = e.currentTarget.querySelector("[data-budget-value]") as HTMLElement;
                        if (label) label.textContent = "Remaining";
                        if (val) {
                          const remaining = totalBudget - totalSpent;
                          val.textContent =
                            remaining >= 1_000_000
                              ? `${(remaining / 1_000_000).toFixed(1)}M`
                              : remaining >= 1_000
                                ? `${(remaining / 1_000).toFixed(0)}K`
                                : remaining.toLocaleString();
                        }
                      }}
                      onMouseLeave={(e) => {
                        const label = e.currentTarget.querySelector("[data-budget-label]") as HTMLElement;
                        const val = e.currentTarget.querySelector("[data-budget-value]") as HTMLElement;
                        if (label) label.textContent = "Budget";
                        if (val) val.textContent = heroBudgetDisplay;
                      }}
                    >
                      <p
                        data-budget-label
                        className="text-[10px] font-semibold uppercase tracking-wider leading-none py-[2px] text-muted-foreground dark:text-white/45"
                      >
                        Budget
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/50" aria-hidden />
                        <span
                          data-budget-value
                          className="text-xl font-semibold tabular-nums tracking-tight text-foreground dark:text-white"
                        >
                          {heroBudgetDisplay}
                        </span>
                      </div>
                    </div>
                    <div className="flex h-full min-h-[5rem] min-w-0 flex-col rounded-md border border-border bg-card/90 p-3 text-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/25 dark:shadow-none">
                      <p className="text-[10px] font-semibold uppercase tracking-wider leading-none py-[2px] text-muted-foreground dark:text-white/45">
                        Done
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <CheckCheck className="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/50" aria-hidden />
                        <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground dark:text-white">
                          {completedCount}
                        </span>
                      </div>
                    </div>
                  </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="mb-5 space-y-5 sm:mb-6 sm:space-y-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <div
                className={cn(
                  "w-full min-w-0 rounded-[0.875rem] bg-muted/40 p-1 ring-1 ring-inset ring-border/30",
                  "sm:max-w-xl sm:w-auto sm:flex-none",
                )}
                data-tour="artist-tabs"
                role="tablist"
                aria-label="Artist sections"
              >
                <div
                  className={cn(
                    "grid w-full min-w-0 gap-1",
                    tabItems.length === 4 ? "grid-cols-4" : "grid-cols-3",
                  )}
                >
                  {tabItems.map((tabKey) => (
                    <button
                      key={tabKey}
                      type="button"
                      role="tab"
                      aria-selected={activeView === tabKey}
                      onClick={() => handleViewChange(tabKey)}
                      className={cn(
                        "flex h-9 w-full min-w-0 items-center justify-center rounded-lg px-1 text-sm font-medium transition-[color,background-color,box-shadow]",
                        activeView === tabKey
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground/80",
                      )}
                    >
                      <span className="truncate text-center">{ARTIST_TAB_LABELS[tabKey]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden items-center gap-2 sm:flex sm:gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Completed
                  <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
                </label>
                {activeView === "work" && (
                  <WorkTabControls artistId={artist.id} showArchived={showArchived} setShowArchived={setShowArchived} />
                )}
              </div>
            </div>

            {/* Mobile: New Campaign (work) left, overflow menu right — tabs use full width above */}
            <div className="flex items-center justify-between gap-2 sm:hidden">
              <div className="min-w-0 shrink">
                {activeView === "work" && (
                  <NewCampaignInline artistId={artist.id} onCreated={setNewCampaignId} />
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
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
          </div>

          <ErrorBoundary fallbackMessage="Could not load this section.">
            {activeView === "money" && (
              <div className="space-y-4">
                <div className="flex gap-1 border-b border-border">
                  {([{ key: "accounting" as MoneySubTab, label: "Accounting" }, { key: "budgets" as MoneySubTab, label: "Budgets" }, { key: "invoices" as MoneySubTab, label: "Invoices" }]).map(t => (
                    <button
                      key={t.key}
                      onClick={() => setMoneySubTab(t.key)}
                      className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                        moneySubTab === t.key
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {moneySubTab === "accounting" && <FinanceTab artistId={artist.id} teamId={artist.team_id} />}
                {moneySubTab === "budgets" && <BudgetSection artistId={artist.id} />}
                {moneySubTab === "invoices" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Invoices</h3>
                      <InvoiceCreator artistId={artist.id} />
                    </div>
                    <InvoiceList artistId={artist.id} />
                  </div>
                )}
              </div>
            )}
            {activeView === "objectives" && <ObjectivesPanel artist={artist} />}
            {activeView === "information" && <ArtistInfoTab artist={artist} readOnly={!canEditArtists} />}
            {activeView === "work" && (
              <WorkTab
                artistId={artist.id}
                teamId={artist.team_id}
                showCompleted={showCompleted}
                showArchived={showArchived}
                newCampaignId={newCampaignId}
                onNewCampaignCreated={setNewCampaignId}
              />
            )}
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Tracked Objectives</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <ObjectiveKpiCard
              artistId={artist.id}
              slot={1}
              objectiveType={artist.objective_1_type}
              objectiveTarget={artist.objective_1_target}
              currentValue={getObjectiveCurrentValue(artist.objective_1_type)}
              variant="card"
            />
            {artist.objective_1_type && (
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Notes</span>
                <InlineField
                  value={artist.primary_goal ?? ""}
                  placeholder="Add notes…"
                  as="textarea"
                  onSave={(v) => save.mutate({ primary_goal: v })}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <ObjectiveKpiCard
              artistId={artist.id}
              slot={2}
              objectiveType={artist.objective_2_type}
              objectiveTarget={artist.objective_2_target}
              currentValue={getObjectiveCurrentValue(artist.objective_2_type)}
              variant="card"
            />
            {artist.objective_2_type && (
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Notes</span>
                <InlineField
                  value={artist.secondary_goal ?? ""}
                  placeholder="Add notes…"
                  as="textarea"
                  onSave={(v) => save.mutate({ secondary_goal: v })}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
