import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";

export function useProspects() {
  const { selectedTeamId: teamId } = useSelectedTeam();

  return useQuery({
    queryKey: ["prospects", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .eq("team_id", teamId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}

export function useProspect(id: string | undefined) {
  return useQuery({
    queryKey: ["prospect", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      team_id: string;
      artist_name: string;
      primary_genre?: string;
      city?: string;
      spotify_uri?: string;
      avatar_url?: string;
      instagram?: string;
      tiktok?: string;
      youtube?: string;
      monthly_listeners?: number;
      notes?: string;
      stage?: string;
      priority?: string;
      owner_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("prospects")
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospects"] }),
  });
}

export function useUpdateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("prospects")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["prospect", vars.id] });
    },
  });
}

export function useDeleteProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("prospects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospects"] }),
  });
}

export function useProspectEngagements(prospectId: string | undefined) {
  return useQuery({
    queryKey: ["prospect-engagements", prospectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_engagements")
        .select("*")
        .eq("prospect_id", prospectId!)
        .order("engagement_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!prospectId,
  });
}

export function useCreateEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      prospect_id: string;
      engagement_date: string;
      engagement_type: string;
      outcome?: string;
      next_step?: string;
      owner_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("prospect_engagements")
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["prospect-engagements", vars.prospect_id] }),
  });
}

export function useProspectContacts(prospectId: string | undefined) {
  return useQuery({
    queryKey: ["prospect-contacts", prospectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_contacts")
        .select("*")
        .eq("prospect_id", prospectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!prospectId,
  });
}

export function useCreateProspectContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      prospect_id: string;
      name: string;
      role?: string;
      email?: string;
      phone?: string;
    }) => {
      const { data, error } = await supabase
        .from("prospect_contacts")
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["prospect-contacts", vars.prospect_id] }),
  });
}

export function useProspectDeal(prospectId: string | undefined) {
  return useQuery({
    queryKey: ["prospect-deal", prospectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_deals")
        .select("*")
        .eq("prospect_id", prospectId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!prospectId,
  });
}

export function useUpsertDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id?: string; prospect_id: string; [key: string]: any }) => {
      if (id) {
        const { data, error } = await supabase
          .from("prospect_deals")
          .update(values)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("prospect_deals")
          .insert(values as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["prospect-deal", vars.prospect_id] }),
  });
}
