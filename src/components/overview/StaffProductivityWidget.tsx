import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import type { StaffMember } from "@/components/overview/StaffMetricsSection";

interface StaffProductivityWidgetProps {
  members: StaffMember[];
  fmt: (n: number) => string;
}

function ScoreBadge({ score }: { score: number }) {
  const bg =
    score >= 80
      ? "bg-emerald-500/15 text-emerald-500"
      : score >= 50
        ? "bg-amber-500/15 text-amber-500"
        : "bg-destructive/15 text-destructive";

  return (
    <span className={cn("inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums", bg)}>
      {score}
    </span>
  );
}

export function StaffProductivityWidget({ members, fmt }: StaffProductivityWidgetProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No team members found.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {members.map((m) => (
        <div
          key={m.userId}
          className="flex items-center gap-3 py-3 border-b border-border last:border-b-0"
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={m.avatarUrl ?? undefined} />
            <AvatarFallback className="text-sm font-bold">
              {m.fullName?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm text-foreground truncate block">{m.fullName || "Unnamed"}</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="capitalize">{m.role.replace("_", " ")}</span>
              {m.revenueLogged > 0 && (
                <span className="text-emerald-500 font-medium">{fmt(m.revenueLogged)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              {m.tasksCompleted}/{m.tasksAssigned}
            </span>
            <ScoreBadge score={m.productivityScore} />
          </div>
        </div>
      ))}
    </div>
  );
}
