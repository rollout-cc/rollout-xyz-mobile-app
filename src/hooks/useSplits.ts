import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Projects ──
export function useSplitProjects(artistId: string | undefined) {
  return useQuery({
    queryKey: ["split-projects", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("split_projects")
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });
}

export function useCreateSplitProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { artist_id: string; name: string; project_type: string }) => {
      const { data, error } = await supabase.from("split_projects").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["split-projects", d.artist_id] }),
  });
}

export function useDeleteSplitProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, artistId }: { id: string; artistId: string }) => {
      const { error } = await supabase.from("split_projects").delete().eq("id", id);
      if (error) throw error;
      return artistId;
    },
    onSuccess: (artistId) => qc.invalidateQueries({ queryKey: ["split-projects", artistId] }),
  });
}

// ── Songs ──
export function useSplitSongs(projectId: string | undefined) {
  return useQuery({
    queryKey: ["split-songs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("split_songs")
        .select("*")
        .eq("project_id", projectId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateSplitSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: { project_id: string; title: string }) => {
      const { data, error } = await supabase.from("split_songs").insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["split-songs", d.project_id] }),
  });
}

export function useDeleteSplitSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("split_songs").delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => qc.invalidateQueries({ queryKey: ["split-songs", projectId] }),
  });
}

// ── Contributors (team-wide) ──
export function useSplitContributors(teamId: string | null) {
  return useQuery({
    queryKey: ["split-contributors", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("split_contributors")
        .select("*")
        .eq("team_id", teamId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}

export function useUpsertSplitContributor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: {
      id?: string;
      team_id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      pro_affiliation?: string | null;
      ipi_number?: string | null;
      pub_ipi_number?: string | null;
    }) => {
      if (c.id) {
        const { data, error } = await supabase.from("split_contributors").update(c).eq("id", c.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("split_contributors").insert(c).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["split-contributors", d.team_id] }),
  });
}

// ── Entries ──
export function useSplitEntries(songId: string | undefined) {
  return useQuery({
    queryKey: ["split-entries", songId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("split_entries")
        .select("*, contributor:split_contributors(*)")
        .eq("song_id", songId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!songId,
  });
}

export function useCreateSplitEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: { song_id: string; contributor_id: string; role?: string }) => {
      const { data, error } = await supabase.from("split_entries").insert(e).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["split-entries", d.song_id] }),
  });
}

export function useUpdateSplitEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, songId, ...patch }: { id: string; songId: string; [key: string]: any }) => {
      const { error } = await supabase.from("split_entries").update(patch).eq("id", id);
      if (error) throw error;
      return songId;
    },
    onSuccess: (songId) => qc.invalidateQueries({ queryKey: ["split-entries", songId] }),
  });
}

export function useDeleteSplitEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, songId }: { id: string; songId: string }) => {
      const { error } = await supabase.from("split_entries").delete().eq("id", id);
      if (error) throw error;
      return songId;
    },
    onSuccess: (songId) => qc.invalidateQueries({ queryKey: ["split-entries", songId] }),
  });
}
