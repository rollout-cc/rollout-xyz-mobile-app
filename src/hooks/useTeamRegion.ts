import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { REGIONS, CURRENCIES, type RegionCode, type CurrencyCode } from "@/lib/regionConfig";

/**
 * Returns the current team's region and currency config.
 */
export function useTeamRegion() {
  const { selectedTeamId } = useSelectedTeam();

  const { data, isLoading } = useQuery({
    queryKey: ["team-region", selectedTeamId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("teams")
        .select("region, base_currency")
        .eq("id", selectedTeamId)
        .single();
      if (error) throw error;
      return data as { region: string; base_currency: string };
    },
    enabled: !!selectedTeamId,
    staleTime: 5 * 60 * 1000,
  });

  const regionCode = (data?.region ?? "us") as RegionCode;
  const currencyCode = (data?.base_currency ?? "USD") as CurrencyCode;

  return {
    regionCode,
    region: REGIONS[regionCode] ?? REGIONS.us,
    currencyCode,
    currency: CURRENCIES[currencyCode] ?? CURRENCIES.USD,
    isLoading,
  };
}
