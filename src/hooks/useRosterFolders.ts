import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRosterFolders(teamId: string | null) {
  return useQuery({
    queryKey: ["roster-folders", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_folders")
        .select("*")
        .eq("team_id", teamId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}

export function useCreateRosterFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, name }: { teamId: string; name: string }) => {
      const { data, error } = await supabase
        .from("roster_folders")
        .insert({ team_id: teamId, name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roster-folders"] }),
  });
}

export function useDeleteRosterFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roster_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roster-folders"] });
      qc.invalidateQueries({ queryKey: ["artists"] });
    },
  });
}

export function useUpdateRosterFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("roster_folders").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roster-folders"] }),
  });
}

export function useSetArtistFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ artistId, folderId }: { artistId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from("artists")
        .update({ folder_id: folderId } as any)
        .eq("id", artistId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artists"] }),
  });
}

export function useReorderArtistsInFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; folder_sort_order: number }[]) => {
      for (const u of updates) {
        const { error } = await supabase
          .from("artists")
          .update({ folder_sort_order: u.folder_sort_order } as any)
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artists"] }),
  });
}
