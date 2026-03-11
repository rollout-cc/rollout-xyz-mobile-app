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
        .select("team_id, role, perm_view_finance, perm_manage_finance, perm_view_staff_salaries, perm_view_ar, perm_view_roster, perm_edit_artists, perm_view_billing, teams(id, name, avatar_url)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((tm: any) => ({
        id: tm.teams.id,
        name: tm.teams.name,
        avatar_url: tm.teams.avatar_url,
        role: tm.role,
        perm_view_finance: tm.perm_view_finance ?? false,
        perm_manage_finance: tm.perm_manage_finance ?? false,
        perm_view_staff_salaries: tm.perm_view_staff_salaries ?? false,
        perm_view_ar: tm.perm_view_ar ?? false,
        perm_view_roster: tm.perm_view_roster ?? false,
        perm_edit_artists: tm.perm_edit_artists ?? false,
        perm_view_billing: tm.perm_view_billing ?? false,
      }));
    },
    enabled: !!user,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, companyType }: { name: string; companyType?: string }) => {
      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({ name, created_by: user!.id, company_type: companyType || null })
        .select()
        .single();
      if (teamError) throw teamError;

      // Add creator as team_owner with all permissions enabled
      const { error: memberError } = await supabase
        .from("team_memberships")
        .insert({
          user_id: user!.id,
          team_id: team.id,
          role: "team_owner",
          perm_view_finance: true,
          perm_manage_finance: true,
          perm_view_staff_salaries: true,
          perm_view_ar: true,
          perm_view_roster: true,
          perm_edit_artists: true,
          perm_view_billing: true,
        });
      if (memberError) throw memberError;

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
