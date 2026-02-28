import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Reorder } from "framer-motion";
import { Plus } from "lucide-react";
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

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString()}`;
  const fmtSigned = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString()}`;

  // ——— Section management ———
  const {
    visibleSections,
    hiddenSections,
    collapsed,
    setOrder,
    toggleVisibility,
    showSection,
    toggleCollapse,
  } = useOverviewSections();

  const sectionRegistry: Record<string, { label: string; content: React.ReactNode }> = {
    kpis: {
      label: "Financial Snapshot",
      content: <KpiCardsSection totalBudget={totalBudget} totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} openTasks={openTasks} overdueTasks={overdueTasks} fmt={fmt} fmtSigned={fmtSigned} />,
    },
    "budget-utilization": {
      label: "Budget Utilization",
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
  };

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

      {/* Draggable sections */}
      <Reorder.Group axis="y" values={visibleSections} onReorder={setOrder} className="space-y-6">
        {visibleSections.map((id) => {
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
