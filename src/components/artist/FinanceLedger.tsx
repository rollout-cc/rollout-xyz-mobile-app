import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Plus, Trash2, Receipt, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";

import { REVENUE_CATEGORIES, REVENUE_CATEGORY_LABELS as revCatLabels } from "@/lib/revenueCategories";

interface FinanceLedgerProps {
  artistId: string;
}

export function FinanceLedger({ artistId }: FinanceLedgerProps) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newBudgetId, setNewBudgetId] = useState<string>("none");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isExpense, setIsExpense] = useState(true);
  const [newRevenueCategory, setNewRevenueCategory] = useState<string>("none");
  const [newRevenueSource, setNewRevenueSource] = useState("");

  // Fetch transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("artist_id", artistId)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch budgets for category dropdown
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

  // Fetch sub-budgets
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

  const [newSubBudgetId, setNewSubBudgetId] = useState<string>("none");

  const addTransaction = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseFloat(newAmount) || 0;
      const finalAmount = isExpense ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
      const insert: any = {
        artist_id: artistId,
        description: newDesc.trim(),
        amount: finalAmount,
        transaction_date: newDate,
      };

      if (isExpense) {
        insert.budget_id = newBudgetId === "none" ? null : newBudgetId;
        insert.sub_budget_id = newSubBudgetId === "none" ? null : newSubBudgetId;
      } else {
        insert.revenue_category = newRevenueCategory === "none" ? null : newRevenueCategory;
        insert.revenue_source = newRevenueSource.trim() || null;
      }

      const { error } = await supabase.from("transactions").insert(insert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", artistId] });
      resetForm();
      toast.success("Transaction added");
      if (isExpense && newBudgetId !== "none") {
        import("@/lib/notifications").then(({ checkBudgetThreshold }) => {
          checkBudgetThreshold(artistId, newBudgetId);
        });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRevenueCategory = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ revenue_category: category } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions", artistId] }),
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions", artistId] }),
  });

  const resetForm = () => {
    setShowAdd(false);
    setNewDesc("");
    setNewAmount("");
    setNewBudgetId("none");
    setNewSubBudgetId("none");
    setNewRevenueCategory("none");
    setNewRevenueSource("");
    setNewDate(format(new Date(), "yyyy-MM-dd"));
    setIsExpense(true);
  };

  const availableSubBudgets = useMemo(() => {
    if (newBudgetId === "none") return [];
    return subBudgets.filter((sb: any) => sb.budget_id === newBudgetId);
  }, [newBudgetId, subBudgets]);

  const budgetMap: Record<string, string> = {};
  budgets.forEach((b: any) => { budgetMap[b.id] = b.label; });
  const subBudgetMap: Record<string, string> = {};
  subBudgets.forEach((sb: any) => { subBudgetMap[sb.id] = sb.label; });

  const revCatMap: Record<string, string> = {};
  REVENUE_CATEGORIES.forEach((c) => { revCatMap[c.value] = c.label; });

  const totalIn = transactions
    .filter((t: any) => Number(t.amount) > 0)
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalOut = transactions
    .filter((t: any) => Number(t.amount) < 0)
    .reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
  const balance = totalIn - totalOut;

  return (
    <div className="border border-border rounded-lg bg-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Finance Ledger</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-sm"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-px bg-border">
        <div className="bg-card px-3 py-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Income</span>
          <p className="text-sm font-semibold text-emerald-600">${totalIn.toLocaleString()}</p>
        </div>
        <div className="bg-card px-3 py-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Expenses</span>
          <p className="text-sm font-semibold text-destructive">${totalOut.toLocaleString()}</p>
        </div>
        <div className="bg-card px-3 py-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Balance</span>
          <p className={cn("text-sm font-semibold", balance >= 0 ? "text-emerald-600" : "text-destructive")}>
            ${Math.abs(balance).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Add transaction form */}
      {showAdd && (
        <div className="p-3 border-b border-border space-y-2 bg-muted/30">
          {/* Type toggle */}
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setIsExpense(true)}
              className={cn(
                "flex-1 text-sm font-medium py-1.5 transition-colors",
                isExpense ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Expense
            </button>
            <button
              onClick={() => setIsExpense(false)}
              className={cn(
                "flex-1 text-sm font-medium py-1.5 transition-colors",
                !isExpense ? "bg-emerald-500/10 text-emerald-600" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Income
            </button>
          </div>

          <Input
            placeholder="Description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />

          <div className="flex gap-2">
            <CurrencyInput
              value={newAmount}
              onChange={setNewAmount}
              placeholder="0"
              className="h-8 text-sm flex-1"
            />
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-8 text-sm w-[130px]"
            />
          </div>

          {isExpense ? (
            <>
              <Select value={newBudgetId} onValueChange={(v) => { setNewBudgetId(v); setNewSubBudgetId("none"); }}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {budgets.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {availableSubBudgets.length > 0 && (
                <Select value={newSubBudgetId} onValueChange={setNewSubBudgetId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Sub-budget" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    <SelectItem value="none">No Sub-budget</SelectItem>
                    {availableSubBudgets.map((sb: any) => (
                      <SelectItem key={sb.id} value={sb.id}>{sb.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          ) : (
            <>
              <Input
                placeholder="Source (e.g. Nike, Live Nation)"
                value={newRevenueSource}
                onChange={(e) => setNewRevenueSource(e.target.value)}
                className="h-8 text-sm"
              />
              <Select value={newRevenueCategory} onValueChange={setNewRevenueCategory}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Revenue Category" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {REVENUE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 flex-1 text-sm"
              onClick={() => addTransaction.mutate()}
              disabled={!newDesc.trim() || !newAmount}
            >
              Add Transaction
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div className="flex-1 overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Receipt className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((t: any) => {
              const amount = Number(t.amount);
              const isIncome = amount > 0;
              const budgetLabel = t.budget_id ? budgetMap[t.budget_id] : null;
              const txDate = parse(t.transaction_date, "yyyy-MM-dd", new Date());
              const revCatLabel = t.revenue_category ? revCatMap[t.revenue_category] : null;

              return (
                <div key={t.id} className="flex items-start gap-2 px-3 py-2.5 group hover:bg-muted/30 transition-colors">
                  <div className={cn(
                    "mt-0.5 rounded-full p-1",
                    isIncome ? "bg-emerald-500/10" : "bg-destructive/10"
                  )}>
                    {isIncome
                      ? <ArrowDownRight className="h-3 w-3 text-emerald-600" />
                      : <ArrowUpRight className="h-3 w-3 text-destructive" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {format(txDate, "MMM d")}
                      </span>
                      {budgetLabel && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {budgetLabel}
                        </span>
                      )}
                      {t.sub_budget_id && subBudgetMap[t.sub_budget_id] && (
                        <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                          {subBudgetMap[t.sub_budget_id]}
                        </span>
                      )}
                      {isIncome && t.revenue_source && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">
                          {t.revenue_source}
                        </span>
                      )}
                      {isIncome && revCatLabel && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">
                          {revCatLabel}
                        </span>
                      )}
                      {isIncome && !t.revenue_category && (
                        <Select
                          value=""
                          onValueChange={(v) => updateRevenueCategory.mutate({ id: t.id, category: v })}
                        >
                          <SelectTrigger className="h-7 text-xs w-auto min-w-0 border-dashed border-emerald-500/30 text-emerald-600 px-1.5 py-0 gap-0.5">
                            <SelectValue placeholder="Categorize" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border border-border z-50">
                            {REVENUE_CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      isIncome ? "text-emerald-600" : "text-destructive"
                    )}>
                      {isIncome ? "+" : "-"}${Math.abs(amount).toLocaleString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6"
                      onClick={() => deleteTransaction.mutate(t.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
