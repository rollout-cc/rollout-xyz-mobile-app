import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useArtists(teamId: string | null) {
  return useQuery({
    queryKey: ["artists", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select(`
          *,
          initiatives(count),
          tasks(count),
          budgets(id, label, amount),
          transactions(amount, type, budget_id, revenue_category, revenue_source)
        `)
        .eq("team_id", teamId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}

export function useCreateArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (artist: {
      team_id: string;
      name: string;
      avatar_url?: string;
      spotify_id?: string;
      genres?: string[];
    }) => {
      const { data, error } = await supabase
        .from("artists")
        .insert(artist)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["artists", variables.team_id] });
      // Fire-and-forget notification
      import("@/lib/notifications").then(({ notifyNewArtist }) => {
        notifyNewArtist(variables.team_id, variables.name, undefined, variables.avatar_url);
      });
      // Fire-and-forget: fetch monthly listeners if spotify_id present
      if (variables.spotify_id && data.id) {
        supabase.functions.invoke("spotify-artist", {
          body: { spotify_id: variables.spotify_id },
        }).then(({ data: spotifyData }) => {
          if (spotifyData?.monthly_listeners) {
            supabase
              .from("artists")
              .update({ monthly_listeners: spotifyData.monthly_listeners })
              .eq("id", data.id)
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ["artists", variables.team_id] });
              });
          }
        }).catch(() => { /* silent fail */ });
      }
    },
  });
}

export function useDeleteArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase.from("artists").delete().eq("id", id);
      if (error) throw error;
      return { teamId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["artists", data.teamId] });
    },
  });
}
