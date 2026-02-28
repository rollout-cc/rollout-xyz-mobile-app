import { cn } from "@/lib/utils";

interface QuarterlyData {
  label: string;
  revenue: number;
  expenses: number;
  gp: number;
  deptExpenses: Record<string, number>;
}

interface QuarterlyPnlSectionProps {
  quarterlyData: QuarterlyData[];
  departments: string[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  fmt: (n: number) => string;
  fmtSigned: (n: number) => string;
}

export function QuarterlyPnlSection({ quarterlyData, departments, totalRevenue, totalExpenses, netProfit, fmt, fmtSigned }: QuarterlyPnlSectionProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium" />
            {quarterlyData.map((q) => (
              <th key={q.label} className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">{q.label}</th>
            ))}
            <th className="text-right py-2 pl-3 text-xs text-muted-foreground font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-2.5 pr-4 font-medium">Revenue</td>
            {quarterlyData.map((q) => (
              <td key={q.label} className="text-right py-2.5 px-3 text-emerald-600 font-medium">{q.revenue > 0 ? fmt(q.revenue) : "—"}</td>
            ))}
            <td className="text-right py-2.5 pl-3 font-bold text-emerald-600">{fmt(totalRevenue)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2.5 pr-4 font-medium">Expenses</td>
            {quarterlyData.map((q) => (
              <td key={q.label} className="text-right py-2.5 px-3 text-destructive font-medium">{q.expenses > 0 ? fmt(q.expenses) : "—"}</td>
            ))}
            <td className="text-right py-2.5 pl-3 font-bold text-destructive">{fmt(totalExpenses)}</td>
          </tr>
          {[...departments, ...(quarterlyData.some(q => q.deptExpenses["Other"] > 0) ? ["Other"] : [])].filter((v, i, a) => a.indexOf(v) === i).map((dept) => {
            const deptTotal = quarterlyData.reduce((s, q) => s + (q.deptExpenses[dept] || 0), 0);
            if (deptTotal === 0) return null;
            return (
              <tr key={dept} className="border-b border-border">
                <td className="py-2 pr-4 text-muted-foreground text-xs pl-4">{dept}</td>
                {quarterlyData.map((q) => (
                  <td key={q.label} className="text-right py-2 px-3 text-xs text-muted-foreground">{(q.deptExpenses[dept] || 0) > 0 ? fmt(q.deptExpenses[dept]) : "—"}</td>
                ))}
                <td className="text-right py-2 pl-3 text-xs font-medium text-muted-foreground">{fmt(deptTotal)}</td>
              </tr>
            );
          })}
          <tr>
            <td className="py-2.5 pr-4 font-semibold">Gross Profit</td>
            {quarterlyData.map((q) => (
              <td key={q.label} className={cn("text-right py-2.5 px-3 font-bold", q.gp >= 0 ? "text-emerald-600" : "text-destructive")}>
                {q.revenue > 0 || q.expenses > 0 ? fmtSigned(q.gp) : "—"}
              </td>
            ))}
            <td className={cn("text-right py-2.5 pl-3 font-bold", netProfit >= 0 ? "text-emerald-600" : "text-destructive")}>{fmtSigned(netProfit)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
