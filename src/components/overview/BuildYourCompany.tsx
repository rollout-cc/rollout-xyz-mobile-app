import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeams } from "@/hooks/useTeams";
import { CompanyOnboardingWizard } from "@/components/onboarding/CompanyOnboardingWizard";

interface Props {
  teamId: string;
  onComplete: () => void;
}

/**
 * Shows budget-only wizard if:
 * - onboarding_completed is true
 * - annual_budget is null/0
 * - current user is team_owner
 */
export function BuildYourCompany({ teamId, onComplete }: Props) {
  return <CompanyOnboardingWizard teamId={teamId} onComplete={onComplete} />;
}

export function useShouldShowBudgetWizard(teamId: string | null) {
  const { data: teams = [] } = useTeams();
  const myRole = teams.find((t) => t.id === teamId)?.role ?? null;

  const { data: team } = useQuery({
    queryKey: ["team-budget-check", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("annual_budget, onboarding_completed")
        .eq("id", teamId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const showBudgetWizard =
    myRole === "team_owner" &&
    (team as any)?.onboarding_completed === true &&
    (!team?.annual_budget || Number(team.annual_budget) === 0);

  return showBudgetWizard;
}
