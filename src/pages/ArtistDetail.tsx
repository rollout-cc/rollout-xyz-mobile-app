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
import { DollarSign, Star, RefreshCw, Receipt, MoreVertical, CheckCheck, Mic } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ImportTranscriptDialog } from "@/components/meetings/ImportTranscriptDialog";
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
  const [transcriptOpen, setTranscriptOpen] = useState(false);
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
      {/* Hero: immersive art + fused frosted stats (Spotify / Apple / Revolut–inspired) */}
      <div
        className="group relative mb-4 block min-w-0 shrink-0 overflow-hidden rounded-xl bg-[#121212] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/[0.06] sm:mb-5"
        data-tour="artist-banner"
      >
        <div className="relative isolate">
          <div className="relative z-10 min-h-[13.5rem] w-full overflow-hidden sm:min-h-[min(17.5rem,32vw)] lg:min-h-[min(19rem,26vw)]">
            {/* Image only covers the hero band; object-top keeps the upper portion of the art in frame */}
            <img
              src={heroBannerSrc}
              alt=""
              className="absolute inset-0 z-0 h-full w-full object-cover object-top transition-transform duration-1000 ease-out group-hover:scale-[1.02] motion-reduce:transform-none"
            />
            {/* Figma-style scrim: #121212 @ 0% → 100% opacity for a smooth melt into the stats footer */}
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(18,18,18,0)_0%,rgba(18,18,18,0)_34%,rgba(18,18,18,0.18)_52%,rgba(18,18,18,0.52)_69%,rgba(18,18,18,0.88)_86%,rgb(18,18,18)_100%)]"
              aria-hidden
            />

            <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-end gap-1.5 px-3 pt-2.5 sm:px-5 sm:pt-3">
              <div className="flex shrink-0 items-center gap-1.5">
                {artist.spotify_id && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full border border-white/15 bg-black/30 text-white shadow-none backdrop-blur-md hover:bg-white/10 hover:border-white/25"
                    onClick={handleRefreshSpotify}
                    disabled={isRefreshingSpotify}
                    aria-label="Refresh Spotify data"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 opacity-90 ${isRefreshingSpotify ? "animate-spin" : ""}`} strokeWidth={1.75} />
                  </Button>
                )}
                {canEditArtists && <BannerUpload artistId={artist.id} currentBannerUrl={artist.banner_url} compact />}
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3 pt-10 sm:px-5 sm:pb-4 sm:pt-14">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="shrink-0">
                  <Avatar className="h-14 w-14 border-2 border-white/25 shadow-[0_8px_28px_-6px_rgba(0,0,0,0.6)] ring-2 ring-black/20 sm:h-[4.25rem] sm:w-[4.25rem] md:h-[4.5rem] md:w-[4.5rem]">
                    <AvatarImage src={avatarUrl ?? undefined} className="object-cover" />
                    <AvatarFallback className="bg-white/10 text-lg font-semibold text-white sm:text-2xl">
                      {artist.name[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-pretty text-xl font-bold leading-tight tracking-[-0.02em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-2xl md:text-3xl">
                    {artist.name}
                  </h2>
                  {(artist.genres && artist.genres.length > 0) || listenerStat > 0 ? (
                    <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs leading-snug text-white/55 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] sm:text-sm">
                      {artist.genres && artist.genres.length > 0 && (
                        <span className="font-medium text-white/70">{artist.genres.slice(0, 2).join(", ")}</span>
                      )}
                      {listenerStat > 0 && (
                        <>
                          {artist.genres && artist.genres.length > 0 && (
                            <span className="text-white/30" aria-hidden>
                              ·
                            </span>
                          )}
                          <span className="tabular-nums text-white/60">
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

          <div
            className="relative z-10 isolate min-h-0 overflow-hidden bg-[#121212] text-white antialiased"
            data-tour="artist-metrics"
          >
            <div className="relative z-[1] px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
              <div className="grid grid-cols-2 items-stretch gap-1.5 sm:gap-2 lg:grid-cols-4">
                <div className="flex h-full min-h-[4.5rem] min-w-0 w-full">
                  <ObjectiveKpiCard
                    artistId={artist.id}
                    slot={1}
                    objectiveType={(artist as any).objective_1_type}
                    objectiveTarget={(artist as any).objective_1_target}
                    currentValue={getObjectiveCurrentValue((artist as any).objective_1_type)}
                    variant="banner"
                  />
                </div>
                <div className="flex h-full min-h-[4.5rem] min-w-0 w-full">
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
                  className="flex h-full min-h-[4.5rem] min-w-0 flex-col rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 shadow-none backdrop-blur-xl"
                  onMouseEnter={(e) => {
                    const label = e.currentTarget.querySelector("[data-budget-label]") as HTMLElement;
                    const val = e.currentTarget.querySelector("[data-budget-value]") as HTMLElement;
                    if (label) label.textContent = "Remaining";
                    if (val) {
                      const remaining = totalBudget - totalSpent;
                      val.textContent =
                        remaining >= 1_000_000
                          ? `$${(remaining / 1_000_000).toFixed(1)}M`
                          : remaining >= 1_000
                            ? `$${(remaining / 1_000).toFixed(0)}K`
                            : `$${remaining.toLocaleString()}`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    const label = e.currentTarget.querySelector("[data-budget-label]") as HTMLElement;
                    const val = e.currentTarget.querySelector("[data-budget-value]") as HTMLElement;
                    if (label) label.textContent = "Budget";
                    if (val) {
                      val.textContent =
                        totalBudget >= 1_000_000
                          ? `$${(totalBudget / 1_000_000).toFixed(1)}M`
                          : totalBudget >= 1_000
                            ? `$${(totalBudget / 1_000).toFixed(0)}K`
                            : `$${totalBudget.toLocaleString()}`;
                    }
                  }}
                >
                  <p
                    data-budget-label
                    className="py-[2px] text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-white/40"
                  >
                    Budget
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 shrink-0 text-white/45" strokeWidth={1.75} aria-hidden />
                    <span
                      data-budget-value
                      className="text-[1.35rem] font-semibold tabular-nums leading-none tracking-tight text-white"
                    >
                      {totalBudget >= 1_000_000
                        ? `$${(totalBudget / 1_000_000).toFixed(1)}M`
                        : totalBudget >= 1_000
                          ? `$${(totalBudget / 1_000).toFixed(0)}K`
                          : `$${totalBudget.toLocaleString()}`}
                    </span>
                  </div>
                </div>
                <div className="flex h-full min-h-[4.5rem] min-w-0 flex-col rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 shadow-none backdrop-blur-xl">
                  <p className="py-[2px] text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-white/40">
                    Done
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <CheckCheck className="h-3.5 w-3.5 shrink-0 text-white/45" strokeWidth={1.75} aria-hidden />
                    <span className="text-[1.35rem] font-semibold tabular-nums leading-none tracking-tight text-white">
                      {completedCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
                {activeView === "work" && (
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setTranscriptOpen(true)}>
                    <Mic className="h-3 w-3" />
                    Import Transcript
                  </Button>
                )}
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
                    <>
                      <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={setShowArchived}>
                        Show Archived
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuItem onClick={() => setTranscriptOpen(true)}>
                        <Mic className="h-4 w-4 mr-2" />
                        Import Transcript
                      </DropdownMenuItem>
                    </>
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
