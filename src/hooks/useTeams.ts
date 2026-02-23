import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useTeams() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["teams", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("team_id, role, teams(id, name, avatar_url)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((tm: any) => ({
        id: tm.teams.id,
        name: tm.teams.name,
        avatar_url: tm.teams.avatar_url,
        role: tm.role,
      }));
    },
    enabled: !!user,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (name: string) => {
      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({ name, created_by: user!.id })
        .select()
        .single();
      if (teamError) throw teamError;

      // Add creator as team_owner
      const { error: memberError } = await supabase
        .from("team_memberships")
        .insert({ user_id: user!.id, team_id: team.id, role: "team_owner" });
      if (memberError) throw memberError;

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
