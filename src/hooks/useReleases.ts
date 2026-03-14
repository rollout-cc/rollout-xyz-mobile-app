import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useReleases(teamId: string | null) {
  return useQuery({
    queryKey: ["releases", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("releases")
        .select("*, artist:artists(id, name, avatar_url)")
        .eq("team_id", teamId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}

export function useRelease(releaseId: string | undefined) {
  return useQuery({
    queryKey: ["release", releaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("releases")
        .select("*, artist:artists(id, name, avatar_url)")
        .eq("id", releaseId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!releaseId,
  });
}

export function useCreateRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: {
      team_id: string;
      artist_id: string;
      name: string;
      release_type: string;
    }) => {
      const { data, error } = await supabase
        .from("releases")
        .insert(r)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["releases", d.team_id] }),
  });
}

export function useUpdateRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      [key: string]: any;
    }) => {
      const { data, error } = await supabase
        .from("releases")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["releases", d.team_id] });
      qc.invalidateQueries({ queryKey: ["release", d.id] });
    },
  });
}

export function useDeleteRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase.from("releases").delete().eq("id", id);
      if (error) throw error;
      return teamId;
    },
    onSuccess: (teamId) => qc.invalidateQueries({ queryKey: ["releases", teamId] }),
  });
}

// ── Release Tracks ──
export function useReleaseTracks(releaseId: string | undefined) {
  return useQuery({
    queryKey: ["release-tracks", releaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("release_tracks")
        .select("*")
        .eq("release_id", releaseId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!releaseId,
  });
}

export function useUpsertReleaseTracks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      releaseId,
      tracks,
    }: {
      releaseId: string;
      tracks: {
        id?: string;
        title: string;
        isrc_code?: string;
        song_id?: string;
        sort_order: number;
        is_explicit?: boolean;
        audio_url?: string;
      }[];
    }) => {
      // Delete existing and re-insert
      await supabase.from("release_tracks").delete().eq("release_id", releaseId);
      if (tracks.length > 0) {
        const { error } = await supabase
          .from("release_tracks")
          .insert(tracks.map((t) => ({ ...t, release_id: releaseId })));
        if (error) throw error;
      }
      return releaseId;
    },
    onSuccess: (releaseId) =>
      qc.invalidateQueries({ queryKey: ["release-tracks", releaseId] }),
  });
}

// ── Release Platforms ──
export function useReleasePlatforms(releaseId: string | undefined) {
  return useQuery({
    queryKey: ["release-platforms", releaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("release_platforms")
        .select("*")
        .eq("release_id", releaseId!);
      if (error) throw error;
      return data;
    },
    enabled: !!releaseId,
  });
}

export function useUpsertReleasePlatforms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      releaseId,
      platforms,
    }: {
      releaseId: string;
      platforms: { platform: string; enabled: boolean }[];
    }) => {
      await supabase.from("release_platforms").delete().eq("release_id", releaseId);
      if (platforms.length > 0) {
        const { error } = await supabase
          .from("release_platforms")
          .insert(platforms.map((p) => ({ ...p, release_id: releaseId })));
        if (error) throw error;
      }
      return releaseId;
    },
    onSuccess: (releaseId) =>
      qc.invalidateQueries({ queryKey: ["release-platforms", releaseId] }),
  });
}
