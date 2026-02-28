import { AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface BudgetUtilizationSectionProps {
  totalExpenses: number;
  budgetRemaining: number;
  budgetUtilization: number;
  openTasks: number;
  overdueTasks: number;
  fmt: (n: number) => string;
}

export function BudgetUtilizationSection({ totalExpenses, budgetRemaining, budgetUtilization, openTasks, overdueTasks, fmt }: BudgetUtilizationSectionProps) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-1">
        <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground flex-wrap">
          <span>Spent: {fmt(totalExpenses)}</span>
          <span>Remaining: {fmt(budgetRemaining)}</span>
          <span className="font-bold text-foreground">{budgetUtilization.toFixed(0)}%</span>
        </div>
      </div>
      <Progress
        value={budgetUtilization}
        className={cn("h-3 [&>div]:transition-all", budgetUtilization > 90 ? "[&>div]:bg-destructive" : budgetUtilization > 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")}
      />
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{openTasks} open tasks</span>
        {overdueTasks > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-3 w-3" /> {overdueTasks} overdue
          </span>
        )}
      </div>
    </div>
  );
}
