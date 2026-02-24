import { BarChart3, TrendingUp, DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useArtistPerformance } from "@/hooks/useArtistPerformance";

function formatStat(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function formatRevenue(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${n.toLocaleString()}`;
}

interface PerformancePillsProps {
  artistId: string;
  spotifyId: string | null | undefined;
  artistName?: string;
  variant?: "banner" | "compact";
}

export function PerformancePills({ artistId, spotifyId, artistName, variant = "banner" }: PerformancePillsProps) {
  const { data, isSyncing, sync, isStale } = useArtistPerformance(artistId, spotifyId, artistName);

  if (!spotifyId) return null;

  // No data yet — show sync prompt
  if (!data) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md text-xs gap-1"
        onClick={() => sync()}
        disabled={isSyncing}
      >
        <BarChart3 className="h-3 w-3" />
        {isSyncing ? "Syncing..." : "Sync Performance"}
      </Button>
    );
  }

  const pills = [
    {
      icon: BarChart3,
      label: "Streams",
      value: formatStat(data.lead_streams_total),
      show: data.lead_streams_total > 0,
    },
    {
      icon: TrendingUp,
      label: "Monthly",
      value: formatStat(data.monthly_streams),
      show: data.monthly_streams > 0,
    },
    {
      icon: DollarSign,
      label: "Est. Rev",
      value: formatRevenue(data.est_monthly_revenue),
      show: data.est_monthly_revenue > 0,
    },
  ].filter((p) => p.show);

  if (pills.length === 0) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md text-xs gap-1"
        onClick={() => sync()}
        disabled={isSyncing}
      >
        <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Syncing..." : "No data — Sync"}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pills.map((pill) => (
        <div
          key={pill.label}
          className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10 text-white"
        >
          <pill.icon className="h-3 w-3 text-white/70" />
          <span className="text-[10px] uppercase tracking-wider text-white/60">{pill.label}</span>
          <span className="text-sm font-bold">{pill.value}</span>
        </div>
      ))}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10"
        onClick={() => sync()}
        disabled={isSyncing}
        title="Refresh performance data"
      >
        <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
