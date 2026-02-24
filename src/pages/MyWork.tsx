import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Calendar, DollarSign, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useCallback } from "react";

export default function MyWork() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-work", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, artists(id, name), initiatives(name)")
        .eq("assigned_to", user!.id)
        .eq("is_completed", false)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const toggleComplete = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-work"] }),
  });

  // Group tasks by urgency
  const overdue = tasks.filter((t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const today = tasks.filter((t) => t.due_date && isToday(new Date(t.due_date)));
  const tomorrow = tasks.filter((t) => t.due_date && isTomorrow(new Date(t.due_date)));
  const upcoming = tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return !isPast(d) && !isToday(d) && !isTomorrow(d);
  });
  const noDue = tasks.filter((t) => !t.due_date);

  const sections = [
    { label: "Overdue", items: overdue, icon: AlertCircle, color: "text-destructive" },
    { label: "Today", items: today, icon: Clock, color: "text-primary" },
    { label: "Tomorrow", items: tomorrow, icon: Calendar, color: "text-foreground" },
    { label: "Upcoming", items: upcoming, icon: Calendar, color: "text-muted-foreground" },
    { label: "No Due Date", items: noDue, icon: Calendar, color: "text-muted-foreground" },
  ].filter((s) => s.items.length > 0);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-work"] });
  }, [queryClient]);

  return (
    <AppLayout title="My Work">
      <PullToRefresh onRefresh={handleRefresh}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground gap-2">
          <p className="text-lg font-medium">You're all caught up!</p>
          <p className="text-sm">No tasks assigned to you right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-20">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Overdue" count={overdue.length} variant="destructive" />
            <SummaryCard label="Today" count={today.length} variant="primary" />
            <SummaryCard label="Tomorrow" count={tomorrow.length} variant="default" />
            <SummaryCard label="Total" count={tasks.length} variant="muted" />
          </div>

          {/* Task sections */}
          {sections.map(({ label, items, icon: Icon, color }) => (
            <div key={label}>
              <h3 className={cn("text-sm font-semibold mb-2 flex items-center gap-1.5", color)}>
                <Icon className="h-4 w-4" />
                {label}
                <span className="text-muted-foreground font-normal">({items.length})</span>
              </h3>
              <div className="flex flex-col gap-1">
                {items.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => toggleComplete.mutate(task.id)}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.artists && (
                          <button
                            onClick={() => navigate(`/roster/${task.artists.id}`)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {task.artists.name}
                          </button>
                        )}
                        {task.initiatives && (
                          <span className="text-xs text-muted-foreground">· {task.initiatives.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.expense_amount != null && task.expense_amount > 0 && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <DollarSign className="h-3 w-3" />
                          {task.expense_amount.toLocaleString()}
                        </Badge>
                      )}
                      {task.due_date && (
                        <Badge
                          variant={isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) ? "destructive" : "outline"}
                          className="gap-1 text-xs"
                        >
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.due_date), "MMM d")}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      </PullToRefresh>
    </AppLayout>
  );
}

function SummaryCard({ label, count, variant }: { label: string; count: number; variant: string }) {
  return (
    <div className={cn(
      "rounded-lg border p-3 text-center",
      variant === "destructive" && count > 0 && "border-destructive/50 bg-destructive/10",
      variant === "primary" && "border-primary/50 bg-primary/10",
      variant === "default" && "border-border",
      variant === "muted" && "border-border bg-muted/50",
    )}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
