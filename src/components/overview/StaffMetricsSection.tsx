import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle2, ListTodo, DollarSign } from "lucide-react";

export interface StaffMember {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOnTime: number;
  revenueLogged: number;
  productivityScore: number;
}

interface StaffMetricsSectionProps {
  members: StaffMember[];
  fmt: (n: number) => string;
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-destructive";

  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={radius} fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-500", color.replace("text-", "stroke-"))}
        />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold", color)}>
        {score}
      </span>
    </div>
  );
}

export function StaffMetricsSection({ members, fmt }: StaffMetricsSectionProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No team members found.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="caption-bold">{members.length} members</span>
      </div>

      <div className="space-y-0">
        {members.map((m) => {
          const completionRate =
            m.tasksAssigned > 0 ? Math.round((m.tasksCompleted / m.tasksAssigned) * 100) : 0;

          return (
            <div
              key={m.userId}
              className="border-b border-border last:border-b-0 py-4 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ScoreCircle score={m.productivityScore} />

                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={m.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-sm font-bold">
                    {m.fullName?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{m.fullName || "Unnamed"}</span>
                    <span className="caption capitalize">{m.role.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <ListTodo className="h-3 w-3" /> {m.tasksAssigned} assigned
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {m.tasksCompleted} done
                    </span>
                    {m.revenueLogged > 0 && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-emerald-500" /> {fmt(m.revenueLogged)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Completion bar */}
              <div className="ml-[88px] mt-2">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-muted-foreground">Task Completion</span>
                  <span className="font-semibold">{completionRate}%</span>
                </div>
                <Progress
                  value={completionRate}
                  className={cn(
                    "h-1.5 [&>div]:transition-all",
                    completionRate >= 80
                      ? "[&>div]:bg-emerald-500"
                      : completionRate >= 50
                        ? "[&>div]:bg-amber-500"
                        : "[&>div]:bg-destructive"
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
