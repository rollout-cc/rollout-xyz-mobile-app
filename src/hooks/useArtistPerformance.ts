import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PerformanceSnapshot {
  id: string;
  artist_id: string;
  lead_streams_total: number;
  feat_streams_total: number;
  daily_streams: number;
  monthly_streams: number;
  monthly_listeners_all: number;
  est_monthly_revenue: number;
  scraped_at: string;
}

export function useArtistPerformance(artistId: string, spotifyId: string | null | undefined, artistName?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["artist-performance", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_performance_snapshots")
        .select("*")
        .eq("artist_id", artistId)
        .maybeSingle();
      if (error) throw error;
      return data as PerformanceSnapshot | null;
    },
    enabled: !!artistId,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!spotifyId) throw new Error("No Spotify ID for this artist");
      const resp = await supabase.functions.invoke("scrape-chartmasters", {
        body: { artist_id: artistId, spotify_id: spotifyId, artist_name: artistName || "" },
      });
      // supabase.functions.invoke returns error for non-2xx; parse the body for details
      if (resp.error) {
        const msg = resp.data?.error || resp.data?.message || "This artist may not be indexed on ChartMasters.";
        throw new Error(msg);
      }
      if (resp.data?.mismatch) throw new Error(resp.data.error);
      if (resp.data?.error) throw new Error(resp.data.error);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist-performance", artistId] });
      toast.success("Performance data synced from ChartMasters");
    },
    onError: (e: any) => {
      toast.error(`Sync failed: ${e.message}`);
    },
  });

  // Check if data is stale (>24h)
  const isStale = query.data
    ? Date.now() - new Date(query.data.scraped_at).getTime() > 24 * 60 * 60 * 1000
    : true;

  return {
    data: query.data,
    isLoading: query.isLoading,
    isStale,
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
  };
}
