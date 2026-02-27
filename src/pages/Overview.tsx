import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useTeams } from "@/hooks/useTeams";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format, startOfQuarter, endOfQuarter, subQuarters, addQuarters } from "date-fns";

export default function Overview() {
  const navigate = useNavigate();
  const { data: teams = [] } = useTeams();
  const teamId = teams[0]?.id;

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

  const { data: categories = [] } = useQuery({
    queryKey: ["overview-categories", teamId],
    queryFn: async () => {
      const artistIds = artists.map((a) => a.id);
      if (artistIds.length === 0) return [];
      const { data, error } = await supabase.from("finance_categories").select("*").in("artist_id", artistIds);
      if (error) throw error;
      return data;
    },
    enabled: artists.length > 0,
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

      // Category breakdown for this artist
      const catBreakdown = aBudgets.map((b: any) => {
        const catTxns = aTxns.filter((t: any) => {
          // Match transactions to budgets via budget_id
          return t.budget_id === b.id;
        });
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

  return (
    <AppLayout title="Overview">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-foreground">
          Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here's your label's financial snapshot
        </p>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-8">
        <KpiCard label="Total Budget" value={fmt(totalBudget)} icon={<DollarSign className="h-4 w-4" />} />
        <KpiCard
          label="Total Revenue"
          value={fmt(totalRevenue)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="text-emerald-600"
        />
        <KpiCard
          label="Total Spending"
          value={fmt(totalExpenses)}
          icon={<TrendingDown className="h-4 w-4" />}
          accent="text-destructive"
        />
        <KpiCard
          label="Net P&L"
          value={fmtSigned(netProfit)}
          icon={<DollarSign className="h-4 w-4" />}
          accent={netProfit >= 0 ? "text-emerald-600" : "text-destructive"}
        />
      </div>

      {/* Budget utilization bar */}
      <div className="rounded-xl p-4 sm:p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-1">
          <span className="text-sm font-medium">Budget Utilization</span>
          <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground flex-wrap">
            <span>Spent: {fmt(totalExpenses)}</span>
            <span>Remaining: {fmt(budgetRemaining)}</span>
            <span className="font-semibold text-foreground">{budgetUtilization.toFixed(0)}%</span>
          </div>
        </div>
        <Progress
          value={budgetUtilization}
          className={cn("h-3 [&>div]:transition-all", budgetUtilization > 90 ? "[&>div]:bg-destructive" : budgetUtilization > 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")}
        />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{openTasks} open tasks</span>
          {overdueTasks > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" /> {overdueTasks} overdue
            </span>
          )}
        </div>
      </div>

      {/* Quarterly P&L */}
      <div className="rounded-xl p-5 mb-8">
        <h2 className="mb-4">Quarterly P&L</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium" />
                {quarterlyData.map((q) => (
                  <th key={q.label} className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">
                    {q.label}
                  </th>
                ))}
                <th className="text-right py-2 pl-3 text-xs text-muted-foreground font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 font-medium">Revenue</td>
                {quarterlyData.map((q) => (
                  <td key={q.label} className="text-right py-2.5 px-3 text-emerald-600 font-medium">
                    {q.revenue > 0 ? fmt(q.revenue) : "—"}
                  </td>
                ))}
                <td className="text-right py-2.5 pl-3 font-bold text-emerald-600">{fmt(totalRevenue)}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 font-medium">Expenses</td>
                {quarterlyData.map((q) => (
                  <td key={q.label} className="text-right py-2.5 px-3 text-destructive font-medium">
                    {q.expenses > 0 ? fmt(q.expenses) : "—"}
                  </td>
                ))}
                <td className="text-right py-2.5 pl-3 font-bold text-destructive">{fmt(totalExpenses)}</td>
              </tr>
              {/* Department breakdown rows */}
              {[...departments, ...(quarterlyData.some(q => q.deptExpenses["Other"] > 0) ? ["Other"] : [])].filter((v, i, a) => a.indexOf(v) === i).map((dept) => {
                const deptTotal = quarterlyData.reduce((s, q) => s + (q.deptExpenses[dept] || 0), 0);
                if (deptTotal === 0) return null;
                return (
                  <tr key={dept} className="border-b border-border">
                    <td className="py-2 pr-4 text-muted-foreground text-xs pl-4">{dept}</td>
                    {quarterlyData.map((q) => (
                      <td key={q.label} className="text-right py-2 px-3 text-xs text-muted-foreground">
                        {(q.deptExpenses[dept] || 0) > 0 ? fmt(q.deptExpenses[dept]) : "—"}
                      </td>
                    ))}
                    <td className="text-right py-2 pl-3 text-xs font-medium text-muted-foreground">{fmt(deptTotal)}</td>
                  </tr>
                );
              })}
              <tr>
                <td className="py-2.5 pr-4 font-semibold">Gross Profit</td>
                {quarterlyData.map((q) => (
                  <td key={q.label} className={cn("text-right py-2.5 px-3 font-bold", q.gp >= 0 ? "text-emerald-600" : "text-destructive")}>
                    {q.revenue > 0 || q.expenses > 0 ? fmtSigned(q.gp) : "—"}
                  </td>
                ))}
                <td className={cn("text-right py-2.5 pl-3 font-bold", netProfit >= 0 ? "text-emerald-600" : "text-destructive")}>
                  {fmtSigned(netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Artist Spending Breakdown */}
      <div className="rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2>Spending Per Act</h2>
          <span className="text-xs text-muted-foreground">{artists.length} artists</span>
        </div>

        <div className="space-y-0">
          {artistBreakdown.map((artist) => (
            <div
              key={artist.id}
              className="border-b border-border last:border-b-0 py-4 -mx-5 px-5 hover:bg-accent/30 cursor-pointer transition-colors"
              onClick={() => navigate(`/roster/${artist.id}`)}
            >
              {/* Artist header row */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={artist.avatar_url ?? undefined} />
                  <AvatarFallback className="text-sm font-bold">{artist.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{artist.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{artist.campaignCount} campaigns</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {artist.completedTasks}/{artist.totalTasks} tasks
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              {/* Financial stats – stacked on mobile, row on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 ml-0 sm:ml-14 mb-2">
                <div>
                  <div className="text-xs text-muted-foreground">Budget</div>
                  <div className="font-bold text-sm">{fmt(artist.budget)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Spent</div>
                  <div className="font-bold text-sm text-destructive">{fmt(artist.expenses)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className="font-bold text-sm text-emerald-600">{fmt(artist.revenue)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">P&L</div>
                  <div className={cn("font-bold text-sm", artist.gp >= 0 ? "text-emerald-600" : "text-destructive")}>
                    {fmtSigned(artist.gp)}
                  </div>
                </div>
              </div>

              {/* Budget category bars */}
              {artist.categories.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 ml-0 sm:ml-14">
                  {artist.categories.map((cat, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-muted-foreground truncate">{cat.label}</span>
                        <span className="font-medium ml-2">{fmt(cat.spent)} / {fmt(cat.budget)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            cat.pct > 90 ? "bg-destructive" : cat.pct > 70 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min(cat.pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Utilization bar */}
              <div className="ml-0 sm:ml-14 mt-2">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-muted-foreground">Overall Utilization</span>
                  <span className="font-semibold">{artist.utilization.toFixed(0)}%</span>
                </div>
                <Progress
                  value={artist.utilization}
                  className={cn("h-1.5 [&>div]:transition-all", artist.utilization > 90 ? "[&>div]:bg-destructive" : artist.utilization > 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")}
                />
              </div>
            </div>
          ))}

          {artistBreakdown.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No artists yet. Add artists from the Roster page.
            </div>
          )}
        </div>

        <button
          onClick={() => navigate("/roster")}
          className="text-sm font-medium text-muted-foreground hover:text-foreground mt-4 block ml-auto transition-colors"
        >
          View Full Roster →
        </button>
      </div>
    </AppLayout>
  );
}

function KpiCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl p-4 hover:bg-accent/40 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-xl sm:text-2xl font-bold break-all", accent)}>{value}</div>
    </div>
  );
}
