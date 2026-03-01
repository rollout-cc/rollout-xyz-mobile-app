import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Reorder } from "framer-motion";
import { Plus, Star, StarOff } from "lucide-react";
import { format, startOfQuarter, endOfQuarter, subQuarters, addQuarters } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DraggableSection } from "@/components/overview/DraggableSection";
import { useOverviewSections, ALL_SECTIONS } from "@/components/overview/useOverviewSections";
import { KpiCardsSection } from "@/components/overview/KpiCardsSection";
import { BudgetUtilizationSection } from "@/components/overview/BudgetUtilizationSection";
import { QuarterlyPnlSection } from "@/components/overview/QuarterlyPnlSection";
import { SpendingPerActSection } from "@/components/overview/SpendingPerActSection";
import { StaffProductivityWidget } from "@/components/overview/StaffProductivityWidget";
import { ARPipelineWidget } from "@/components/overview/ARPipelineWidget";
import { StreamingTrendsWidget } from "@/components/overview/StreamingTrendsWidget";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import type { StaffMember } from "@/components/overview/StaffMetricsSection";


export default function Overview() {
  const { selectedTeamId: teamId } = useSelectedTeam();

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["overview-artists", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, avatar_url, monthly_listeners, genres")
        .eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["overview-budgets", teamId],
    queryFn: async () => {
      const artistIds = artists.map((a) => a.id);
      if (artistIds.length === 0) return [];
      const { data, error } = await supabase.from("budgets").select("*").in("artist_id", artistIds);
      if (error) throw error;
      return data;
    },
    enabled: artists.length > 0,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["overview-transactions", teamId],
    queryFn: async () => {
      const artistIds = artists.map((a) => a.id);
      if (artistIds.length === 0) return [];
      const { data, error } = await supabase.from("transactions").select("*").in("artist_id", artistIds);
      if (error) throw error;
      return data;
    },
    enabled: artists.length > 0,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["overview-tasks", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: initiatives = [] } = useQuery({
    queryKey: ["overview-initiatives", teamId],
    queryFn: async () => {
      const artistIds = artists.map((a) => a.id);
      if (artistIds.length === 0) return [];
      const { data, error } = await supabase.from("initiatives").select("*").in("artist_id", artistIds);
      if (error) throw error;
      return data;
    },
    enabled: artists.length > 0,
  });

  // ——— Staff data ———
  const { data: memberships = [] } = useQuery({
    queryKey: ["overview-memberships", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_memberships").select("user_id, role").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const memberUserIds = useMemo(() => memberships.map((m) => m.user_id), [memberships]);

  const { data: memberProfiles = [] } = useQuery({
    queryKey: ["overview-member-profiles", memberUserIds],
    queryFn: async () => {
      if (memberUserIds.length === 0) return [];
      const { data, error } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", memberUserIds);
      if (error) throw error;
      return data;
    },
    enabled: memberUserIds.length > 0,
  });

  // ——— Prospects data ———
  const { data: prospects = [] } = useQuery({
    queryKey: ["overview-prospects", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("id, stage, artist_name, avatar_url, priority")
        .eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // ——— Listener history ———
  const { data: listenerHistory = [] } = useQuery({
    queryKey: ["listener-history", teamId],
    queryFn: async () => {
      const artistIds = artists.map((a) => a.id);
      if (artistIds.length === 0) return [];
      // Get the most recent previous record for each artist (not today)
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("monthly_listener_history" as any)
        .select("artist_id, monthly_listeners, recorded_at")
        .in("artist_id", artistIds)
        .lt("recorded_at", today)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as { artist_id: string; monthly_listeners: number; recorded_at: string }[];
    },
    enabled: artists.length > 0,
  });


  // ——— Calculations ———
  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalRevenue = transactions
    .filter((t: any) => t.type === "revenue")
    .reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
  const totalExpenses = transactions
    .filter((t: any) => t.type === "expense")
    .reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
  const netProfit = totalRevenue - totalExpenses;
  const budgetRemaining = totalBudget - totalExpenses;
  const budgetUtilization = totalBudget > 0 ? Math.min((totalExpenses / totalBudget) * 100, 100) : 0;

  const openTasks = tasks.filter((t: any) => !t.is_completed).length;
  const now = new Date();
  const overdueTasks = tasks.filter((t: any) => !t.is_completed && t.due_date && new Date(t.due_date) < now).length;

  // ——— Quarterly breakdown ———
  const quarters = useMemo(() => {
    const currentQ = startOfQuarter(now);
    const qs = [];
    for (let i = -2; i <= 1; i++) {
      const qStart = i < 0 ? subQuarters(currentQ, Math.abs(i)) : i > 0 ? addQuarters(currentQ, i) : currentQ;
      const qEnd = endOfQuarter(qStart);
      qs.push({ start: qStart, end: qEnd, label: `${format(qStart, "yyyy")} Q${Math.floor(qStart.getMonth() / 3) + 1}` });
    }
    return qs;
  }, []);

  const departments = useMemo(() => {
    const labels = new Set(budgets.map((b: any) => b.label as string));
    return Array.from(labels).sort();
  }, [budgets]);

  const budgetLabelMap = useMemo(() => {
    const m: Record<string, string> = {};
    budgets.forEach((b: any) => { m[b.id] = b.label; });
    return m;
  }, [budgets]);

  const quarterlyData = useMemo(() => {
    return quarters.map((q) => {
      const qTxns = transactions.filter((t: any) => {
        const d = new Date(t.transaction_date);
        return d >= q.start && d <= q.end;
      });
      const revenue = qTxns.filter((t: any) => t.type === "revenue").reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
      const expenses = qTxns.filter((t: any) => t.type === "expense").reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);

      const deptExpenses: Record<string, number> = {};
      departments.forEach((dept) => { deptExpenses[dept] = 0; });
      qTxns.filter((t: any) => t.type === "expense" && t.budget_id).forEach((t: any) => {
        const label = budgetLabelMap[t.budget_id];
        if (label) deptExpenses[label] += Math.abs(Number(t.amount));
      });
      const uncategorized = qTxns.filter((t: any) => t.type === "expense" && !t.budget_id)
        .reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
      if (uncategorized > 0) deptExpenses["Other"] = uncategorized;

      return { ...q, revenue, expenses, gp: revenue - expenses, deptExpenses };
    });
  }, [transactions, quarters, departments, budgetLabelMap]);

  // ——— Per-artist breakdown ———
  const artistBreakdown = useMemo(() => {
    return artists.map((artist) => {
      const aBudgets = budgets.filter((b: any) => b.artist_id === artist.id);
      const aTxns = transactions.filter((t: any) => t.artist_id === artist.id);
      const aTasks = tasks.filter((t: any) => t.artist_id === artist.id);
      const aInitiatives = initiatives.filter((i: any) => i.artist_id === artist.id);

      const budget = aBudgets.reduce((s, b: any) => s + Number(b.amount), 0);
      const revenue = aTxns.filter((t: any) => t.type === "revenue").reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
      const expenses = aTxns.filter((t: any) => t.type === "expense").reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
      const completedTasks = aTasks.filter((t: any) => t.is_completed).length;
      const totalTasks = aTasks.length;
      const utilization = budget > 0 ? Math.min((expenses / budget) * 100, 100) : 0;

      const catBreakdown = aBudgets.map((b: any) => {
        const catTxns = aTxns.filter((t: any) => t.budget_id === b.id);
        const spent = catTxns.reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
        return { label: b.label, budget: Number(b.amount), spent, pct: Number(b.amount) > 0 ? (spent / Number(b.amount)) * 100 : 0 };
      });

      return {
        ...artist,
        budget,
        revenue,
        expenses,
        gp: revenue - expenses,
        completedTasks,
        totalTasks,
        utilization,
        campaignCount: aInitiatives.length,
        categories: catBreakdown,
      };
    }).sort((a, b) => b.budget - a.budget);
  }, [artists, budgets, transactions, tasks, initiatives]);

  // ——— Staff members ———
  const staffMembers: StaffMember[] = useMemo(() => {
    return memberships.map((m) => {
      const profile2 = memberProfiles.find((p) => p.id === m.user_id);
      const memberTasks = tasks.filter((t: any) => t.assigned_to === m.user_id);
      const assigned = memberTasks.length;
      const completed = memberTasks.filter((t: any) => t.is_completed).length;
      const onTime = memberTasks.filter(
        (t: any) => t.is_completed && t.due_date && t.completed_at && new Date(t.completed_at) <= new Date(t.due_date)
      ).length;

      const completedTaskIds = new Set(memberTasks.filter((t: any) => t.is_completed).map((t: any) => t.id));
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
        fullName: profile2?.full_name ?? "Unknown",
        avatarUrl: profile2?.avatar_url ?? null,
        role: m.role,
        tasksAssigned: assigned,
        tasksCompleted: completed,
        tasksOnTime: onTime,
        revenueLogged: revenue,
        productivityScore: Math.min(score, 100),
      };
    }).sort((a, b) => b.productivityScore - a.productivityScore);
  }, [memberships, memberProfiles, tasks, transactions]);

  // ——— Streaming trends data ———
  const artistStreamData = useMemo(() => {
    // Build a map of most recent previous listeners per artist
    const prevMap: Record<string, number> = {};
    for (const row of listenerHistory) {
      if (!prevMap[row.artist_id]) {
        prevMap[row.artist_id] = row.monthly_listeners;
      }
    }

    return artists
      .map((a) => ({
        id: a.id,
        name: a.name,
        avatar_url: a.avatar_url,
        monthly_listeners: a.monthly_listeners,
        previousListeners: prevMap[a.id] ?? null,
      }))
      .sort((a, b) => (b.monthly_listeners ?? 0) - (a.monthly_listeners ?? 0));
  }, [artists, listenerHistory]);

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString()}`;
  const fmtSigned = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString()}`;

  // ——— Section management ———
  const {
    visibleSections,
    hiddenSections,
    collapsed,
    heroSection,
    setOrder,
    toggleVisibility,
    showSection,
    toggleCollapse,
    setHeroSection,
  } = useOverviewSections();

  const sectionRegistry: Record<string, { label: string; content: React.ReactNode }> = {
    kpis: {
      label: "Financial Snapshot",
      content: <KpiCardsSection totalBudget={totalBudget} totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} openTasks={openTasks} overdueTasks={overdueTasks} fmt={fmt} fmtSigned={fmtSigned} />,
    },
    "budget-utilization": {
      label: "Overall Company Spend",
      content: <BudgetUtilizationSection totalExpenses={totalExpenses} budgetRemaining={budgetRemaining} budgetUtilization={budgetUtilization} openTasks={openTasks} overdueTasks={overdueTasks} fmt={fmt} />,
    },
    "quarterly-pnl": {
      label: "Quarterly P&L",
      content: <QuarterlyPnlSection quarterlyData={quarterlyData} departments={departments} totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} fmt={fmt} fmtSigned={fmtSigned} />,
    },
    "spending-per-act": {
      label: "Spending Per Act",
      content: <SpendingPerActSection artistBreakdown={artistBreakdown} artistCount={artists.length} fmt={fmt} fmtSigned={fmtSigned} />,
    },
    "staff-productivity": {
      label: "Team Metrics",
      content: <StaffProductivityWidget members={staffMembers} fmt={fmt} />,
    },
    "ar-pipeline": {
      label: "A&R Pipeline",
      content: <ARPipelineWidget prospects={prospects} />,
    },
    "streaming-trends": {
      label: "Streaming Trends",
      content: <StreamingTrendsWidget artists={artistStreamData} teamId={teamId} />,
    },
  };

  // Separate hero from grid sections
  const heroId = heroSection && visibleSections.includes(heroSection) ? heroSection : null;
  const gridSections = visibleSections.filter((id) => id !== heroId);

  return (
    <AppLayout title="Label">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-foreground">
          Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here's a snapshot of your label's overall health
        </p>
      </div>

      {/* Hero widget — full width */}
      {heroId && sectionRegistry[heroId] && (
        <div className="mb-6">
          <CollapsibleSection
            title={sectionRegistry[heroId].label}
            open={!collapsed.has(heroId)}
            onToggle={() => toggleCollapse(heroId)}
            actions={
              <button
                onClick={() => setHeroSection(null)}
                className="p-1 text-amber-500 hover:text-amber-400 transition-colors"
                aria-label="Remove from hero"
                title="Remove hero"
              >
                <StarOff className="h-4 w-4" />
              </button>
            }
          >
            {sectionRegistry[heroId].content}
          </CollapsibleSection>
        </div>
      )}

      {/* Two-column grid */}
      <Reorder.Group axis="y" values={gridSections} onReorder={setOrder} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {gridSections.map((id) => {
          const section = sectionRegistry[id];
          if (!section) return null;
          return (
            <DraggableSection
              key={id}
              id={id}
              title={section.label}
              isOpen={!collapsed.has(id)}
              onToggle={() => toggleCollapse(id)}
              onHide={() => toggleVisibility(id)}
              onSetHero={heroId !== id ? () => setHeroSection(id) : undefined}
            >
              {section.content}
            </DraggableSection>
          );
        })}
      </Reorder.Group>

      {/* Add hidden sections back */}
      {hiddenSections.length > 0 && (
        <div className="mt-6 flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Add Section
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {hiddenSections.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => showSection(s.id)}>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </AppLayout>
  );
}
