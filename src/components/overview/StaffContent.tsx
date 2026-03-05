/**
 * StaffContent — extracted from pages/Staff.tsx for embedding in Company tabs.
 * Renders the full Staff UI without AppLayout wrapper.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { StaffMetricsSection, type StaffMember } from "@/components/overview/StaffMetricsSection";
import { InviteMemberDialog } from "@/components/settings/InviteMemberDialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export function StaffContent() {
  const { selectedTeamId: teamId, canManage } = useSelectedTeam();
  const [showInvite, setShowInvite] = useState(false);

  const { data: memberships = [] } = useQuery({
    queryKey: ["memberships", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_memberships").select("user_id, role").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const memberUserIds = useMemo(() => memberships.map((m) => m.user_id), [memberships]);

  const { data: memberProfiles = [] } = useQuery({
    queryKey: ["member-profiles", memberUserIds],
    queryFn: async () => {
      if (memberUserIds.length === 0) return [];
      const { data, error } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", memberUserIds);
      if (error) throw error;
      return data;
    },
    enabled: memberUserIds.length > 0,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["artists-summary", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("id").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", teamId],
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
    // Pre-compute maxRevenue in a single pass (O(n) instead of O(n²))
    const revenuePerMember: Record<string, number> = {};
    for (const m of memberships) {
      const mTasks = tasks.filter((t: any) => t.assigned_to === m.user_id && t.is_completed);
      const mIds = new Set(mTasks.map((t: any) => t.id));
      revenuePerMember[m.user_id] = transactions
        .filter((t: any) => t.type === "revenue" && t.task_id && mIds.has(t.task_id))
        .reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
    }
    const maxRevenue = Math.max(1, ...Object.values(revenuePerMember));

    return memberships.map((m) => {
      const profile = memberProfiles.find((p) => p.id === m.user_id);
      const memberTasks = tasks.filter((t: any) => t.assigned_to === m.user_id);
      const assigned = memberTasks.length;
      const completed = memberTasks.filter((t: any) => t.is_completed).length;
      const tasksOpen = memberTasks.filter((t: any) => !t.is_completed).length;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const tasksCompletedLast7d = memberTasks.filter(
        (t: any) => t.is_completed && t.completed_at && new Date(t.completed_at) >= sevenDaysAgo
      ).length;
      const onTime = memberTasks.filter(
        (t: any) => t.is_completed && t.due_date && t.completed_at && new Date(t.completed_at) <= new Date(t.due_date)
      ).length;
      const revenue = revenuePerMember[m.user_id] || 0;
      const completionRate = assigned > 0 ? completed / assigned : 0;
      const onTimeRate = completed > 0 ? onTime / completed : 0;
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
        tasksOpen,
        tasksCompletedLast7d,
        tasksCompletedAllTime: completed,
      };
    }).sort((a, b) => b.productivityScore - a.productivityScore);
  }, [memberships, memberProfiles, tasks, transactions]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-foreground">Staff</h1>
          <p className="text-sm text-muted-foreground mt-1">Team productivity and performance metrics</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Member
          </Button>
        )}
      </div>
      <StaffMetricsSection members={staffMembers} fmt={fmt} teamId={teamId ?? undefined} />
      <InviteMemberDialog open={showInvite} onOpenChange={setShowInvite} />
    </div>
  );
}
