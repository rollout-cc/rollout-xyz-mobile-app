import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { StaffMetricsSection, type StaffMember } from "@/components/overview/StaffMetricsSection";

export default function Staff() {
  const { selectedTeamId: teamId } = useSelectedTeam();

  const { data: memberships = [] } = useQuery({
    queryKey: ["staff-memberships", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("user_id, role")
        .eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const memberUserIds = useMemo(() => memberships.map((m) => m.user_id), [memberships]);

  const { data: memberProfiles = [] } = useQuery({
    queryKey: ["staff-profiles", memberUserIds],
    queryFn: async () => {
      if (memberUserIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", memberUserIds);
      if (error) throw error;
      return data;
    },
    enabled: memberUserIds.length > 0,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["staff-tasks", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["staff-artists", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("id").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["staff-transactions", teamId],
    queryFn: async () => {
      const artistIds = artists.map((a) => a.id);
      if (artistIds.length === 0) return [];
      const { data, error } = await supabase.from("transactions").select("*").in("artist_id", artistIds);
      if (error) throw error;
      return data;
    },
    enabled: artists.length > 0,
  });

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString()}`;

  const staffMembers: StaffMember[] = useMemo(() => {
    return memberships.map((m) => {
      const profile = memberProfiles.find((p) => p.id === m.user_id);
      const memberTasks = tasks.filter((t: any) => t.assigned_to === m.user_id);
      const assigned = memberTasks.length;
      const completed = memberTasks.filter((t: any) => t.is_completed).length;
      const onTime = memberTasks.filter(
        (t: any) =>
          t.is_completed &&
          t.due_date &&
          t.completed_at &&
          new Date(t.completed_at) <= new Date(t.due_date)
      ).length;

      const completedTaskIds = new Set(
        memberTasks.filter((t: any) => t.is_completed).map((t: any) => t.id)
      );
      const revenue = transactions
        .filter((t: any) => t.type === "revenue" && t.task_id && completedTaskIds.has(t.task_id))
        .reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);

      const completionRate = assigned > 0 ? completed / assigned : 0;
      const onTimeRate = completed > 0 ? onTime / completed : 0;
      const maxRevenue = Math.max(
        1,
        ...memberships.map((mm) => {
          const mTasks = tasks.filter((t: any) => t.assigned_to === mm.user_id && t.is_completed);
          const mIds = new Set(mTasks.map((t: any) => t.id));
          return transactions
            .filter((t: any) => t.type === "revenue" && t.task_id && mIds.has(t.task_id))
            .reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
        })
      );
      const revenueFactor = revenue / maxRevenue;

      const score = Math.round(completionRate * 50 + onTimeRate * 30 + revenueFactor * 20);

      return {
        userId: m.user_id,
        fullName: profile?.full_name ?? "Unknown",
        avatarUrl: profile?.avatar_url ?? null,
        role: m.role,
        tasksAssigned: assigned,
        tasksCompleted: completed,
        tasksOnTime: onTime,
        revenueLogged: revenue,
        productivityScore: Math.min(score, 100),
      };
    }).sort((a, b) => b.productivityScore - a.productivityScore);
  }, [memberships, memberProfiles, tasks, transactions]);

  return (
    <AppLayout title="Staff">
      <div className="mb-6">
        <h1 className="text-foreground">Staff</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Team productivity and performance metrics
        </p>
      </div>
      <StaffMetricsSection members={staffMembers} fmt={fmt} />
    </AppLayout>
  );
}
