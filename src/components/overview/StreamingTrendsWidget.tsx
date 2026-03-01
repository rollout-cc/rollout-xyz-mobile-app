import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface ArtistStreamData {
  id: string;
  name: string;
  avatar_url: string | null;
  monthly_listeners: number | null;
  previousListeners: number | null;
}

interface StreamingTrendsWidgetProps {
  artists: ArtistStreamData[];
  teamId: string | null;
}

function formatListeners(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function DeltaIndicator({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null || previous === 0) {
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  }

  const delta = current - previous;
  const pct = ((delta / previous) * 100).toFixed(1);

  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-500">
        <TrendingUp className="h-3.5 w-3.5" /> +{pct}%
      </span>
    );
  } else if (delta < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-destructive">
        <TrendingDown className="h-3.5 w-3.5" /> {pct}%
      </span>
    );
  }

  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function StreamingTrendsWidget({ artists, teamId }: StreamingTrendsWidgetProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const logListenersMutation = useMutation({
    mutationFn: async () => {
      // Log current monthly_listeners for all artists that have data
      const rows = artists
        .filter((a) => a.monthly_listeners !== null && a.monthly_listeners > 0)
        .map((a) => ({
          artist_id: a.id,
          monthly_listeners: a.monthly_listeners!,
          recorded_at: new Date().toISOString().split("T")[0],
        }));

      if (rows.length === 0) throw new Error("No listener data to log");

      const { error } = await supabase
        .from("monthly_listener_history" as any)
        .upsert(rows as any, { onConflict: "artist_id,recorded_at" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listener data logged for today");
      qc.invalidateQueries({ queryKey: ["listener-history"] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to log listener data");
    },
  });

  if (artists.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No artists in roster yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="caption-bold">{artists.length} artists</span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => logListenersMutation.mutate()}
          disabled={logListenersMutation.isPending}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", logListenersMutation.isPending && "animate-spin")} />
          Log Today
        </Button>
      </div>

      <div className="space-y-0">
        {artists.map((artist) => (
          <div
            key={artist.id}
            className="flex items-center gap-3 py-3 border-b border-border last:border-b-0 hover:bg-accent/30 cursor-pointer transition-colors px-1 -mx-1"
            onClick={() => navigate(`/roster/${artist.id}`)}
          >
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={artist.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs font-bold">{artist.name[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm text-foreground truncate block">{artist.name}</span>
              <span className="caption text-muted-foreground">
                {formatListeners(artist.monthly_listeners)} listeners
              </span>
            </div>

            <DeltaIndicator current={artist.monthly_listeners} previous={artist.previousListeners} />
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
