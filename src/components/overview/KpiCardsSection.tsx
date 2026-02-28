import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardsSectionProps {
  totalBudget: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  fmt: (n: number) => string;
  fmtSigned: (n: number) => string;
}

function KpiCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl p-4 hover:bg-accent/40 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-xl sm:text-2xl font-bold break-all", accent)}>{value}</div>
    </div>
  );
}

export function KpiCardsSection({ totalBudget, totalRevenue, totalExpenses, netProfit, fmt, fmtSigned }: KpiCardsSectionProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <KpiCard label="Total Budget" value={fmt(totalBudget)} icon={<DollarSign className="h-4 w-4" />} />
      <KpiCard label="Total Revenue" value={fmt(totalRevenue)} icon={<TrendingUp className="h-4 w-4" />} accent="text-emerald-600" />
      <KpiCard label="Total Spending" value={fmt(totalExpenses)} icon={<TrendingDown className="h-4 w-4" />} accent="text-destructive" />
      <KpiCard label="Net P&L" value={fmtSigned(netProfit)} icon={<DollarSign className="h-4 w-4" />} accent={netProfit >= 0 ? "text-emerald-600" : "text-destructive"} />
    </div>
  );
}
