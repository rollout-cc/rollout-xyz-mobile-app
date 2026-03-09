import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatWithCommas(value: string): string {
  if (!value) return "";
  const parts = value.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

interface BudgetSectionProps {
  artistId: string;
}

export function BudgetSection({ artistId }: BudgetSectionProps) {
  const queryClient = useQueryClient();
  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: subBudgets = [] } = useQuery({
    queryKey: ["sub-budgets", artistId],
    queryFn: async () => {
      const budgetIds = budgets.map((b: any) => b.id);
      if (budgetIds.length === 0) return [];
      const { data, error } = await supabase
        .from("sub_budgets")
        .select("*")
        .in("budget_id", budgetIds)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: budgets.length > 0,
  });

  // Transactions linked to sub-budgets
  const { data: subBudgetTransactions = [] } = useQuery({
    queryKey: ["sub-budget-transactions", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("artist_id", artistId)
        .not("sub_budget_id", "is", null)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get all expense transactions to compute per-budget spending
  const { data: expenseTransactions = [] } = useQuery({
    queryKey: ["budget-expense-transactions", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, budget_id")
        .eq("artist_id", artistId)
        .eq("type", "expense");
      if (error) throw error;
      return data;
    },
  });

  const totalSpent = expenseTransactions.reduce(
    (sum: number, t: any) => sum + Math.abs(Number(t.amount || 0)), 0
  );

  const spentByBudget = (budgetId: string) =>
    expenseTransactions
      .filter((t: any) => t.budget_id === budgetId)
      .reduce((s: number, t: any) => s + Math.abs(Number(t.amount || 0)), 0);

  const [editState, setEditState] = useState<Record<string, { label: string; amount: string }>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [expandedBudgets, setExpandedBudgets] = useState<Record<string, boolean>>({});
  const [addingSubBudget, setAddingSubBudget] = useState<string | null>(null);
  const [subLabel, setSubLabel] = useState("");
  const [subAmount, setSubAmount] = useState("");

  const totalBudget = budgets.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
  const remaining = totalBudget - totalSpent;

  const subBudgetsByParent = (budgetId: string) =>
    subBudgets.filter((sb: any) => sb.budget_id === budgetId);

  const transactionsForSubBudget = (subBudgetId: string) =>
    subBudgetTransactions.filter((t: any) => t.sub_budget_id === subBudgetId);

  const addBudget = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("budgets").insert({
        artist_id: artistId,
        label: newLabel.trim(),
        amount: parseFloat(newAmount) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", artistId] });
      setNewLabel("");
      setNewAmount("");
      setShowAdd(false);
      toast.success("Budget added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, label, amount }: { id: string; label: string; amount: number }) => {
      const { error } = await supabase.from("budgets").update({ label, amount }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", artistId] });
      toast.success("Budget updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets", artistId] }),
  });

  const addSubBudget = useMutation({
    mutationFn: async ({ budgetId, label, amount }: { budgetId: string; label: string; amount: number }) => {
      // Check if sub-budget sum exceeds parent — auto-increase parent if needed
      const parentBudget = budgets.find((b: any) => b.id === budgetId);
      const existingSubs = subBudgetsByParent(budgetId);
      const existingSubTotal = existingSubs.reduce((s: number, sb: any) => s + Number(sb.amount), 0);
      const newTotal = existingSubTotal + amount;

      if (parentBudget && newTotal > Number(parentBudget.amount)) {
        // Auto-increase parent budget
        const { error: updateErr } = await supabase
          .from("budgets")
          .update({ amount: newTotal })
          .eq("id", budgetId);
        if (updateErr) throw updateErr;
      }

      const { error } = await supabase.from("sub_budgets").insert({
        budget_id: budgetId,
        label,
        amount,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", artistId] });
      queryClient.invalidateQueries({ queryKey: ["sub-budgets", artistId] });
      setAddingSubBudget(null);
      setSubLabel("");
      setSubAmount("");
      toast.success("Sub-budget added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSubBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sub_budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub-budgets", artistId] });
    },
  });

  const startEdit = (b: any) => {
    setEditState(prev => ({ ...prev, [b.id]: { label: b.label, amount: String(b.amount) } }));
  };

  const saveEdit = (id: string) => {
    const s = editState[id];
    if (!s) return;
    updateBudget.mutate({ id, label: s.label, amount: parseFloat(s.amount) || 0 });
    setEditState(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedBudgets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <span className="text-sm text-muted-foreground">Total Budget</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xs text-muted-foreground">$</span>
              <span className="text-2xl font-bold tracking-tight">{totalBudget.toLocaleString("en-US")}</span>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <span className="text-sm text-muted-foreground">Total Spending</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xs text-destructive">$</span>
              <span className="text-2xl font-bold tracking-tight text-destructive">{totalSpent.toLocaleString("en-US")}</span>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <span className="text-sm text-muted-foreground">Remaining Budget</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`text-xs ${remaining >= 0 ? "text-emerald-600" : "text-destructive"}`}>$</span>
              <span className={`text-2xl font-bold tracking-tight ${remaining >= 0 ? "text-emerald-600" : "text-destructive"}`}>{remaining.toLocaleString("en-US")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Category Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Budget Categories</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b: any) => {
            const editing = editState[b.id];
            const amount = Number(b.amount);
            const budgetSpent = spentByBudget(b.id);
            const pct = amount > 0 ? Math.min((budgetSpent / amount) * 100, 100) : 0;
            const barColor = pct >= 100 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-success";
            const subs = subBudgetsByParent(b.id);
            const isExpanded = expandedBudgets[b.id] ?? false;
            const isAddingSub = addingSubBudget === b.id;

            return (
              <div key={b.id} className="rounded-lg border border-border bg-card space-y-0 group relative">
                <div className="p-4 space-y-3">
                  {/* Action buttons on hover */}
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Add sub-budget"
                      onClick={(e) => { e.stopPropagation(); setAddingSubBudget(b.id); setExpandedBudgets(prev => ({ ...prev, [b.id]: true })); }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => deleteBudget.mutate(b.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {editing ? (
                    <Input
                      value={editing.label}
                      onChange={(e) => setEditState(prev => ({ ...prev, [b.id]: { ...prev[b.id], label: e.target.value } }))}
                      onBlur={() => saveEdit(b.id)}
                      className="font-semibold text-lg border-border h-8 px-1"
                      autoFocus
                    />
                  ) : (
                    <h4
                      className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors pr-16"
                      onClick={() => startEdit(b)}
                    >
                      {b.label}
                    </h4>
                  )}

                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-muted-foreground">$</span>
                    {editing ? (
                      <Input
                        value={formatWithCommas(editing.amount)}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          setEditState(prev => ({ ...prev, [b.id]: { ...prev[b.id], amount: val } }));
                        }}
                        onBlur={() => saveEdit(b.id)}
                        className="font-semibold text-lg border-border h-8 px-1 w-28"
                      />
                    ) : (
                      <span
                        className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                        onClick={() => startEdit(b)}
                      >
                        {budgetSpent.toLocaleString("en-US")}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">/{amount.toLocaleString("en-US")}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Sub-budgets toggle */}
                  {subs.length > 0 && (
                    <button
                      onClick={() => toggleExpand(b.id)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      {subs.length} sub-budget{subs.length > 1 ? "s" : ""}
                    </button>
                  )}
                </div>

                {/* Sub-budgets expanded section */}
                {isExpanded && subs.length > 0 && (
                  <div className="border-t border-border bg-muted/20">
                    {subs.map((sb: any) => {
                      const sbTxns = transactionsForSubBudget(sb.id);
                      const sbSpent = sbTxns.reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
                      return (
                        <div key={sb.id} className="px-4 py-2.5 border-b border-border/30 last:border-b-0 group/sub">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{sb.label}</span>
                              <span className="text-xs text-muted-foreground">${Number(sb.amount).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {sbTxns.length > 0 && (
                                <span className="text-xs text-muted-foreground">{sbTxns.length} txn{sbTxns.length > 1 ? "s" : ""} · ${sbSpent.toLocaleString()}</span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover/sub:opacity-100 transition-opacity"
                                onClick={() => deleteSubBudget.mutate(sb.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {sbTxns.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                              {sbTxns.slice(0, 5).map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="truncate">{t.description}</span>
                                  <span className={cn("font-medium tabular-nums", Number(t.amount) > 0 ? "text-emerald-600" : "text-destructive")}>
                                    {Number(t.amount) > 0 ? "+" : "-"}${Math.abs(Number(t.amount)).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                              {sbTxns.length > 5 && <span className="text-xs text-muted-foreground">+{sbTxns.length - 5} more</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add sub-budget inline form - rendered independently */}
                {isAddingSub && (
                  <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Sub-budget name"
                        value={subLabel}
                        onChange={(e) => setSubLabel(e.target.value)}
                        className="h-8 flex-1 text-sm"
                        autoFocus
                      />
                      <Input
                        placeholder="$0"
                        value={formatWithCommas(subAmount)}
                        onChange={(e) => setSubAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                        className="h-8 w-24 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && subLabel.trim()) {
                            addSubBudget.mutate({ budgetId: b.id, label: subLabel.trim(), amount: parseFloat(subAmount) || 0 });
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 flex-1 text-sm" onClick={() => addSubBudget.mutate({ budgetId: b.id, label: subLabel.trim(), amount: parseFloat(subAmount) || 0 })} disabled={!subLabel.trim()}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-8 text-sm" onClick={() => { setAddingSubBudget(null); setSubLabel(""); setSubAmount(""); }}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Category card */}
          {showAdd ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Category name"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="h-9 flex-1"
                  autoFocus
                />
                <Input
                  placeholder="$0.00"
                  value={formatWithCommas(newAmount)}
                  onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="h-9 w-28"
                  onKeyDown={(e) => { if (e.key === "Enter" && newLabel.trim()) addBudget.mutate(); }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 flex-1" onClick={() => addBudget.mutate()} disabled={!newLabel.trim()}>Add</Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowAdd(false); setNewLabel(""); setNewAmount(""); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-lg border border-dashed border-border bg-card p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors min-h-[120px]"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Add Category</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function useTotalBudget(artistId: string) {
  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("amount")
        .eq("artist_id", artistId);
      if (error) throw error;
      return data;
    },
  });
  return budgets.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
}
