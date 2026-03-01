import { useState, useMemo, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useProspects, useCreateProspect, useUpdateProspect, useDeleteProspect } from "@/hooks/useProspects";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, LayoutGrid, List, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewProspectDialog } from "@/components/ar/NewProspectDialog";
import { PipelineBoard } from "@/components/ar/PipelineBoard";
import { ProspectTable } from "@/components/ar/ProspectTable";
import { ProspectDrawer } from "@/components/ar/ProspectDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string }[];
  followers?: { total: number };
}

export default function ARList() {
  const { data: prospects = [], isLoading } = useProspects();
  const { selectedTeamId: teamId } = useSelectedTeam();
  const createProspect = useCreateProspect();
  const updateProspect = useUpdateProspect();
  const deleteProspect = useDeleteProspect();
  const [view, setView] = useState<"board" | "table">("board");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);

  // Spotify search state
  const [spotifyResults, setSpotifyResults] = useState<SpotifyArtist[]>([]);
  const [spotifySearching, setSpotifySearching] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const filtered = useMemo(() => {
    if (!search.trim()) return prospects;
    const q = search.toLowerCase();
    return prospects.filter(
      (p: any) =>
        p.artist_name?.toLowerCase().includes(q) ||
        p.primary_genre?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q)
    );
  }, [prospects, search]);

  // Spotify search on typing
  useEffect(() => {
    if (!search.trim() || search.trim().length < 2) {
      setSpotifyResults([]);
      setAddedIds(new Set());
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSpotifySearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("spotify-search", {
          body: { q: search.trim() },
        });
        if (error) throw error;
        setSpotifyResults(data?.artists ?? []);
      } catch {
        setSpotifyResults([]);
      } finally {
        setSpotifySearching(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const handleAddFromSpotify = async (artist: SpotifyArtist) => {
    if (!teamId) return;
    setAddingIds((prev) => new Set(prev).add(artist.id));
    try {
      const result = await createProspect.mutateAsync({
        team_id: teamId,
        artist_name: artist.name,
        primary_genre: artist.genres?.[0] || undefined,
        spotify_uri: `spotify:artist:${artist.id}`,
        monthly_listeners: artist.followers?.total,
        avatar_url: artist.images?.[0]?.url,
        stage: "contacted",
      });
      toast.success(`${artist.name} added as prospect`);
      setSelectedProspectId(result.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(artist.id);
        return next;
      });
    }
  };

  // Quick metrics
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));

  const byStage = useMemo(() => {
    const counts: Record<string, number> = {};
    (["contacted", "internal_review", "offer_sent", "negotiating", "signed", "passed"] as const).forEach((s) => (counts[s] = 0));
    prospects.forEach((p: any) => {
      counts[p.stage] = (counts[p.stage] || 0) + 1;
    });
    return counts;
  }, [prospects]);

  const pipelineCount = prospects.filter((p: any) => p.stage !== "passed").length;
  const offersSent = (byStage["offer_sent"] || 0) + (byStage["negotiating"] || 0);
  const signedCount = byStage["signed"] || 0;
  const declinedCount = byStage["passed"] || 0;
  const followUpsDue = prospects.filter(
    (p: any) => p.next_follow_up && new Date(p.next_follow_up) <= endOfWeek && !["signed", "passed"].includes(p.stage)
  ).length;

  const showSpotifySection = search.trim().length >= 2 && (spotifyResults.length > 0 || spotifySearching);

  const existingSpotifyIds = useMemo(() => {
    const ids = new Set<string>();
    prospects.forEach((p: any) => {
      if (p.spotify_uri) {
        const match = p.spotify_uri.match(/spotify:artist:(\w+)/);
        if (match) ids.add(match[1]);
      }
    });
    return ids;
  }, [prospects]);

  return (
    <AppLayout title="A&R">
      {/* Header row: title + metrics inline */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-foreground">A&R Research</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track and manage artist prospects
          </p>
        </div>
        <div className="flex items-center gap-4 pt-1">
          <MetricPill label="Pipeline" value={pipelineCount} />
          <MetricPill label="Offers" value={offersSent} />
          <MetricPill label="Signed" value={signedCount} accent="text-emerald-500" />
          <MetricPill label="Declined" value={declinedCount} accent={declinedCount > 0 ? "text-destructive" : undefined} />
          <MetricPill label="Follow-ups" value={followUpsDue} accent={followUpsDue > 0 ? "text-amber-500" : undefined} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospects or find on Spotify..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center border border-border rounded-md">
          <button
            onClick={() => setView("board")}
            className={cn(
              "px-3 py-1.5 text-sm transition-colors rounded-l-md",
              view === "board" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "px-3 py-1.5 text-sm transition-colors rounded-r-md",
              view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="gap-1">
          <Plus className="h-4 w-4" /> New Prospect
        </Button>
      </div>

      {/* Spotify search results */}
      {showSpotifySection && (
        <div className="mb-5 rounded-xl border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Spotify Results</p>
          {spotifySearching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto">
              {spotifyResults.map((artist) => {
                const alreadyAdded = existingSpotifyIds.has(artist.id) || addedIds.has(artist.id);
                const adding = addingIds.has(artist.id);
                return (
                  <div
                    key={artist.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border border-border",
                      !alreadyAdded && !adding && "cursor-pointer hover:bg-accent/50"
                    )}
                    onClick={() => {
                      if (!alreadyAdded && !adding) handleAddFromSpotify(artist);
                    }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={artist.images?.[0]?.url} />
                      <AvatarFallback>{artist.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{artist.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {artist.genres.slice(0, 3).join(", ") || "No genres"}
                      </p>
                    </div>
                    {alreadyAdded ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5" /> Added
                      </div>
                    ) : adding ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAddFromSpotify(artist); }}>
                        Add
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pipeline / Table — full remaining space */}
      <div className="flex-1">
        {view === "board" ? (
          <PipelineBoard
            prospects={filtered}
            onSelect={(id) => setSelectedProspectId(id)}
            onStageChange={(id, stage) => {
              updateProspect.mutate({ id, stage } as any);
              toast.success("Stage updated");
            }}
            onDelete={(id) => {
              deleteProspect.mutate(id, { onSuccess: () => toast.success("Prospect deleted") });
            }}
          />
        ) : (
          <ProspectTable
            prospects={filtered}
            onSelect={(id) => setSelectedProspectId(id)}
            onDelete={(id) => {
              deleteProspect.mutate(id, { onSuccess: () => toast.success("Prospect deleted") });
            }}
          />
        )}
      </div>

      <NewProspectDialog open={showNew} onOpenChange={setShowNew} teamId={teamId} />
      <ProspectDrawer prospectId={selectedProspectId} onClose={() => setSelectedProspectId(null)} />
    </AppLayout>
  );
}

function MetricPill({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-bold text-sm", accent || "text-foreground")}>{value}</span>
    </div>
  );
}
