import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useTeams } from "@/hooks/useTeams";

interface TeamContextType {
  selectedTeamId: string | null;
  setSelectedTeamId: (id: string) => void;
  /** Current user's role in the selected team */
  role: string | null;
  /** Whether the current user is team_owner or manager */
  canManage: boolean;
}

const TeamContext = createContext<TeamContextType>({
  selectedTeamId: null,
  setSelectedTeamId: () => {},
  role: null,
  canManage: false,
});

export const useSelectedTeam = () => useContext(TeamContext);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { data: teams = [] } = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
    // If selected team no longer exists in list, reset
    if (selectedTeamId && teams.length > 0 && !teams.find((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const role = useMemo(() => {
    if (!selectedTeamId || teams.length === 0) return null;
    return teams.find((t) => t.id === selectedTeamId)?.role ?? null;
  }, [teams, selectedTeamId]);

  const canManage = role === "team_owner" || role === "manager";

  return (
    <TeamContext.Provider value={{ selectedTeamId, setSelectedTeamId, role, canManage }}>
      {children}
    </TeamContext.Provider>
  );
}
