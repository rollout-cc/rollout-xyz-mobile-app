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
  const totalPayroll = Math.round(staffEmployment.reduce((s: number, e: any) => {
    if (e.employment_type === "w2") return s + Number(e.annual_salary || 0);
    return s + (Number(e.monthly_retainer || 0) * 12);
  }, 0) * 100) / 100;
  // Exclude "Staff Payroll" category from totalCategorySpend to avoid double-counting with actual payroll
  const staffPayrollCatName = "Staff Payroll";
  const totalCategorySpend = categories
    .filter((c: any) => c.name !== staffPayrollCatName)
    .reduce((s: number, c: any) => s + Number(c.annual_budget || 0), 0);
  const remaining = annualBudget - totalArtistAllocated - totalPayroll - totalCategorySpend;

  const fmt = (n: number) => `$${Math.abs(Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const abbr = (n: number) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
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
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <div className="min-w-0 rounded-xl border border-border p-3 sm:p-3.5">
          <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">Annual Budget</p>
          {!readOnly && editingBudget ? (
            <CurrencyInput
              value={budgetInput}
              onChange={setBudgetInput}
              onBlur={handleBudgetSave}
              onKeyDown={(e) => { if (e.key === "Enter") handleBudgetSave(); }}
              className="mt-1 h-8 border-none p-0 text-base font-bold sm:text-lg"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { if (!readOnly) { setBudgetInput(annualBudget.toString()); setEditingBudget(true); } }}
              className={cn("mt-1 w-full text-left text-base font-bold sm:text-lg", !readOnly && "hover:text-primary transition-colors")}
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
        <div className="mb-2 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <h3 className="text-sm font-semibold tracking-tight sm:text-xs">Budget Categories</h3>
          {!readOnly && availableCategories.length > 0 && (
            <Select onValueChange={handleAddCategory}>
              <SelectTrigger className="h-9 w-full text-sm sm:h-7 sm:w-[180px] sm:text-xs">
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
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {categories.map((cat: any) => {
              const isStaffPayrollCat = cat.name === staffPayrollCatName;
              // For Staff Payroll category, use actual payroll data; for others, match by category_id OR by category name in description
              const spent = isStaffPayrollCat
                ? totalPayroll
                : companyExpenses
                    .filter((e: any) => e.category_id === cat.id || (!e.category_id && e.description && e.description.toLowerCase().includes(cat.name.toLowerCase())))
                    .reduce((s: number, e: any) => s + Number(e.amount), 0);
              const budget = isStaffPayrollCat ? totalPayroll : Number(cat.annual_budget || 0);
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
          <h3 className="mb-2 text-sm font-semibold tracking-tight sm:mb-3 sm:text-xs">Artist Budget Allocations</h3>
          <div className="space-y-0.5 sm:space-y-1">
            {artistBudgets.map((a: any) => {
              const pct = annualBudget > 0 ? Math.round((a.totalBudget / annualBudget) * 100) : 0;
              return (
                <div key={a.id} className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/30 sm:min-h-0 sm:gap-3 sm:px-3 sm:py-2">
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
    <div className="min-w-0 rounded-xl border border-border p-3 sm:p-3.5">
      <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">{label}</p>
      <p className={cn("mt-1 text-base font-bold sm:text-lg", accent)}>
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
    <div className="group relative rounded-xl border border-border p-3 sm:p-4">
      {!readOnly && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground opacity-100 transition-opacity hover:text-destructive sm:right-2 sm:top-2 sm:h-auto sm:w-auto sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`Remove ${name}`}
        >
          <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </button>
      )}
      <p className="mb-1.5 pr-10 text-sm font-medium leading-snug sm:mb-2 sm:pr-8">{name}</p>
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
          type="button"
          onClick={() => { if (!readOnly) { setBudgetVal(budget.toString()); setEditing(true); } }}
          className={cn("text-left text-base font-bold sm:text-lg", !readOnly && "hover:text-primary transition-colors")}
          disabled={readOnly}
        >
          {fmt(budget)}
        </button>
      )}
      <div className="mt-2.5 sm:mt-2">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
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
