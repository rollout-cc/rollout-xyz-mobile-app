import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Receipt, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";

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

  const addTransaction = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseFloat(newAmount) || 0;
      const finalAmount = isExpense ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
      const { error } = await supabase.from("transactions").insert({
        artist_id: artistId,
        budget_id: newBudgetId === "none" ? null : newBudgetId,
        description: newDesc.trim(),
        amount: finalAmount,
        transaction_date: newDate,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", artistId] });
      resetForm();
      toast.success("Transaction added");
    },
    onError: (e: any) => toast.error(e.message),
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
    setNewDate(format(new Date(), "yyyy-MM-dd"));
    setIsExpense(true);
  };

  // Build budget label map
  const budgetMap: Record<string, string> = {};
  budgets.forEach((b: any) => { budgetMap[b.id] = b.label; });

  // Calculate totals
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
          className="h-7 gap-1 text-xs"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-px bg-border">
        <div className="bg-card px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Income</span>
          <p className="text-sm font-semibold text-emerald-600">${totalIn.toLocaleString()}</p>
        </div>
        <div className="bg-card px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Expenses</span>
          <p className="text-sm font-semibold text-destructive">${totalOut.toLocaleString()}</p>
        </div>
        <div className="bg-card px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</span>
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
                "flex-1 text-xs font-medium py-1.5 transition-colors",
                isExpense ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Expense
            </button>
            <button
              onClick={() => setIsExpense(false)}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 transition-colors",
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
            <Input
              placeholder="$0.00"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="h-8 text-sm flex-1"
            />
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-8 text-sm w-[130px]"
            />
          </div>

          <Select value={newBudgetId} onValueChange={setNewBudgetId}>
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

          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={() => addTransaction.mutate()}
              disabled={!newDesc.trim() || !newAmount}
            >
              Add Transaction
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetForm}>
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {format(txDate, "MMM d")}
                      </span>
                      {budgetLabel && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {budgetLabel}
                        </span>
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
