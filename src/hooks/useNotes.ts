import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedTeam } from "@/contexts/TeamContext";

export function useNotes() {
  const { user } = useAuth();
  const { selectedTeamId: teamId } = useSelectedTeam();

  return useQuery({
    queryKey: ["notes", user?.id, teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notes")
        .select("*, note_shares(id, shared_with)")
        .or(`user_id.eq.${user!.id}`)
        .eq("team_id", teamId!)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!teamId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { selectedTeamId: teamId } = useSelectedTeam();

  return useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase
        .from("user_notes")
        .insert({ user_id: user!.id, team_id: teamId!, title, content: "" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; title?: string; content?: string; is_pinned?: boolean }) => {
      const { error } = await supabase
        .from("user_notes")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...values }) => {
      await qc.cancelQueries({ queryKey: ["notes"] });
      qc.setQueriesData<any[]>({ queryKey: ["notes"] }, (old) =>
        old?.map((n) => (n.id === id ? { ...n, ...values } : n)) ?? []
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useShareNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ noteId, userId }: { noteId: string; userId: string }) => {
      const { error } = await supabase
        .from("note_shares")
        .insert({ note_id: noteId, shared_with: userId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUnshareNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ noteId, userId }: { noteId: string; userId: string }) => {
      const { error } = await supabase
        .from("note_shares")
        .delete()
        .eq("note_id", noteId)
        .eq("shared_with", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useTeamMembers() {
  const { selectedTeamId: teamId } = useSelectedTeam();
  return useQuery({
    queryKey: ["team-members-for-sharing", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("user_id, role, profiles:user_id(id, full_name, avatar_url)")
        .eq("team_id", teamId!);
      if (error) throw error;
      return data.map((m: any) => ({
        id: m.user_id,
        name: m.profiles?.full_name || "Unknown",
        avatar_url: m.profiles?.avatar_url,
        role: m.role,
      }));
    },
    enabled: !!teamId,
  });
}
