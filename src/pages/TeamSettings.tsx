import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { useTeams } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamPlan } from "@/hooks/useTeamPlan";

type TeamSubSection = "members" | "profile";

export default function TeamSettings() {
  const navigate = useNavigate();
  const { data: teams = [] } = useTeams();
  const { selectedTeamId } = useSelectedTeam();
  const { isPaid, isTrialing } = useTeamPlan();
  const hasPaidAccess = isPaid || isTrialing;

  const myRole = teams.find((t) => t.id === selectedTeamId)?.role;
  const isOwnerOrManager = myRole === "team_owner" || myRole === "manager";

  const [teamSubSection, setTeamSubSection] = useState<TeamSubSection>("members");

  if (!isOwnerOrManager || !hasPaidAccess) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <AppLayout title="Team Settings" onBack={() => navigate(-1)}>
      <div className="max-w-3xl">
        <div className="flex gap-1 mb-6">
          {([
            { key: "members" as const, label: "Members" },
            { key: "profile" as const, label: "Team Profile" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTeamSubSection(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                teamSubSection === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="border-t border-border" />

        <div className="mt-6">
          <TeamManagement showSection={teamSubSection === "members" ? "members" : "profile"} />
        </div>
      </div>
    </AppLayout>
  );
}
