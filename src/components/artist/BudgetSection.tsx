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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Artist Budget</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Add Budget
        </Button>
      </div>

      <div className="space-y-1">
        {budgets.map((b: any) => {
          const editing = editState[b.id];
          return (
            <div key={b.id} className="flex items-center gap-3 group">
              <Input
                value={editing ? editing.label : b.label}
                onChange={(e) => {
                  if (!editing) startEdit(b);
                  setEditState(prev => ({ ...prev, [b.id]: { ...(prev[b.id] || { label: b.label, amount: String(b.amount) }), label: e.target.value } }));
                }}
                onBlur={() => { if (editing) saveEdit(b.id); }}
                className="flex-1 basis-0 border-transparent hover:border-input focus:border-input transition-colors h-9"
              />
              <Input
                value={editing ? formatWithCommas(editing.amount) : `$${Number(b.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                onChange={(e) => {
                  if (!editing) startEdit(b);
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  setEditState(prev => ({ ...prev, [b.id]: { ...(prev[b.id] || { label: b.label, amount: String(b.amount) }), amount: val } }));
                }}
                onBlur={() => { if (editing) saveEdit(b.id); }}
                className="flex-1 basis-0 border-transparent hover:border-input focus:border-input transition-colors h-9 text-right"
              />
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8" onClick={() => deleteBudget.mutate(b.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="flex items-center gap-3 mt-2">
          <Input
            placeholder="Label"
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

      {budgets.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Budget</span>
            <span className="font-semibold">${totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Spent</span>
            <span className="font-semibold text-destructive">${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm pt-1 border-t border-border">
            <span className="text-muted-foreground">Remaining</span>
            <span className={`font-bold ${remaining >= 0 ? "text-emerald-600" : "text-destructive"}`}>${remaining.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}
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
