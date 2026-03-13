import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, ChevronDown, ChevronRight, Check, Trash2, Pencil, X } from "lucide-react";
import { InvoiceCreator } from "@/components/finance/InvoiceCreator";
import { InvoiceList } from "@/components/finance/InvoiceList";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn, parseLocalDate } from "@/lib/utils";
import { RollyNudge } from "@/components/rolly/RollyNudge";
import { REVENUE_CATEGORIES } from "@/lib/revenueCategories";

/** Map a finance_categories name (e.g. "Touring") to a revenue_category value (e.g. "live") */
function resolveRevenueCategory(categoryName: string | null): string | null {
  if (!categoryName) return null;
  const lower = categoryName.toLowerCase();
  // Direct match on value
  const exact = REVENUE_CATEGORIES.find((c) => c.value === lower);
  if (exact) return exact.value;
  // Match on label (partial)
  const byLabel = REVENUE_CATEGORIES.find((c) => c.label.toLowerCase().includes(lower) || lower.includes(c.label.toLowerCase()));
  if (byLabel) return byLabel.value;
  // Common aliases
  if (lower.includes("tour") || lower.includes("live") || lower.includes("show")) return "live";
  if (lower.includes("merch")) return "merch";
  if (lower.includes("brand")) return "brand_deal";
  if (lower.includes("royal") || lower.includes("stream") || lower.includes("sync")) return "royalty";
  if (lower.includes("publish")) return "publishing";
  if (lower.includes("feature") || lower.includes("feat")) return "feature";
  return "other";
}

interface FinanceTabProps {
  artistId: string;
  teamId: string;
}

type FinanceType = "expense" | "revenue";
type ExpenseStatus = "paid" | "sent" | "pending";
type RevenueStatus = "received" | "outstanding";

const EXPENSE_STATUSES: ExpenseStatus[] = ["paid", "sent", "pending"];
const REVENUE_STATUSES: RevenueStatus[] = ["received", "outstanding"];

/* ─── Undo Snackbar ─── */
function UndoSnackbar({ message, onUndo, durationMs = 10000 }: { message: string; onUndo: () => void; durationMs?: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 50);
    return () => clearInterval(id);
  }, []);
  const pct = Math.min(elapsed / durationMs, 1) * 100;
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[260px] animate-in slide-in-from-bottom-4">
      <span className="text-sm flex-1">{message}</span>
      <Button variant="secondary" size="sm" className="h-8 text-sm shrink-0" onClick={onUndo}>Undo</Button>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30 rounded-b-lg overflow-hidden">
        <div className="h-full bg-primary transition-none" style={{ width: `${100 - pct}%` }} />
      </div>
    </div>
  );
}

export function FinanceTab({ artistId, teamId }: FinanceTabProps) {
  return <FinanceTabContent artistId={artistId} teamId={teamId} />;
}

function FinanceTabContent({ artistId, teamId }: FinanceTabProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<FinanceType>("expense");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewItem, setShowNewItem] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const amountInputRef = useRef<HTMLInputElement>(null);

  // New item form state
  const [itemAmount, setItemAmount] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemStatus, setItemStatus] = useState<string>("pending");
  const [itemCategoryId, setItemCategoryId] = useState<string>("none");
  const [itemSubBudgetId, setItemSubBudgetId] = useState<string>("none");
  const [itemInitiativeId, setItemInitiativeId] = useState<string>("none");
  const [itemDate, setItemDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Pending delete state for undo
  const [pendingDelete, setPendingDelete] = useState<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("none");
  const [editDate, setEditDate] = useState("");

  // Queries
  const { data: transactions = [] } = useQuery({
    queryKey: ["finance-transactions", artistId],
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

  const { data: categories = [] } = useQuery({
    queryKey: ["finance-categories", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_categories")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

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

  const { data: initiatives = [] } = useQuery({
    queryKey: ["finance-initiatives", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("initiatives")
        .select("id, name")
        .eq("artist_id", artistId);
      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("finance_categories").insert({ artist_id: artistId, name } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-categories", artistId] });
      setNewCategoryName("");
      setShowNewCategory(false);
      toast.success("Category created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-categories", artistId] });
      qc.invalidateQueries({ queryKey: ["finance-transactions", artistId] });
    },
  });

  const addTransaction = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(itemAmount) || 0;
      const finalAmount = activeTab === "expense" ? -Math.abs(amt) : Math.abs(amt);

      let resolvedCategoryId: string | null = null;
      let resolvedBudgetId: string | null = null;
      let revCat: string | null = null;

      if (activeTab === "revenue") {
        // itemCategoryId is a revenue category value (e.g. "live", "royalty") or "none"
        revCat = itemCategoryId === "none" ? null : itemCategoryId;
      } else {
        // Expense: resolve finance_categories / budget
        resolvedCategoryId = itemCategoryId;
        if (itemCategoryId.startsWith("budget:")) {
          const budgetLabel = itemCategoryId.replace("budget:", "");
          const existing = categories.find((c: any) => c.name === budgetLabel);
          if (existing) {
            resolvedCategoryId = existing.id;
          } else {
            const { data: newCat, error: catErr } = await supabase
              .from("finance_categories")
              .insert({ artist_id: artistId, name: budgetLabel } as any)
              .select("id")
              .single();
            if (catErr) throw catErr;
            resolvedCategoryId = newCat.id;
          }
        }

        if (itemCategoryId.startsWith("budget:")) {
          const budgetLabel = itemCategoryId.replace("budget:", "");
          const matchedBudget = budgets.find((b: any) => b.label === budgetLabel);
          if (matchedBudget) resolvedBudgetId = matchedBudget.id;
        } else if (resolvedCategoryId !== "none" && resolvedCategoryId) {
          const cat = categories.find((c: any) => c.id === resolvedCategoryId);
          if (cat) {
            const matchedBudget = budgets.find((b: any) => b.label === cat.name);
            if (matchedBudget) resolvedBudgetId = matchedBudget.id;
          }
        }
      }

      const { error } = await supabase.from("transactions").insert({
        artist_id: artistId,
        amount: finalAmount,
        description: itemDesc.trim(),
        type: activeTab,
        status: itemStatus,
        category_id: (activeTab === "expense" && resolvedCategoryId && resolvedCategoryId !== "none") ? resolvedCategoryId : null,
        budget_id: resolvedBudgetId,
        initiative_id: itemInitiativeId === "none" ? null : itemInitiativeId,
        sub_budget_id: itemSubBudgetId === "none" ? null : itemSubBudgetId,
        transaction_date: itemDate,
        revenue_category: revCat,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-transactions", artistId] });
      qc.invalidateQueries({ queryKey: ["transactions", artistId] });
      qc.invalidateQueries({ queryKey: ["finance-categories", artistId] });
      qc.invalidateQueries({ queryKey: ["budgets", artistId] });
      qc.invalidateQueries({ queryKey: ["budget-expense-transactions", artistId] });
      qc.invalidateQueries({ queryKey: ["sub-budget-transactions", artistId] });
      qc.invalidateQueries({ queryKey: ["artists"] });
      qc.invalidateQueries({ queryKey: ["artists-summary"] });
      setItemAmount("");
      setItemDesc("");
      setItemDate(format(new Date(), "yyyy-MM-dd"));
      toast.success("Item added");
      setTimeout(() => amountInputRef.current?.focus(), 50);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const actualDeleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-transactions", artistId] });
      qc.invalidateQueries({ queryKey: ["transactions", artistId] });
      qc.invalidateQueries({ queryKey: ["budget-expense-transactions", artistId] });
    },
  });

  const handleSoftDelete = useCallback((id: string) => {
    if (pendingDelete) clearTimeout(pendingDelete.timer);
    const timer = setTimeout(() => {
      actualDeleteTransaction.mutate(id);
      setPendingDelete(null);
    }, 10000);
    setPendingDelete({ id, timer });
  }, [pendingDelete, actualDeleteTransaction]);

  const handleUndoDelete = useCallback(() => {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timer);
      setPendingDelete(null);
    }
  }, [pendingDelete]);

  const updateTransaction = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const amt = parseFloat(editAmount) || 0;
      const tx = transactions.find((t: any) => t.id === editingId);
      const isExpense = tx?.type === "expense";
      const isRevenue = tx?.type === "revenue";
      const finalAmount = isExpense ? -Math.abs(amt) : Math.abs(amt);

      let resolvedCategoryId: string | null = null;
      let resolvedBudgetId: string | null = null;
      let revCat: string | null = null;

      if (isRevenue) {
        revCat = editCategoryId === "none" ? null : editCategoryId;
      } else {
        resolvedCategoryId = editCategoryId;
        if (editCategoryId.startsWith("budget:")) {
          const budgetLabel = editCategoryId.replace("budget:", "");
          const existing = categories.find((c: any) => c.name === budgetLabel);
          if (existing) {
            resolvedCategoryId = existing.id;
          } else {
            const { data: newCat, error: catErr } = await supabase
              .from("finance_categories")
              .insert({ artist_id: artistId, name: budgetLabel } as any)
              .select("id")
              .single();
            if (catErr) throw catErr;
            resolvedCategoryId = newCat.id;
          }
        }

        if (editCategoryId.startsWith("budget:")) {
          const budgetLabel = editCategoryId.replace("budget:", "");
          const matchedBudget = budgets.find((b: any) => b.label === budgetLabel);
          if (matchedBudget) resolvedBudgetId = matchedBudget.id;
        } else if (resolvedCategoryId !== "none" && resolvedCategoryId) {
          const cat = categories.find((c: any) => c.id === resolvedCategoryId);
          if (cat) {
            const matchedBudget = budgets.find((b: any) => b.label === cat.name);
            if (matchedBudget) resolvedBudgetId = matchedBudget.id;
          }
        }
      }

      const { error } = await supabase.from("transactions").update({
        description: editDesc.trim(),
        amount: finalAmount,
        status: editStatus,
        category_id: isRevenue ? null : (resolvedCategoryId === "none" ? null : resolvedCategoryId),
        budget_id: resolvedBudgetId,
        transaction_date: editDate,
        ...(isRevenue ? { revenue_category: revCat } : {}),
      } as any).eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-transactions", artistId] });
      qc.invalidateQueries({ queryKey: ["transactions", artistId] });
      qc.invalidateQueries({ queryKey: ["finance-categories", artistId] });
      qc.invalidateQueries({ queryKey: ["budgets", artistId] });
      qc.invalidateQueries({ queryKey: ["budget-expense-transactions", artistId] });
      qc.invalidateQueries({ queryKey: ["sub-budget-transactions", artistId] });
      qc.invalidateQueries({ queryKey: ["artists"] });
      qc.invalidateQueries({ queryKey: ["artists-summary"] });
      setEditingId(null);
      toast.success("Transaction updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEditing = (t: any) => {
    setEditingId(t.id);
    setEditDesc(t.description || "");
    setEditAmount(String(Math.abs(Number(t.amount))));
    setEditStatus(t.status || "");
    // For revenue, use revenue_category; for expenses, use category_id
    setEditCategoryId(t.type === "revenue" ? (t.revenue_category || "none") : (t.category_id || "none"));
    setEditDate(t.transaction_date || "");
  };

  const cancelEditing = () => setEditingId(null);

  const resetItemForm = () => {
    setShowNewItem(false);
    setItemAmount("");
    setItemDesc("");
    setItemStatus("pending");
    setItemCategoryId("none");
    setItemSubBudgetId("none");
    setItemInitiativeId("none");
    setItemDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && itemDesc.trim() && itemAmount) {
      e.preventDefault();
      addTransaction.mutate();
    }
  };

  // Computed
  const visibleTransactions = pendingDelete
    ? transactions.filter((t: any) => t.id !== pendingDelete.id)
    : transactions;

  const filtered = visibleTransactions.filter((t: any) => t.type === activeTab);
  const totalExpenses = visibleTransactions
    .filter((t: any) => t.type === "expense")
    .reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
  const totalRevenue = visibleTransactions
    .filter((t: any) => t.type === "revenue")
    .reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
  const profit = totalRevenue - totalExpenses;

  const initiativeMap = useMemo(() => {
    const m: Record<string, string> = {};
    initiatives.forEach((i: any) => { m[i.id] = i.name; });
    return m;
  }, [initiatives]);

  const categoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c: any) => { m[c.id] = c.name; });
    return m;
  }, [categories]);

  const budgetOnlyLabels = useMemo(() => {
    const catNames = new Set(categories.map((c: any) => c.name));
    return budgets.filter((b: any) => !catNames.has(b.label));
  }, [budgets, categories]);

  const subBudgetMap = useMemo(() => {
    const m: Record<string, string> = {};
    subBudgets.forEach((sb: any) => { m[sb.id] = sb.label; });
    return m;
  }, [subBudgets]);

  // Get sub-budgets for the currently selected budget/category
  const availableSubBudgets = useMemo(() => {
    if (itemCategoryId === "none") return [];
    // Find the budget that matches the selected category
    let budgetId: string | null = null;
    if (itemCategoryId.startsWith("budget:")) {
      const label = itemCategoryId.replace("budget:", "");
      const b = budgets.find((b: any) => b.label === label);
      if (b) budgetId = b.id;
    } else {
      const cat = categories.find((c: any) => c.id === itemCategoryId);
      if (cat) {
        const b = budgets.find((b: any) => b.label === cat.name);
        if (b) budgetId = b.id;
      }
    }
    if (!budgetId) return [];
    return subBudgets.filter((sb: any) => sb.budget_id === budgetId);
  }, [itemCategoryId, subBudgets, budgets, categories]);

  const revCatLabelsMap = Object.fromEntries(REVENUE_CATEGORIES.map((c) => [c.value, c.label]));

  const grouped = useMemo(() => {
    const groups: { id: string; name: string; items: any[]; total: number }[] = [];

    if (activeTab === "revenue") {
      // Group revenue by revenue_category
      const byRevCat: Record<string, any[]> = {};
      const unsorted: any[] = [];
      filtered.forEach((t: any) => {
        const cat = t.revenue_category;
        if (cat) {
          if (!byRevCat[cat]) byRevCat[cat] = [];
          byRevCat[cat].push(t);
        } else {
          unsorted.push(t);
        }
      });
      if (unsorted.length > 0) {
        groups.push({
          id: "unsorted",
          name: "Uncategorized",
          items: unsorted,
          total: unsorted.reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0),
        });
      }
      REVENUE_CATEGORIES.forEach((rc) => {
        const items = byRevCat[rc.value] || [];
        if (items.length > 0) {
          groups.push({
            id: rc.value,
            name: rc.label,
            items,
            total: items.reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0),
          });
        }
      });
    } else {
      // Group expenses by category_id
      const byCat: Record<string, any[]> = {};
      const unsorted: any[] = [];
      filtered.forEach((t: any) => {
        if (t.category_id) {
          if (!byCat[t.category_id]) byCat[t.category_id] = [];
          byCat[t.category_id].push(t);
        } else {
          unsorted.push(t);
        }
      });
      if (unsorted.length > 0) {
        groups.push({
          id: "unsorted",
          name: "Unsorted",
          items: unsorted,
          total: unsorted.reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0),
        });
      }
      categories.forEach((c: any) => {
        const items = byCat[c.id] || [];
        groups.push({
          id: c.id,
          name: c.name,
          items,
          total: items.reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0),
        });
      });
    }

    return groups;
  }, [filtered, categories, activeTab]);

  const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const statusColor = (s: string) => {
    if (s === "received" || s === "paid") return "bg-emerald-50 text-emerald-700";
    if (s === "outstanding" || s === "pending") return "bg-amber-50 text-amber-700";
    if (s === "sent") return "bg-blue-50 text-blue-700";
    return "bg-muted text-muted-foreground";
  };

  const statuses = activeTab === "expense" ? EXPENSE_STATUSES : REVENUE_STATUSES;

  const renderCategorySelect = (value: string, onChange: (v: string) => void, className?: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-8 w-auto text-sm gap-1 border-border", className)}>
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Uncategorized</SelectItem>
        {activeTab === "revenue" ? (
          <SelectGroup>
            <SelectLabel className="text-xs uppercase tracking-wider">Revenue Categories</SelectLabel>
            {REVENUE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectGroup>
        ) : (
          <>
            {categories.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-xs uppercase tracking-wider">Categories</SelectLabel>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectGroup>
            )}
            {budgetOnlyLabels.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-xs uppercase tracking-wider">Budgets</SelectLabel>
                {budgetOnlyLabels.map((b: any) => (
                  <SelectItem key={`budget:${b.label}`} value={`budget:${b.label}`}>{b.label}</SelectItem>
                ))}
              </SelectGroup>
            )}
          </>
        )}
      </SelectContent>
    </Select>
  );

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Spending</div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-destructive/10 text-destructive text-xs font-bold">$</span>
            <span className="text-2xl font-bold">{totalExpenses.toLocaleString()}</span>
          </div>
        </div>
        <div className="border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Revenue</div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-emerald-500/10 text-emerald-600 text-xs font-bold">$</span>
            <span className="text-2xl font-bold">{totalRevenue.toLocaleString()}</span>
          </div>
        </div>
        <div className="border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Profit</div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-muted text-muted-foreground text-xs font-bold">$</span>
            <span className={cn("text-2xl font-bold", profit >= 0 ? "text-emerald-600" : "text-destructive")}>
              {Math.abs(profit).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Subtabs + actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab("expense")}
            className={cn("text-sm font-medium pb-1 border-b-2 transition-colors",
              activeTab === "expense" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab("revenue")}
            className={cn("text-sm font-medium pb-1 border-b-2 transition-colors",
              activeTab === "revenue" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Revenue
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowNewCategory(true)}>
            New Category
          </Button>
          <Button size="sm" className="gap-1" onClick={() => { setShowNewItem(true); setItemStatus(activeTab === "expense" ? "pending" : "outstanding"); }}>
            <Plus className="h-3.5 w-3.5" /> Add Item
          </Button>
        </div>
      </div>

      {/* New category form */}
      {showNewCategory && (
        <div className="border border-border rounded-lg p-4 mb-4 bg-muted/20 flex items-center gap-3">
          <Input
            placeholder="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-1 h-9"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && newCategoryName.trim()) addCategory.mutate(newCategoryName.trim()); }}
          />
          <Button variant="ghost" size="sm" onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}>Cancel</Button>
          <Button size="sm" className="gap-1" disabled={!newCategoryName.trim()} onClick={() => addCategory.mutate(newCategoryName.trim())}>
            <Check className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      )}

      {/* New item form */}
      {showNewItem && (
        <div className="border border-border rounded-lg p-4 mb-4 bg-muted/20 space-y-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-sm mt-0.5 shrink-0">$</span>
            <div className="flex-1 space-y-2">
              <CurrencyInput
                value={itemAmount}
                onChange={setItemAmount}
                onKeyDown={handleFormKeyDown}
                className="h-8 text-lg font-semibold"
                autoFocus
              />
              <Input
                placeholder="Enter Description"
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                onKeyDown={handleFormKeyDown}
                className="h-8 text-sm"
              />
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={itemStatus} onValueChange={setItemStatus}>
                  <SelectTrigger className="h-8 w-auto text-sm gap-1 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {renderCategorySelect(itemCategoryId, (v) => { setItemCategoryId(v); setItemSubBudgetId("none"); })}

                {availableSubBudgets.length > 0 && (
                  <Select value={itemSubBudgetId} onValueChange={setItemSubBudgetId}>
                    <SelectTrigger className="h-8 w-auto text-sm gap-1 border-border">
                      <SelectValue placeholder="Sub-budget" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Sub-budget</SelectItem>
                      {availableSubBudgets.map((sb: any) => (
                        <SelectItem key={sb.id} value={sb.id}>{sb.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {initiatives.length > 0 && (
                  <Select value={itemInitiativeId} onValueChange={setItemInitiativeId}>
                    <SelectTrigger className="h-8 w-auto text-sm gap-1 border-border">
                      <SelectValue placeholder="Campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Campaign</SelectItem>
                      {initiatives.map((i: any) => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Input
                  type="date"
                  value={itemDate}
                  onChange={(e) => setItemDate(e.target.value)}
                  className="h-8 w-auto text-sm border-border"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={resetItemForm}>Cancel</Button>
            <Button size="sm" disabled={!itemDesc.trim() || !itemAmount} onClick={() => addTransaction.mutate()}>
              Save & Continue
            </Button>
          </div>
        </div>
      )}

      {/* Grouped transactions */}
      <div className="space-y-4">
        {grouped.map((group) => {
          const isCollapsed = collapsed[group.id];
          const budget = budgets.find((b: any) => b.label === group.name);
          const budgetAmt = budget ? Number(budget.amount) : 0;
          const pct = budgetAmt > 0 ? Math.min((group.total / budgetAmt) * 100, 100) : 0;

          return (
            <div key={group.id} className="border border-border rounded-lg overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => setCollapsed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                className="flex items-center justify-between w-full px-4 py-3 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-sm font-medium">{group.name}</span>
                  <span className="text-xs text-muted-foreground">({group.items.length})</span>
                </div>
                <div className="flex items-center gap-3">
                  {budgetAmt > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                    </div>
                  )}
                  <span className="text-sm font-semibold">${group.total.toLocaleString()}</span>
                  {group.id !== "unsorted" && (
                    <button
                      className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteCategory.mutate(group.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </button>

              {/* Items */}
              {!isCollapsed && group.items.length > 0 && (
                <div className="border-t border-border divide-y divide-border">
                  {group.items.map((t: any) => {
                    const isEditing = editingId === t.id;
                    const editStatuses = t.type === "expense" ? EXPENSE_STATUSES : REVENUE_STATUSES;

                    if (isEditing) {
                      return (
                        <div key={t.id} className="px-4 py-3 bg-muted/30 space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="h-8 text-sm flex-1"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter") updateTransaction.mutate(); if (e.key === "Escape") cancelEditing(); }}
                            />
                            <CurrencyInput
                              value={editAmount}
                              onChange={setEditAmount}
                              className="h-8 text-sm w-28"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Select value={editStatus} onValueChange={setEditStatus}>
                              <SelectTrigger className="h-7 w-auto text-xs gap-1 border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {editStatuses.map((s) => (
                                  <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {renderCategorySelect(editCategoryId, setEditCategoryId, "h-7 text-xs")}

                            <Input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="h-7 w-auto text-xs border-border"
                            />

                            <div className="ml-auto flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={cancelEditing}>
                                <X className="h-3 w-3 mr-1" /> Cancel
                              </Button>
                              <Button size="sm" className="h-7 text-xs px-2" onClick={() => updateTransaction.mutate()} disabled={!editDesc.trim() || !editAmount}>
                                <Check className="h-3 w-3 mr-1" /> Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/20 transition-colors group/row">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{t.description || "Untitled"}</span>
                            <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0", statusColor(t.status))}>
                              {statusLabel(t.status)}
                            </span>
                            {t.initiative_id && initiativeMap[t.initiative_id] && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                                {initiativeMap[t.initiative_id]}
                              </span>
                            )}
                            {t.sub_budget_id && subBudgetMap[t.sub_budget_id] && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                                {subBudgetMap[t.sub_budget_id]}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {t.transaction_date ? format(parseLocalDate(t.transaction_date), "MMM d, yyyy") : ""}
                          </span>
                        </div>
                        <span className={cn("text-sm font-semibold tabular-nums", t.type === "revenue" ? "text-emerald-600" : "text-foreground")}>
                          {t.type === "revenue" ? "+" : "-"}${Math.abs(Number(t.amount)).toLocaleString()}
                        </span>
                        <button
                          className="p-1 opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          onClick={() => startEditing(t)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1 opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => handleSoftDelete(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && !showNewItem && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No {activeTab === "expense" ? "expenses" : "revenue"} yet.
          </p>
        )}
      </div>

      {/* Undo snackbar */}
      {pendingDelete && (
        <UndoSnackbar message="Item deleted" onUndo={handleUndoDelete} />
      )}

      <RollyNudge screen="finance" entityId={artistId} dataSnapshot={{ expenseCount: transactions.filter((t: any) => t.type === "expense").length }} />
    </div>
  );
}
