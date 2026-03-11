import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useTeams } from "@/hooks/useTeams";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FINANCE_JOB_TITLES = ["finance", "operations", "accountant", "accounting", "cfo", "controller", "bookkeeper", "business manager"];

interface TeamContextType {
  selectedTeamId: string | null;
  setSelectedTeamId: (id: string) => void;
  role: string | null;
  canManage: boolean;
  canViewCompany: boolean;
  canViewFinance: boolean;
  canManageFinance: boolean;
  canViewStaffSalaries: boolean;
  canViewAR: boolean;
  canViewRoster: boolean;
  canEditArtists: boolean;
  canViewBilling: boolean;
  isArtistRole: boolean;
  isGuestRole: boolean;
  assignedArtistIds: string[];
}

const TeamContext = createContext<TeamContextType>({
  selectedTeamId: null,
  setSelectedTeamId: () => {},
  role: null,
  canManage: false,
  canViewCompany: false,
  canManageFinance: false,
  canViewStaffSalaries: false,
  canViewAR: false,
  canViewRoster: false,
  canEditArtists: false,
  canViewBilling: false,
  isArtistRole: false,
  isGuestRole: false,
  assignedArtistIds: [],
});

export const useSelectedTeam = () => useContext(TeamContext);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { data: teams = [] } = useTeams();
  const { user } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
    if (selectedTeamId && teams.length > 0 && !teams.find((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const role = useMemo(() => {
    if (!selectedTeamId || teams.length === 0) return null;
    return teams.find((t) => t.id === selectedTeamId)?.role ?? null;
  }, [teams, selectedTeamId]);

  // Query assigned artist IDs for artist/guest roles
  const { data: assignedArtistIds = [] } = useQuery({
    queryKey: ["my-artist-permissions", user?.id, selectedTeamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_permissions")
        .select("artist_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((p) => p.artist_id);
    },
    enabled: !!user && (role === "artist" || role === "guest"),
  });

  const canManage = role === "team_owner" || role === "manager";
  const isArtistRole = role === "artist";
  const isGuestRole = role === "guest";

  const permissions = useMemo(() => ({
    canViewCompany: role === "team_owner" || role === "manager",
    canViewFinance: role === "team_owner" || role === "manager",
    canViewStaffSalaries: role === "team_owner",
    canViewAR: role === "team_owner" || role === "manager",
    canViewRoster: role === "team_owner" || role === "manager",
    canEditArtists: role === "team_owner" || role === "manager",
    canViewBilling: role === "team_owner",
  }), [role]);

  return (
    <TeamContext.Provider value={{
      selectedTeamId,
      setSelectedTeamId,
      role,
      canManage,
      isArtistRole,
      isGuestRole,
      assignedArtistIds,
      ...permissions,
    }}>
      {children}
    </TeamContext.Provider>
  );
}
