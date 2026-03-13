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
  canViewFinance: false,
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

  // Fetch user's job_role for finance permission detection
  const { data: profile } = useQuery({
    queryKey: ["my-profile-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("job_role")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const canManage = role === "team_owner" || role === "manager";
  const isArtistRole = role === "artist";
  const isGuestRole = role === "guest";

  // Get stored permission flags from the membership
  const membershipPerms = useMemo(() => {
    if (!selectedTeamId || teams.length === 0) return null;
    return teams.find((t) => t.id === selectedTeamId) ?? null;
  }, [teams, selectedTeamId]);

  const isFinanceJobTitle = useMemo(() => {
    if (!profile?.job_role) return false;
    const lower = profile.job_role.toLowerCase();
    return FINANCE_JOB_TITLES.some((t) => lower.includes(t));
  }, [profile?.job_role]);

  // Role-based defaults as baseline; stored flags as overrides
  const permissions = useMemo(() => {
    const isOwner = role === "team_owner";
    const isManager = role === "manager";

    // Team owners always get everything
    if (isOwner) {
      return {
        canViewCompany: true,
        canViewFinance: true,
        canManageFinance: true,
        canViewStaffSalaries: true,
        canViewAR: true,
        canViewRoster: true,
        canEditArtists: true,
        canViewBilling: true,
      };
    }

    // Managers: role defaults OR stored flags (union/additive)
    if (isManager) {
      return {
        canViewCompany: true,
        canViewFinance: true,
        canManageFinance: !!membershipPerms?.perm_manage_finance || isFinanceJobTitle,
        canViewStaffSalaries: !!membershipPerms?.perm_view_staff_salaries,
        canViewAR: true,
        canViewRoster: true,
        canEditArtists: true,
        canViewBilling: !!membershipPerms?.perm_view_billing,
      };
    }

    // Artist/Guest: stored flags only
    return {
      canViewCompany: false,
      canViewFinance: !!membershipPerms?.perm_view_finance,
      canManageFinance: !!membershipPerms?.perm_manage_finance,
      canViewStaffSalaries: !!membershipPerms?.perm_view_staff_salaries,
      canViewAR: !!membershipPerms?.perm_view_ar,
      canViewRoster: !!membershipPerms?.perm_view_roster,
      canEditArtists: !!membershipPerms?.perm_edit_artists,
      canViewBilling: !!membershipPerms?.perm_view_billing,
    };
  }, [role, membershipPerms, isFinanceJobTitle]);

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
