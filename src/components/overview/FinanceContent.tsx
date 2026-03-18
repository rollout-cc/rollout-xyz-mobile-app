import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { cn, formatLocalDate, parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  DollarSign, TrendingUp, TrendingDown, Flame, Clock,
  Plus, Trash2, Check, X, Download, Calendar,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, startOfQuarter, endOfQuarter, subQuarters, addQuarters } from "date-fns";
import { KpiCardsSection } from "./KpiCardsSection";
import { QuarterlyPnlSection } from "./QuarterlyPnlSection";
import { SpendingPerActSection } from "./SpendingPerActSection";
import { CompanyBudgetSection } from "./CompanyBudgetSection";
import { VendorManager } from "@/components/finance/VendorManager";
import { InvoiceCreator } from "@/components/finance/InvoiceCreator";
import { InvoiceList } from "@/components/finance/InvoiceList";

type DateRange = "month" | "quarter" | "ytd" | "all";

export function FinanceContent() {
  const { selectedTeamId: teamId, canManage: canEdit, canManageFinance } = useSelectedTeam();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange>("all");

  // ── Data fetching ──
  const { data: team } = useQuery({
    queryKey: ["team-detail", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*").eq("id", teamId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["artists-summary", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("id, name, avatar_url").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", teamId],
    queryFn: async () => {
      const ids = artists.map((a) => a.id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from("budgets").select("*").in("artist_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: artists.length > 0,
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["transactions", teamId],
    queryFn: async () => {
      const ids = artists.map((a) => a.id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from("transactions").select("*").in("artist_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: artists.length > 0,
  });

  const { data: companyExpenses = [] } = useQuery({
    queryKey: ["company-expenses", teamId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("company_expenses").select("*").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["budget-categories", teamId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("company_budget_categories").select("*").eq("team_id", teamId!).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: staffEmployment = [] } = useQuery({
    queryKey: ["staff-employment", teamId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("staff_employment").select("*").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: staffProfiles = [] } = useQuery({
    queryKey: ["staff-profiles", staffEmployment.map((s: any) => s.user_id)],
    queryFn: async () => {
      const ids = staffEmployment.map((s: any) => s.user_id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      if (error) throw error;
      return data;
    },
    enabled: staffEmployment.length > 0,
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

  // ── Date filtering ──
  const dateFilter = useMemo(() => {
    const now = new Date();
    if (dateRange === "month") return { start: startOfMonth(now), end: endOfMonth(now) };
    if (dateRange === "quarter") return { start: startOfQuarter(now), end: endOfQuarter(now) };
    if (dateRange === "ytd") return { start: startOfYear(now), end: now };
    return null;
  }, [dateRange]);

  const filterByDate = (date: string) => {
    if (!dateFilter) return true;
    const d = new Date(date);
    return d >= dateFilter.start && d <= dateFilter.end;
  };

  const filteredTransactions = allTransactions.filter((t: any) => filterByDate(t.transaction_date));
  const filteredCompanyExpenses = companyExpenses.filter((e: any) => filterByDate(e.expense_date));

  // ── KPI calculations ──
  const totalBudget = budgets.reduce((s, b: any) => s + Number(b.amount), 0) + Number(team?.annual_budget || 0);
  const totalRevenue = filteredTransactions.filter((t: any) => t.type === "revenue").reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
  const totalArtistExpenses = filteredTransactions.filter((t: any) => t.type === "expense").reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
  const totalCompanyExpenses = filteredCompanyExpenses.reduce((s, e: any) => s + Number(e.amount), 0);
  const totalExpenses = totalArtistExpenses + totalCompanyExpenses;
  const netProfit = totalRevenue - totalExpenses;

  const totalPayroll = Math.round(staffEmployment.reduce((s: number, e: any) => {
    if (e.employment_type === "w2") return s + Number(e.annual_salary || 0) / 12;
    return s + Number(e.monthly_retainer || 0);
  }, 0) * 100) / 100;

  const monthlyBurn = Math.round((totalExpenses > 0
    ? totalExpenses / (dateRange === "month" ? 1 : dateRange === "quarter" ? 3 : dateRange === "ytd" ? new Date().getMonth() + 1 : 12)
    : totalPayroll) * 100) / 100;
  const runway = monthlyBurn > 0 ? Math.round((totalBudget - totalExpenses) / monthlyBurn) : Infinity;

  const openTasks = tasks.filter((t: any) => !t.is_completed).length;
  const overdueTasks = tasks.filter((t: any) => !t.is_completed && t.due_date && new Date(t.due_date) < new Date()).length;

  const fmt = (n: number) => `$${Math.abs(Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const fmtSigned = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  // ── Approval mutations ──
  const approveTransaction = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("transactions").update({
        approval_status: status,
        approved_by: (await supabase.auth.getUser()).data.user?.id,
        approved_at: new Date().toISOString(),
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transaction updated");
    },
  });

  // ── Quarterly data for P&L ──
  const now = new Date();
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
      const qTxns = allTransactions.filter((t: any) => {
        const d = parseLocalDate(t.transaction_date);
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
      return { ...q, revenue, expenses, gp: revenue - expenses, deptExpenses };
    });
  }, [allTransactions, quarters, departments, budgetLabelMap]);

  // ── Artist breakdown ──
  const artistBreakdown = useMemo(() => {
    return artists.map((artist) => {
      const aBudgets = budgets.filter((b: any) => b.artist_id === artist.id);
      const aTxns = filteredTransactions.filter((t: any) => t.artist_id === artist.id);
      const budget = aBudgets.reduce((s, b: any) => s + Number(b.amount), 0);
      const revenue = aTxns.filter((t: any) => t.type === "revenue").reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
      const expenses = aTxns.filter((t: any) => t.type === "expense").reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
      const utilization = budget > 0 ? Math.min((expenses / budget) * 100, 100) : 0;
      const pendingCount = aTxns.filter((t: any) => (t as any).approval_status === "pending").length;
      const catBreakdown = aBudgets.map((b: any) => {
        const catTxns = aTxns.filter((t: any) => t.budget_id === b.id);
        const spent = catTxns.reduce((s, t: any) => s + Math.abs(Number(t.amount)), 0);
        return { label: b.label, budget: Number(b.amount), spent, pct: Number(b.amount) > 0 ? (spent / Number(b.amount)) * 100 : 0 };
      });
      return {
        ...artist, budget, revenue, expenses, gp: revenue - expenses, utilization,
        pendingCount, categories: catBreakdown, transactions: aTxns,
        completedTasks: 0, totalTasks: 0, campaignCount: 0,
      };
    }).sort((a, b) => b.budget - a.budget);
  }, [artists, budgets, filteredTransactions]);

  // ── CSV export ──
  const exportCSV = () => {
    const rows = [["Type", "Artist", "Description", "Amount", "Date", "Status"]];
    filteredTransactions.forEach((t: any) => {
      const artist = artists.find((a) => a.id === t.artist_id);
      rows.push([t.type, artist?.name || "", t.description, t.amount, t.transaction_date, (t as any).approval_status || "approved"]);
    });
    filteredCompanyExpenses.forEach((e: any) => {
      rows.push(["company_expense", "", e.description, e.amount, e.expense_date, "approved"]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header + Date Filter. All controls use h-9 for consistent height with AgendaContent. */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Title — hidden on mobile since the active tab in the header provides context */}
        <div className="hidden sm:block">
          <h1 className="text-foreground">Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">Company-wide financial overview</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto h-9">
          <div className="h-9 flex items-center gap-0.5 rounded-lg border border-border p-0.5 flex-1 sm:flex-none">
            {(["month", "quarter", "ytd", "all"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={cn(
                  "h-full flex-1 sm:flex-none min-w-0 px-2.5 sm:px-3 rounded-md text-xs font-medium transition-colors capitalize flex items-center justify-center",
                  dateRange === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                )}
              >
                {r === "ytd" ? "YTD" : r}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="shrink-0 h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <CollapsibleSection title="Financial Snapshot" defaultOpen>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <KpiCard label="Total Budget" value={fmt(totalBudget)} icon={<DollarSign className="h-4 w-4" />} />
          <KpiCard label="Total Revenue" value={fmt(totalRevenue)} icon={<TrendingUp className="h-4 w-4" />} accent="text-emerald-600" />
          <KpiCard label="Total Spending" value={fmt(totalExpenses)} icon={<TrendingDown className="h-4 w-4" />} accent="text-destructive" />
          <KpiCard label="Net P&L" value={fmtSigned(netProfit)} icon={<DollarSign className="h-4 w-4" />} accent={netProfit >= 0 ? "text-emerald-600" : "text-destructive"} />
          <KpiCard label="Monthly Burn" value={fmt(monthlyBurn)} icon={<Flame className="h-4 w-4" />} accent="text-amber-600" />
          <KpiCard label="Runway" value={runway === Infinity ? "∞" : `${runway} mo`} icon={<Clock className="h-4 w-4" />} accent={runway < 6 ? "text-destructive" : "text-emerald-600"} />
          <KpiCard label="Monthly Payroll" value={fmt(totalPayroll)} icon={<DollarSign className="h-4 w-4" />} />
          <KpiCard label="Pending Approvals" value={String(filteredTransactions.filter((t: any) => (t as any).approval_status === "pending").length)} icon={<Clock className="h-4 w-4" />} accent="text-amber-600" />
        </div>
      </CollapsibleSection>

      {/* Company Expenses */}
      <CollapsibleSection title="Company Expenses" defaultOpen>
        <CompanyExpensesTable
          expenses={filteredCompanyExpenses}
          categories={categories}
          teamId={teamId!}
          canEdit={canEdit}
        />
      </CollapsibleSection>

      {/* Vendors */}
      <CollapsibleSection title="Vendors" defaultOpen={false}>
        <VendorManager />
      </CollapsibleSection>

      {/* Invoices */}
      <CollapsibleSection title="Invoices" defaultOpen={false}>
        <div className="flex items-center justify-end mb-3">
          {canEdit && <InvoiceCreator />}
        </div>
        <InvoiceList />
      </CollapsibleSection>

      <CollapsibleSection title="Staff Payroll" defaultOpen>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Annual / Monthly</th>
                <th className="text-right p-3 font-medium">Monthly Cost</th>
              </tr>
            </thead>
            <tbody>
              {staffEmployment.map((emp: any) => {
                const profile = staffProfiles.find((p) => p.id === emp.user_id);
                const displayName = profile?.full_name || emp.display_name || "Unknown";
                const monthly = emp.employment_type === "w2"
                  ? Number(emp.annual_salary || 0) / 12
                  : Number(emp.monthly_retainer || 0);
                return (
                  <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="p-3 flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">{(displayName || "?")[0]}</AvatarFallback>
                      </Avatar>
                      {displayName}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">{emp.employment_type === "w2" ? "W-2" : "1099"}</Badge>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {emp.employment_type === "w2" ? fmt(Number(emp.annual_salary || 0)) : `${fmt(Number(emp.monthly_retainer || 0))}/mo`}
                    </td>
                    <td className="p-3 text-right font-medium">{fmt(monthly)}</td>
                  </tr>
                );
              })}
              {staffEmployment.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No staff employment records</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30">
                <td colSpan={3} className="p-3 font-semibold">Total Monthly Payroll</td>
                <td className="p-3 text-right font-bold">{fmt(totalPayroll)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CollapsibleSection>

      {/* Pending Approvals - Quick Action Section */}
      {(() => {
        const allPending = artistBreakdown.flatMap((artist) =>
          (artist.transactions || [])
            .filter((t: any) => (t as any).approval_status === "pending")
            .map((t: any) => ({ ...t, artistName: artist?.name ?? "Unknown", artistAvatar: artist?.avatar_url }))
        );
        if (allPending.length === 0) return null;
        return (
          <CollapsibleSection title={`Pending Approvals (${allPending.length})`} defaultOpen>
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              {/* Desktop table */}
              <div className="hidden sm:block">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-2.5 font-medium">Artist</th>
                      <th className="text-left p-2.5 font-medium">Description</th>
                      <th className="text-left p-2.5 font-medium">Type</th>
                      <th className="text-right p-2.5 font-medium">Amount</th>
                      <th className="text-left p-2.5 font-medium">Date</th>
                      {canEdit && <th className="text-center p-2.5 font-medium w-20">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {allPending.map((t: any) => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-accent/20">
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={t.artistAvatar ?? undefined} />
                              <AvatarFallback className="text-[8px]">{(t.artistName || "?")[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{t.artistName}</span>
                          </div>
                        </td>
                        <td className="p-2.5">{t.description}</td>
                        <td className="p-2.5">
                          <Badge variant={t.type === "revenue" ? "default" : "outline"} className={cn("text-[10px]", t.type === "revenue" ? "bg-emerald-100 text-emerald-800" : "")}>
                            {t.type}
                          </Badge>
                        </td>
                        <td className={cn("p-2.5 text-right font-medium tabular-nums", t.type === "revenue" ? "text-emerald-600" : "text-destructive")}>
                          {t.type === "revenue" ? "+" : "-"}{fmt(Math.abs(Number(t.amount)))}
                        </td>
                        <td className="p-2.5">{format(parseLocalDate(t.transaction_date), "MMM d")}</td>
                        {canEdit && (
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => approveTransaction.mutate({ id: t.id, status: "approved" })}
                                className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-600 transition-colors"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => approveTransaction.mutate({ id: t.id, status: "denied" })}
                                className="p-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile two-row cards */}
              <div className="sm:hidden divide-y divide-border">
                {allPending.map((t: any) => (
                  <div key={t.id} className="flex flex-col gap-1.5 px-4 py-3 hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={t.artistAvatar ?? undefined} />
                        <AvatarFallback className="text-[8px]">{(t.artistName || "?")[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm truncate">{t.artistName}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 pl-7">
                      <p className="text-xs text-muted-foreground leading-snug min-w-0">{t.description}</p>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant={t.type === "revenue" ? "default" : "outline"} className={cn("text-[10px]", t.type === "revenue" ? "bg-emerald-100 text-emerald-800" : "")}>
                            {t.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{format(parseLocalDate(t.transaction_date), "MMM d")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-semibold tabular-nums", t.type === "revenue" ? "text-emerald-600" : "text-destructive")}>
                            {t.type === "revenue" ? "+" : "-"}{fmt(Math.abs(Number(t.amount)))}
                          </span>
                          {canEdit && (
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => approveTransaction.mutate({ id: t.id, status: "approved" })}
                                className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-600 transition-colors"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => approveTransaction.mutate({ id: t.id, status: "denied" })}
                                className="p-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        );
      })()}

      {/* Artist Financial Drill-Down */}
      <CollapsibleSection title="Artist Financials" defaultOpen>
        <Accordion type="multiple" className="space-y-2">
          {artistBreakdown.map((artist) => {
            const pendingTxns = artist.transactions.filter((t: any) => (t as any).approval_status === "pending");
            const nonPendingTxns = artist.transactions.filter((t: any) => (t as any).approval_status !== "pending");
            return (
            <AccordionItem key={artist.id} value={artist.id} className="rounded-xl border border-border overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/30">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
                  {/* Row 1: avatar + name + pending badge */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={artist.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">{(artist.name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm truncate">{artist.name}</span>
                    {artist.pendingCount > 0 && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 shrink-0">
                        {artist.pendingCount} pending
                      </Badge>
                    )}
                  </div>
                  {/* Row 2 on mobile / inline on desktop: financial stats */}
                  <div className="flex items-center gap-3 sm:gap-4 sm:ml-auto text-xs text-muted-foreground mr-2 pl-11 sm:pl-0">
                    <span className="tabular-nums">Budget: {fmt(artist.budget)}</span>
                    <span className="tabular-nums text-emerald-600">Rev: {fmt(artist.revenue)}</span>
                    <span className="tabular-nums text-destructive">Exp: {fmt(artist.expenses)}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {/* Pending approvals for this artist - shown first */}
                {pendingTxns.length > 0 && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-amber-200 bg-amber-100/50">
                      <span className="text-xs font-semibold text-amber-800">{pendingTxns.length} Pending Approval{pendingTxns.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="divide-y divide-amber-200">
                      {pendingTxns.map((t: any) => (
                        <div key={t.id} className="flex items-center gap-3 px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium">{t.description}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">{format(parseLocalDate(t.transaction_date), "MMM d")}</span>
                          </div>
                          <span className={cn("text-xs font-semibold tabular-nums", t.type === "revenue" ? "text-emerald-600" : "text-destructive")}>
                            {t.type === "revenue" ? "+" : "-"}{fmt(Math.abs(Number(t.amount)))}
                          </span>
                          {canEdit && (
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => approveTransaction.mutate({ id: t.id, status: "approved" })}
                                className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => approveTransaction.mutate({ id: t.id, status: "denied" })}
                                className="p-1 rounded hover:bg-red-100 text-red-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Budget utilization */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Budget utilization</span>
                    <span className="font-semibold">{Math.round(artist.utilization)}%</span>
                  </div>
                  <Progress value={artist.utilization} className={cn("h-1.5", artist.utilization >= 90 ? "[&>div]:bg-destructive" : artist.utilization >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")} />
                </div>

                {/* Category breakdown */}
                {artist.categories.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {artist.categories.map((cat) => (
                      <div key={cat.label} className="rounded-lg border border-border p-2">
                        <p className="text-xs text-muted-foreground">{cat.label}</p>
                        <p className="text-sm font-semibold">{fmt(cat.spent)} / {fmt(cat.budget)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transactions ledger - non-pending only */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-left p-2 font-medium">Description</th>
                        <th className="text-left p-2 font-medium">Type</th>
                        <th className="text-right p-2 font-medium">Amount</th>
                        <th className="text-center p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nonPendingTxns.map((t: any) => (
                        <tr key={t.id} className="border-b border-border last:border-0 hover:bg-accent/20">
                          <td className="p-2">{format(parseLocalDate(t.transaction_date), "MMM d")}</td>
                          <td className="p-2">{t.description}</td>
                          <td className="p-2">
                            <Badge variant={t.type === "revenue" ? "default" : "outline"} className={cn("text-[10px]", t.type === "revenue" ? "bg-emerald-100 text-emerald-800" : "")}>
                              {t.type}
                            </Badge>
                          </td>
                          <td className={cn("p-2 text-right font-medium", t.type === "revenue" ? "text-emerald-600" : "text-destructive")}>
                            {t.type === "revenue" ? "+" : "-"}{fmt(Math.abs(Number(t.amount)))}
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant="outline" className={cn("text-[10px]",
                              (t as any).approval_status === "denied" ? "bg-red-50 text-red-700 border-red-200" :
                              "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}>
                              {(t as any).approval_status || "approved"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {nonPendingTxns.length === 0 && (
                        <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No approved transactions</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
            );
          })}
          {artistBreakdown.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No artists in roster</p>
          )}
        </Accordion>
      </CollapsibleSection>

      {/* Quarterly P&L */}
      <CollapsibleSection title="Quarterly P&L" defaultOpen>
        <QuarterlyPnlSection
          quarterlyData={quarterlyData}
          departments={departments}
          totalRevenue={totalRevenue}
          totalExpenses={totalArtistExpenses}
          netProfit={netProfit}
          fmt={fmt}
          fmtSigned={fmtSigned}
        />
      </CollapsibleSection>

      {/* Spending Per Act */}
      <CollapsibleSection title="Spending Per Act" defaultOpen>
        <SpendingPerActSection
          artistBreakdown={artistBreakdown}
          artistCount={artists.length}
          fmt={fmt}
          fmtSigned={fmtSigned}
          fromFinanceTab
        />
      </CollapsibleSection>

      {/* Company Budget */}
      <CollapsibleSection title="Company Budget" defaultOpen>
        <CompanyBudgetSection readOnly={!canManageFinance} />
      </CollapsibleSection>
    </div>
  );
}

function KpiCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border border-border p-4 hover:bg-accent/40 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted text-muted-foreground">{icon}</div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-xl sm:text-2xl font-bold break-all", accent)}>{value}</div>
    </div>
  );
}

function CompanyExpensesTable({ expenses, categories, teamId, canEdit }: { expenses: any[]; categories: any[]; teamId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCat, setNewCat] = useState("");

  const addExpense = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("company_expenses").insert({
        team_id: teamId,
        description: newDesc.trim(),
        amount: parseFloat(newAmount.replace(/,/g, "")) || 0,
        category_id: newCat || null,
        expense_date: formatLocalDate(new Date()),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-company-expenses"] });
      setNewDesc("");
      setNewAmount("");
      setNewCat("");
      toast.success("Expense added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("company_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-company-expenses"] });
      toast.success("Expense deleted");
    },
  });

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString()}`;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Desktop table — hidden on mobile */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Description</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Category</th>
              <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Amount</th>
              {canEdit && <th className="w-12 px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.map((e: any) => {
              const cat = categories.find((c: any) => c.id === e.category_id);
              return (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                    {format(parseLocalDate(e.expense_date), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-medium">{e.description}</td>
                  <td className="px-4 py-3.5">
                    {cat?.name
                      ? <Badge variant="secondary" className="text-xs font-normal">{cat.name}</Badge>
                      : <span className="text-muted-foreground text-sm">—</span>
                    }
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-destructive tabular-nums">{fmt(Number(e.amount))}</td>
                  {canEdit && (
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => deleteExpense.mutate(e.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No company expenses recorded
                </td>
              </tr>
            )}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td colSpan={canEdit ? 3 : 2} className="px-4 py-3 text-sm font-semibold text-muted-foreground">
                  Total
                </td>
                <td className="px-4 py-3 text-right font-bold text-destructive tabular-nums">{fmt(totalExpenses)}</td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Mobile card list — shown only on small screens */}
      <div className="sm:hidden divide-y divide-border">
        {expenses.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No company expenses recorded</p>
        )}
        {expenses.map((e: any) => {
          const cat = categories.find((c: any) => c.id === e.category_id);
          return (
            <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium leading-snug">{e.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {format(parseLocalDate(e.expense_date), "MMM d, yyyy")}
                  </span>
                  {cat?.name && (
                    <Badge variant="secondary" className="text-[10px] font-normal h-4 px-1.5">{cat.name}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <span className="text-sm font-semibold text-destructive tabular-nums">{fmt(Number(e.amount))}</span>
                {canEdit && (
                  <button
                    onClick={() => deleteExpense.mutate(e.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {expenses.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
            <span className="text-sm font-semibold text-muted-foreground">Total</span>
            <span className="text-sm font-bold text-destructive tabular-nums">{fmt(totalExpenses)}</span>
          </div>
        )}
      </div>

      {/* Add expense form */}
      {canEdit && (
        <div className="border-t border-border bg-muted/10 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Expense</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description"
              className="h-9 text-sm flex-1"
            />
            <div className="flex gap-2">
              <CurrencyInput
                value={newAmount}
                onChange={setNewAmount}
                placeholder="Amount"
                className="h-9 text-sm w-full sm:w-32"
              />
              <Select value={newCat} onValueChange={setNewCat}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-36">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => addExpense.mutate()}
                disabled={!newDesc.trim() || !newAmount}
                className="h-9 px-4 shrink-0"
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
