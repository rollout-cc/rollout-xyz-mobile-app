import { useState, useEffect } from "react";
import { formatLocalDate } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DatePicker } from "@/components/ui/ItemPickers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobTitleSelect } from "@/components/ui/JobTitleSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useTeamRegion } from "@/hooks/useTeamRegion";
import { calculateEmployerCost, getCurrencySymbol, type RegionCode, REGIONS } from "@/lib/regionConfig";
import { US_STATES, getStateSUTA } from "@/lib/employerTaxes";

interface StaffEmploymentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  teamId: string;
  staffName: string;
}

export function StaffEmploymentDrawer({ open, onOpenChange, userId, teamId, staffName }: StaffEmploymentDrawerProps) {
  const queryClient = useQueryClient();
  const { region, currencyCode } = useTeamRegion();
  const sym = getCurrencySymbol(currencyCode);

  const { data: employment, isLoading } = useQuery({
    queryKey: ["staff-employment", userId, teamId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("staff_employment")
        .select("*")
        .eq("user_id", userId)
        .eq("team_id", teamId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!userId && !!teamId,
  });

  const [form, setForm] = useState({
    employment_type: "employee",
    job_title: "",
    annual_salary: "",
    monthly_retainer: "",
    payment_schedule: "bi-weekly",
    start_date: "",
    employee_state: "",
  });

  useEffect(() => {
    if (employment) {
      setForm({
        employment_type: employment.employment_type || "employee",
        job_title: employment.job_title || "",
        annual_salary: employment.annual_salary?.toString() || "",
        monthly_retainer: employment.monthly_retainer?.toString() || "",
        payment_schedule: employment.payment_schedule || "bi-weekly",
        start_date: employment.start_date || "",
        employee_state: employment.employee_state || "",
      });
    } else {
      setForm({
        employment_type: "employee",
        job_title: "",
        annual_salary: "",
        monthly_retainer: "",
        payment_schedule: "bi-weekly",
        start_date: "",
        employee_state: "",
      });
    }
  }, [employment]);

  const upsert = useMutation({
    mutationFn: async () => {
      const payload: any = {
        user_id: userId,
        team_id: teamId,
        employment_type: form.employment_type,
        job_title: form.job_title || null,
        annual_salary: form.annual_salary ? parseFloat(form.annual_salary) : null,
        monthly_retainer: form.monthly_retainer ? parseFloat(form.monthly_retainer) : null,
        payment_schedule: form.payment_schedule,
        start_date: form.start_date || null,
        employee_state: form.employee_state || null,
        updated_at: new Date().toISOString(),
      };

      if (employment) {
        const { error } = await (supabase as any)
          .from("staff_employment")
          .update(payload)
          .eq("id", employment.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("staff_employment")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-employment"] });
      toast.success("Employment info saved");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isEmployee = form.employment_type === "employee" || form.employment_type === "w2";
  const baseSalary = isEmployee
    ? (parseFloat(form.annual_salary) || 0)
    : (parseFloat(form.monthly_retainer) || 0) * 12;

  // Use region-aware calculation
  const isUS = region.code === "us";
  let costResult: ReturnType<typeof calculateEmployerCost>;

  if (isUS && isEmployee) {
    // US-specific: use detailed FICA/FUTA/SUTA
    const ssTax = Math.min(baseSalary, 168600) * 0.062;
    const medicareTax = baseSalary * 0.0145;
    const futaTax = Math.min(baseSalary, 7000) * 0.006;
    const sutaRate = getStateSUTA(form.employee_state);
    const sutaTax = Math.min(baseSalary, 7000) * sutaRate;
    const fringeAmount = baseSalary * 0.25;
    const breakdown = [
      { label: "FICA (SS + Medicare)", amount: ssTax + medicareTax, pct: (ssTax + medicareTax) / (baseSalary || 1) },
      { label: "FUTA", amount: futaTax, pct: 0.006 },
      { label: `SUTA${form.employee_state ? ` (${form.employee_state})` : ""}`, amount: sutaTax, pct: sutaRate },
    ];
    costResult = {
      breakdown,
      fringeAmount,
      total: baseSalary + ssTax + medicareTax + futaTax + sutaTax + fringeAmount,
    };
  } else {
    costResult = calculateEmployerCost(baseSalary, region.code, isEmployee);
  }

  const fmt = (n: number) => `${sym}${Math.round(n).toLocaleString()}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{staffName}</SheetTitle>
          <p className="text-sm text-muted-foreground">Employment Information</p>
        </SheetHeader>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-5">
            {/* Employment Type - region-aware labels */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Employment Type</Label>
              <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">{region.employeeLabel}</SelectItem>
                  <SelectItem value="contractor">{region.contractorLabel}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Job Title</Label>
              <JobTitleSelect
                value={form.job_title}
                onChange={(v) => setForm({ ...form, job_title: v })}
              />
            </div>

            {/* State - only show for US */}
            {isUS && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">State</Label>
                <Select value={form.employee_state} onValueChange={(v) => setForm({ ...form, employee_state: v })}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {US_STATES.map((s) => (
                      <SelectItem key={s.abbr} value={s.abbr}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pay Rate */}
            {isEmployee ? (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Annual Salary</Label>
                <CurrencyInput
                  value={form.annual_salary}
                  onChange={(v) => setForm({ ...form, annual_salary: v })}
                  placeholder="75,000"
                  currencySymbol={sym}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Monthly Retainer</Label>
                <CurrencyInput
                  value={form.monthly_retainer}
                  onChange={(v) => setForm({ ...form, monthly_retainer: v })}
                  placeholder="5,000"
                  currencySymbol={sym}
                />
                {baseSalary > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Annual cost: {fmt(baseSalary)}
                  </p>
                )}
              </div>
            )}

            {/* Payment Schedule */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Payment Schedule</Label>
              <Select value={form.payment_schedule} onValueChange={(v) => setForm({ ...form, payment_schedule: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="semi-monthly">Semi-monthly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Start Date</Label>
              <DatePicker
                value={form.start_date ? new Date(form.start_date + "T00:00:00") : undefined}
                onChange={(d) => setForm({ ...form, start_date: d ? formatLocalDate(d) : "" })}
                placeholder="Select start date"
              />
            </div>

            {/* Cost Summary */}
            {baseSalary > 0 && (
              <CostSummary
                baseSalary={baseSalary}
                isEmployee={isEmployee}
                costResult={costResult}
                regionLabel={region.label}
                fringePct={region.fringePct}
                hasFringe={region.hasFringeBenefits}
                fmt={fmt}
              />
            )}

            <Button onClick={() => upsert.mutate()} className="w-full" disabled={upsert.isPending}>
              {employment ? "Update" : "Save"} Employment Info
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Cost Summary sub-component ───

function CostSummary({
  baseSalary,
  isEmployee,
  costResult,
  regionLabel,
  fringePct,
  hasFringe,
  fmt,
}: {
  baseSalary: number;
  isEmployee: boolean;
  costResult: { breakdown: { label: string; amount: number; pct: number }[]; fringeAmount: number; total: number };
  regionLabel: string;
  fringePct: number;
  hasFringe: boolean;
  fmt: (n: number) => string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">
        Annual Cost Summary {regionLabel !== "United States" && <span className="ml-1">({regionLabel})</span>}
      </p>

      <div className="space-y-1.5">
        <CostLine label="Base Salary" value={fmt(baseSalary)} />

        {isEmployee && costResult.breakdown.length > 0 && (
          <>
            <Separator className="my-2" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Employer Taxes & Contributions</p>
            {costResult.breakdown.map((item) => (
              <CostLine
                key={item.label}
                label={item.label}
                value={fmt(item.amount)}
                sub={`${(item.pct * 100).toFixed(1)}%`}
              />
            ))}

            {(hasFringe || fringePct > 0) && (
              <>
                <Separator className="my-2" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {hasFringe ? "Fringe Benefits (est.)" : "Additional Costs (est.)"}
                </p>
                <CostLine
                  label={hasFringe ? "Health, retirement, PTO, etc." : "Supplementary costs"}
                  value={fmt(costResult.fringeAmount)}
                  sub={`~${(fringePct * 100).toFixed(0)}% of salary`}
                />
              </>
            )}
          </>
        )}
      </div>

      <Separator />
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Total Employer Cost</p>
        <p className="text-lg font-bold">{fmt(costResult.total)}/yr</p>
      </div>
      <p className="text-xs text-muted-foreground">
        ~{fmt(Math.round(costResult.total / 12))}/mo
      </p>
    </div>
  );
}

function CostLine({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
      <p className="text-xs font-semibold shrink-0">{value}</p>
    </div>
  );
}
