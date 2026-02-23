import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SpotifyArtistData {
  id: string;
  name: string;
  monthly_listeners: number;
  followers: number;
  genres: string[];
  images: { url: string; height: number; width: number }[];
  banner_url: string | null;
  popularity: number;
}

export function useSpotifyArtist(spotifyId: string | null | undefined) {
  return useQuery({
    queryKey: ["spotify-artist", spotifyId],
    queryFn: async (): Promise<SpotifyArtistData> => {
      const { data, error } = await supabase.functions.invoke("spotify-artist", {
        body: { spotify_id: spotifyId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    enabled: !!spotifyId,
    staleTime: 1000 * 60 * 30, // 30 min cache
  });
}
