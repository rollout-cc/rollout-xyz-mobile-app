import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DollarSign, Plus, ChevronDown, ChevronRight, MoreVertical, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FinanceTabProps {
  artistId: string;
  teamId: string;
}

type FinanceType = "expense" | "revenue";
type ExpenseStatus = "paid" | "sent" | "pending";
type RevenueStatus = "received" | "outstanding";

const EXPENSE_STATUSES: ExpenseStatus[] = ["paid", "sent", "pending"];
const REVENUE_STATUSES: RevenueStatus[] = ["received", "outstanding"];

export function FinanceTab({ artistId, teamId }: FinanceTabProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<FinanceType>("expense");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewItem, setShowNewItem] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // New item form state
  const [itemAmount, setItemAmount] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemStatus, setItemStatus] = useState<string>("pending");
  const [itemCategoryId, setItemCategoryId] = useState<string>("none");
  const [itemInitiativeId, setItemInitiativeId] = useState<string>("none");
  const [itemDate, setItemDate] = useState(format(new Date(), "yyyy-MM-dd"));

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
      const { error } = await supabase.from("transactions").insert({
        artist_id: artistId,
        amount: finalAmount,
        description: itemDesc.trim(),
        type: activeTab,
        status: itemStatus,
        category_id: itemCategoryId === "none" ? null : itemCategoryId,
        initiative_id: itemInitiativeId === "none" ? null : itemInitiativeId,
        transaction_date: itemDate,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-transactions", artistId] });
      resetItemForm();
      toast.success("Item added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-transactions", artistId] }),
  });

  const resetItemForm = () => {
    setShowNewItem(false);
    setItemAmount("");
    setItemDesc("");
    setItemStatus("pending");
    setItemCategoryId("none");
    setItemInitiativeId("none");
    setItemDate(format(new Date(), "yyyy-MM-dd"));
  };

  // Computed
  const filtered = transactions.filter((t: any) => t.type === activeTab);
  const totalExpenses = transactions
    .filter((t: any) => t.type === "expense")
    .reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
  const totalRevenue = transactions
    .filter((t: any) => t.type === "revenue")
    .reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
  const profit = totalRevenue - totalExpenses;

  // Group by category
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

  // Group filtered transactions by category
  const grouped = useMemo(() => {
    const groups: { id: string; name: string; items: any[]; total: number }[] = [];
    const unsorted: any[] = [];

    const byCat: Record<string, any[]> = {};
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
        total: unsorted.reduce((s, t) => s + Math.abs(Number(t.amount)), 0),
      });
    }

    categories.forEach((c: any) => {
      const items = byCat[c.id] || [];
      // Show category even if empty so user sees it
      groups.push({
        id: c.id,
        name: c.name,
        items,
        total: items.reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0),
      });
    });

    return groups;
  }, [filtered, categories]);

  const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const statusColor = (s: string) => {
    if (s === "received" || s === "paid") return "bg-emerald-50 text-emerald-700";
    if (s === "outstanding" || s === "pending") return "bg-amber-50 text-amber-700";
    if (s === "sent") return "bg-blue-50 text-blue-700";
    return "bg-muted text-muted-foreground";
  };

  const statuses = activeTab === "expense" ? EXPENSE_STATUSES : REVENUE_STATUSES;

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
              <Input
                placeholder="Enter Amount"
                value={itemAmount}
                onChange={(e) => setItemAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="h-8 text-lg font-semibold"
                autoFocus
              />
              <Input
                placeholder="Enter Description"
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                className="h-8 text-sm"
              />
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={itemStatus} onValueChange={setItemStatus}>
                  <SelectTrigger className="h-7 w-auto text-xs gap-1 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={itemInitiativeId} onValueChange={setItemInitiativeId}>
                  <SelectTrigger className="h-7 w-auto text-xs gap-1 border-border">
                    <SelectValue placeholder="Campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Campaign</SelectItem>
                    {initiatives.map((i: any) => (
                      <SelectItem key={i.id} value={i.id}># {i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={itemCategoryId} onValueChange={setItemCategoryId}>
                  <SelectTrigger className="h-7 w-auto text-xs gap-1 border-border">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount + category bottom row */}
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-border rounded-md px-2 h-8 gap-1">
                  <span className="text-xs text-muted-foreground">$</span>
                  <input
                    className="bg-transparent outline-none w-20 text-sm"
                    value={itemAmount}
                    onChange={(e) => setItemAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0"
                  />
                </div>
                <Input
                  type="date"
                  value={itemDate}
                  onChange={(e) => setItemDate(e.target.value)}
                  className="h-8 text-xs w-[140px]"
                />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={resetItemForm}>Discard</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={resetItemForm}>Cancel</Button>
            <Button size="sm" className="gap-1" disabled={!itemDesc.trim() || !itemAmount} onClick={() => addTransaction.mutate()}>
              <Check className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </div>
      )}

      {/* Categories with items */}
      <div className="border border-border rounded-lg overflow-hidden">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <DollarSign className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No {activeTab === "expense" ? "expenses" : "revenue"} yet</p>
          </div>
        ) : (
          grouped.map((group) => {
            const isOpen = !collapsed[group.id];
            return (
              <div key={group.id} className="border-b border-border last:border-b-0">
                {/* Category header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => setCollapsed((p) => ({ ...p, [group.id]: !p[group.id] }))}
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-bold">{group.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">${group.total.toLocaleString()}</span>
                  </div>
                  {group.id !== "unsorted" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteCategory.mutate(group.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Category
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Items */}
                {isOpen && (
                  <div>
                    {group.items.length === 0 ? (
                      <div className="px-6 py-4 text-sm text-muted-foreground">No items in this category.</div>
                    ) : (
                      group.items.map((t: any) => (
                        <TransactionItem
                          key={t.id}
                          transaction={t}
                          categoryMap={categoryMap}
                          initiativeMap={initiativeMap}
                          onDelete={() => deleteTransaction.mutate(t.id)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TransactionItem({
  transaction: t,
  categoryMap,
  initiativeMap,
  onDelete,
}: {
  transaction: any;
  categoryMap: Record<string, string>;
  initiativeMap: Record<string, string>;
  onDelete: () => void;
}) {
  const amount = Math.abs(Number(t.amount));
  const catName = t.category_id ? categoryMap[t.category_id] : null;
  const campName = t.initiative_id ? initiativeMap[t.initiative_id] : null;

  const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const statusColor = (s: string) => {
    if (s === "received" || s === "paid") return "bg-emerald-50 text-emerald-700";
    if (s === "outstanding" || s === "pending") return "bg-amber-50 text-amber-700";
    if (s === "sent") return "bg-blue-50 text-blue-700";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="flex items-start gap-3 px-6 py-4 group hover:bg-muted/20 transition-colors border-b border-border last:border-b-0">
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs mt-0.5 shrink-0">$</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">${amount.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground">{t.description}</div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {t.status && (
            <span className={cn("text-[11px] px-2 py-0.5 rounded", statusColor(t.status))}>
              {statusLabel(t.status)}
            </span>
          )}
          {campName && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
              # {campName}
            </span>
          )}
          {catName && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {catName}
            </span>
          )}
          {t.transaction_date && (
            <span className="text-[11px] text-muted-foreground">
              {format(new Date(t.transaction_date), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
