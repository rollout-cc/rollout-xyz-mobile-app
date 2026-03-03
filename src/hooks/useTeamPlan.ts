import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { FREE_LIMITS, getTierKeyFromSeats } from "@/lib/plans";

export interface TeamPlan {
  plan: "rising" | "icon" | "legend";
  seatLimit: number;
  status: string;
  isTrialing: boolean;
  trialDaysLeft: number;
  currentPeriodEnd: string | null;
  tierKey: string;
  /** Whether the team is on a paid plan (icon or legend) */
  isPaid: boolean;
  limits: {
    maxArtists: number | null;
    maxProspects: number | null;
    maxTasksPerMonth: number | null;
    canUseSplits: boolean;
    canUseFinance: boolean;
    canInviteMembers: boolean;
    canUsePermissions: boolean;
  };
}

const DEFAULT_PLAN: TeamPlan = {
  plan: "rising",
  seatLimit: 1,
  status: "active",
  isTrialing: false,
  trialDaysLeft: 0,
  currentPeriodEnd: null,
  tierKey: "rising",
  isPaid: false,
  limits: {
    maxArtists: FREE_LIMITS.maxArtists,
    maxProspects: FREE_LIMITS.maxProspects,
    maxTasksPerMonth: FREE_LIMITS.maxTasksPerMonth,
    canUseSplits: false,
    canUseFinance: false,
    canInviteMembers: false,
    canUsePermissions: false,
  },
};

export function useTeamPlan(): TeamPlan & { isLoading: boolean; refetch: () => void } {
  const { selectedTeamId } = useSelectedTeam();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["team-plan", selectedTeamId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        body: { team_id: selectedTeamId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTeamId,
    refetchInterval: 60_000, // every minute
    staleTime: 30_000,
  });

  if (!data) return { ...DEFAULT_PLAN, isLoading, refetch };

  const plan = data.plan as "rising" | "icon" | "legend";
  const isPaid = plan === "icon" || plan === "legend";

  return {
    plan,
    seatLimit: data.seat_limit,
    status: data.status,
    isTrialing: data.is_trialing,
    trialDaysLeft: data.trial_days_left,
    currentPeriodEnd: data.current_period_end,
    tierKey: getTierKeyFromSeats(data.seat_limit),
    isPaid,
    limits: {
      maxArtists: isPaid ? null : FREE_LIMITS.maxArtists,
      maxProspects: isPaid ? null : FREE_LIMITS.maxProspects,
      maxTasksPerMonth: isPaid ? null : FREE_LIMITS.maxTasksPerMonth,
      canUseSplits: isPaid,
      canUseFinance: isPaid,
      canInviteMembers: isPaid,
      canUsePermissions: isPaid,
    },
    isLoading,
    refetch,
  };
}
