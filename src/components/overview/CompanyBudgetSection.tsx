import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_CATEGORIES = [
  "Travel & Entertainment",
  "Software & Tools",
  "Legal & Accounting",
  "Office & Rent",
  "Marketing",
  "Staff Payroll",
];

interface CompanyBudgetSectionProps {
  readOnly?: boolean;
}

export function CompanyBudgetSection({ readOnly = false }: CompanyBudgetSectionProps) {
  const { selectedTeamId: teamId } = useSelectedTeam();
  const queryClient = useQueryClient();
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  // Fetch team for annual_budget
  const { data: team } = useQuery({
    queryKey: ["team-budget", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, annual_budget")
        .eq("id", teamId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // Fetch company budget categories
  const { data: categories = [] } = useQuery({
    queryKey: ["company-budget-categories", teamId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("company_budget_categories")
        .select("*")
        .eq("team_id", teamId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // Fetch company expenses
  const { data: companyExpenses = [] } = useQuery({
    queryKey: ["company-expenses", teamId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("company_expenses")
        .select("*")
        .eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // Fetch artist budgets for allocation view
  const { data: artistBudgets = [] } = useQuery({
    queryKey: ["all-artist-budgets", teamId],
    queryFn: async () => {
      const { data: artists, error: aErr } = await supabase
        .from("artists")
        .select("id, name")
        .eq("team_id", teamId!);
      if (aErr) throw aErr;
      if (!artists?.length) return [];
      const { data: budgets, error: bErr } = await supabase
        .from("budgets")
        .select("*")
        .in("artist_id", artists.map((a) => a.id));
      if (bErr) throw bErr;
      return artists.map((a) => ({
        ...a,
        totalBudget: (budgets || []).filter((b: any) => b.artist_id === a.id).reduce((s: number, b: any) => s + Number(b.amount), 0),
      }));
    },
    enabled: !!teamId,
  });

  // Fetch staff employment for payroll
  const { data: staffEmployment = [] } = useQuery({
    queryKey: ["staff-employment-all", teamId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("staff_employment")
        .select("*")
        .eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // Mutations
  const updateAnnualBudget = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase
        .from("teams")
        .update({ annual_budget: amount })
        .eq("id", teamId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-budget"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await (supabase as any)
        .from("company_budget_categories")
        .insert({ team_id: teamId, name: name.trim(), annual_budget: 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-budget-categories"] });
      toast.success("Category added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCategoryBudget = useMutation({
    mutationFn: async ({ id, annual_budget }: { id: string; annual_budget: number }) => {
      const { error } = await (supabase as any)
        .from("company_budget_categories")
        .update({ annual_budget })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-budget-categories"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("company_budget_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-budget-categories"] });
      toast.success("Category removed");
    },
  });

  // Calculations
  const annualBudget = Number(team?.annual_budget || 0);
  const totalArtistAllocated = artistBudgets.reduce((s: number, a: any) => s + a.totalBudget, 0);
  const totalPayroll = staffEmployment.reduce((s: number, e: any) => {
    if (e.employment_type === "w2") return s + Number(e.annual_salary || 0);
    return s + (Number(e.monthly_retainer || 0) * 12);
  }, 0);
  const totalCategorySpend = categories.reduce((s: number, c: any) => s + Number(c.annual_budget || 0), 0);
  const remaining = annualBudget - totalArtistAllocated - totalPayroll - totalCategorySpend;

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString()}`;
  const abbr = (n: number) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${sign}$${abs.toLocaleString()}`;
  };

  // Categories available to add (not yet added)
  const existingNames = new Set(categories.map((c: any) => c.name));
  const availableCategories = DEFAULT_CATEGORIES.filter((name) => !existingNames.has(name));

  const handleAddCategory = (name: string) => {
    addCategory.mutate(name);
  };

  const handleBudgetSave = () => {
    const val = parseFloat(budgetInput.replace(/,/g, "")) || 0;
    updateAnnualBudget.mutate(val);
    setEditingBudget(false);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Annual Budget</p>
          {!readOnly && editingBudget ? (
            <CurrencyInput
              value={budgetInput}
              onChange={setBudgetInput}
              onBlur={handleBudgetSave}
              onKeyDown={(e) => { if (e.key === "Enter") handleBudgetSave(); }}
              className="h-8 text-lg font-bold mt-1 border-none p-0"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { if (!readOnly) { setBudgetInput(annualBudget.toString()); setEditingBudget(true); } }}
              className={cn("text-lg font-bold mt-1 text-left w-full", !readOnly && "hover:text-primary transition-colors")}
              disabled={readOnly}
            >
              <span className="sm:hidden">{abbr(annualBudget)}</span>
              <span className="hidden sm:inline">{fmt(annualBudget)}</span>
            </button>
          )}
        </div>
        <SummaryCard label="Artist Allocation" value={fmt(totalArtistAllocated)} mobileValue={abbr(totalArtistAllocated)} />
        <SummaryCard label="Staff Payroll" value={fmt(totalPayroll)} mobileValue={abbr(totalPayroll)} />
        <SummaryCard
          label="Remaining"
          value={`${remaining < 0 ? "-" : ""}${fmt(remaining)}`}
          mobileValue={abbr(remaining)}
          accent={remaining < 0 ? "text-destructive" : "text-emerald-600"}
        />
      </div>

      {/* Budget Categories */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold">Budget Categories</h3>
          {!readOnly && availableCategories.length > 0 && (
            <Select onValueChange={handleAddCategory}>
              <SelectTrigger className="w-[180px] h-7 text-xs">
                <SelectValue placeholder="Add category…" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat: any) => {
              const spent = companyExpenses
                .filter((e: any) => e.category_id === cat.id)
                .reduce((s: number, e: any) => s + Number(e.amount), 0);
              const budget = Number(cat.annual_budget || 0);
              const pct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;

              return (
                  <CategoryCard
                    key={cat.id}
                    name={cat.name}
                    budget={budget}
                    spent={spent}
                    pct={pct}
                    onBudgetChange={readOnly ? undefined : (val) => updateCategoryBudget.mutate({ id: cat.id, annual_budget: val })}
                    onDelete={readOnly ? undefined : () => deleteCategory.mutate(cat.id)}
                    fmt={fmt}
                    readOnly={readOnly}
                  />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No categories yet — add one from the dropdown above.</p>
        )}
      </div>

      {/* Artist Allocations */}
      {artistBudgets.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-3">Artist Budget Allocations</h3>
          <div className="space-y-1">
            {artistBudgets.map((a: any) => {
              const pct = annualBudget > 0 ? Math.round((a.totalBudget / annualBudget) * 100) : 0;
              return (
                <div key={a.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-accent/30 transition-colors">
                  <span className="text-sm font-medium flex-1 truncate">{a.name}</span>
                  <span className="text-sm font-semibold">{fmt(a.totalBudget)}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, mobileValue, accent }: { label: string; value: string; mobileValue?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold mt-1", accent)}>
        {mobileValue ? (
          <>
            <span className="sm:hidden">{mobileValue}</span>
            <span className="hidden sm:inline">{value}</span>
          </>
        ) : value}
      </p>
    </div>
  );
}

function CategoryCard({
  name, budget, spent, pct, onBudgetChange, onDelete, fmt, readOnly,
}: {
  name: string; budget: number; spent: number; pct: number;
  onBudgetChange?: (val: number) => void; onDelete?: () => void; fmt: (n: number) => string;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [budgetVal, setBudgetVal] = useState(budget.toString());

  return (
    <div className="rounded-xl border border-border p-4 group relative">
      {!readOnly && onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <p className="text-sm font-medium mb-2">{name}</p>
      {!readOnly && editing ? (
        <div className="mb-2">
          <CurrencyInput
            value={budgetVal}
            onChange={setBudgetVal}
            onBlur={() => {
              onBudgetChange?.(parseFloat(budgetVal.replace(/,/g, "")) || 0);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onBudgetChange?.(parseFloat(budgetVal.replace(/,/g, "")) || 0);
                setEditing(false);
              }
            }}
            className="h-7 text-xs"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => { if (!readOnly) { setBudgetVal(budget.toString()); setEditing(true); } }}
          className={cn("text-lg font-bold", !readOnly && "hover:text-primary transition-colors")}
          disabled={readOnly}
        >
          {fmt(budget)}
        </button>
      )}
      <div className="mt-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Spent: {fmt(spent)}</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <Progress
          value={pct}
          className={cn(
            "h-1.5",
            pct >= 90 ? "[&>div]:bg-destructive" : pct >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
          )}
        />
      </div>
    </div>
  );
}
