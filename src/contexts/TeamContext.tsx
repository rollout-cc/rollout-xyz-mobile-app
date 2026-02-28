import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useTeams } from "@/hooks/useTeams";

interface TeamContextType {
  selectedTeamId: string | null;
  setSelectedTeamId: (id: string) => void;
}

const TeamContext = createContext<TeamContextType>({
  selectedTeamId: null,
  setSelectedTeamId: () => {},
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

  return (
    <TeamContext.Provider value={{ selectedTeamId, setSelectedTeamId }}>
      {children}
    </TeamContext.Provider>
  );
}
