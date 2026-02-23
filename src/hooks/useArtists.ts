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
          budgets(label, amount)
        `)
        .eq("team_id", teamId!);
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["artists", variables.team_id] });
    },
  });
}
