import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

  // Get total spent from task expenses
  const { data: totalSpent = 0 } = useQuery({
    queryKey: ["tasks-total-spent", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("expense_amount")
        .eq("artist_id", artistId)
        .not("expense_amount", "is", null);
      if (error) throw error;
      return data.reduce((sum: number, t: any) => sum + Number(t.expense_amount || 0), 0);
    },
  });

  const [editState, setEditState] = useState<Record<string, { label: string; amount: string }>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const totalBudget = budgets.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
  const remaining = totalBudget - totalSpent;

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

  const spentPerBudget = budgets.reduce((acc: Record<string, number>, b: any) => {
    acc[b.id] = 0;
    return acc;
  }, {});

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
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> Add Category
          </Button>
        </div>

        {showAdd && (
          <div className="flex items-center gap-3 mb-4">
            <Input
              placeholder="Category name"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 basis-0 h-9"
              autoFocus
            />
            <Input
              placeholder="$0.00"
              value={formatWithCommas(newAmount)}
              onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="flex-1 basis-0 h-9 text-right"
              onKeyDown={(e) => { if (e.key === "Enter" && newLabel.trim()) addBudget.mutate(); }}
            />
            <Button size="sm" className="h-9" onClick={() => addBudget.mutate()} disabled={!newLabel.trim()}>Add</Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b: any) => {
            const editing = editState[b.id];
            const amount = Number(b.amount);
            const pct = amount > 0 ? Math.min((totalSpent / totalBudget) * (amount / totalBudget) * 100 * budgets.length, 100) : 0;
            const barColor = pct >= 100 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-success";

            return (
              <div key={b.id} className="rounded-lg border border-border bg-card p-4 space-y-3 group relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-7 w-7"
                  onClick={() => deleteBudget.mutate(b.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>

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
                    className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors pr-8"
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
                      {amount.toLocaleString("en-US")}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">/{totalBudget.toLocaleString("en-US")}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${(amount / totalBudget) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
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
